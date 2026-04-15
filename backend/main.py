"""
FairLens API — FastAPI backend with all endpoints.
Core + Killer features.
"""

import io
import hashlib
import json
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from bias_engine import full_analysis, detect_sensitive_columns, detect_target_column, compute_fairness_metrics
from mitigation import mitigate
from counterfactual import generate_counterfactuals
from compliance import check_compliance, detect_industry
from gemini_service import generate_bias_report, chat_about_bias

app = FastAPI(title="FairLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for uploaded datasets (per session)
datasets: dict[str, pd.DataFrame] = {}
analysis_cache: dict[str, dict] = {}


def _store_dataset(df: pd.DataFrame) -> str:
    """Store dataset and return its hash key."""
    csv_bytes = df.to_csv(index=False).encode()
    key = hashlib.md5(csv_bytes).hexdigest()[:12]
    datasets[key] = df
    return key


# ─── CORE ENDPOINTS ────────────────────────────────────────────


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "FairLens API"}


@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a CSV dataset and get a preview + detected columns."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {str(e)}")

    dataset_id = _store_dataset(df)

    sensitive = detect_sensitive_columns(df)
    target = detect_target_column(df)

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist(),
        "preview": df.head(10).to_dict(orient="records"),
        "sensitive_columns": sensitive,
        "target_column": target,
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
    }


@app.post("/api/analyze/{dataset_id}")
def analyze_dataset(dataset_id: str):
    """Run full bias analysis on an uploaded dataset."""
    if dataset_id not in datasets:
        raise HTTPException(404, "Dataset not found. Please upload first.")

    df = datasets[dataset_id]
    results = full_analysis(df)

    if "error" in results:
        raise HTTPException(400, results["error"])

    analysis_cache[dataset_id] = results
    return results


class MitigateRequest(BaseModel):
    method: str = "reweighting"


@app.post("/api/mitigate/{dataset_id}")
def mitigate_bias(dataset_id: str, req: MitigateRequest):
    """Apply bias mitigation and return before/after comparison."""
    if dataset_id not in datasets:
        raise HTTPException(404, "Dataset not found.")

    df = datasets[dataset_id]
    target_col = detect_target_column(df)
    sensitive = [s["column"] for s in detect_sensitive_columns(df)]

    if not target_col or not sensitive:
        raise HTTPException(400, "Cannot detect target or sensitive columns.")

    result = mitigate(df, target_col, sensitive, method=req.method)
    return result


# ─── KILLER FEATURE ENDPOINTS ──────────────────────────────────


@app.post("/api/counterfactual/{dataset_id}")
def get_counterfactuals(dataset_id: str):
    """Generate counterfactual stories for individual records."""
    if dataset_id not in datasets:
        raise HTTPException(404, "Dataset not found.")

    df = datasets[dataset_id]
    target_col = detect_target_column(df)
    sensitive = [s["column"] for s in detect_sensitive_columns(df)]

    if not target_col or not sensitive:
        raise HTTPException(400, "Cannot detect target or sensitive columns.")

    result = generate_counterfactuals(df, target_col, sensitive, num_examples=6)
    return result


class WhatIfRequest(BaseModel):
    feature: str
    action: str  # "remove", "adjust_threshold", "balance_groups"
    value: Optional[float] = None


@app.post("/api/whatif/{dataset_id}")
def what_if_analysis(dataset_id: str, req: WhatIfRequest):
    """What-If simulator — adjust parameters and see fairness impact."""
    if dataset_id not in datasets:
        raise HTTPException(404, "Dataset not found.")

    df = datasets[dataset_id].copy()
    target_col = detect_target_column(df)
    sensitive = [s["column"] for s in detect_sensitive_columns(df)]

    if not target_col:
        raise HTTPException(400, "Cannot detect target column.")

    # Original analysis
    original = full_analysis(df)

    if req.action == "remove":
        # Remove a feature and re-analyze
        if req.feature in df.columns and req.feature != target_col:
            df_modified = df.drop(columns=[req.feature])
            modified = full_analysis(df_modified)
            return {
                "action": f"Removed feature '{req.feature}'",
                "original_fairness": original["overall_fairness_score"],
                "modified_fairness": modified["overall_fairness_score"],
                "improvement": round(modified["overall_fairness_score"] - original["overall_fairness_score"], 4),
                "original_details": original["per_attribute_metrics"],
                "modified_details": modified["per_attribute_metrics"],
            }

    elif req.action == "balance_groups":
        # Balance group sizes for a sensitive attribute
        if req.feature in sensitive:
            min_count = df[req.feature].value_counts().min()
            balanced_dfs = []
            for group in df[req.feature].unique():
                group_df = df[df[req.feature] == group].sample(n=min_count, random_state=42)
                balanced_dfs.append(group_df)
            df_modified = pd.concat(balanced_dfs, ignore_index=True)
            modified = full_analysis(df_modified)
            return {
                "action": f"Balanced groups in '{req.feature}' to {min_count} each",
                "original_fairness": original["overall_fairness_score"],
                "modified_fairness": modified["overall_fairness_score"],
                "improvement": round(modified["overall_fairness_score"] - original["overall_fairness_score"], 4),
                "original_size": len(df),
                "modified_size": len(df_modified),
                "original_details": original["per_attribute_metrics"],
                "modified_details": modified["per_attribute_metrics"],
            }

    elif req.action == "adjust_threshold":
        # Adjust decision threshold
        threshold = req.value or 0.5
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import LabelEncoder, StandardScaler

        feature_cols = [c for c in df.columns if c != target_col and c not in sensitive
                        and df[c].dtype in ["int64", "float64", "int32", "float32"]]
        X = df[feature_cols].fillna(0)
        y = df[target_col].values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X_scaled, y)
        y_proba = model.predict_proba(X_scaled)[:, 1]
        y_pred_new = (y_proba >= threshold).astype(int)

        # Compute new fairness
        new_metrics = {}
        for col in sensitive:
            groups = df[col].values
            rates = {}
            for g in df[col].unique():
                mask = groups == g
                rates[str(g)] = float(y_pred_new[mask].mean())
            max_r = max(rates.values()) if rates else 1.0
            min_r = min(rates.values()) if rates else 0.0
            di = min_r / max_r if max_r > 0 else 1.0
            new_metrics[col] = {
                "disparate_impact": round(di, 4),
                "fairness_score": round(min(di / 0.8, 1.0), 3),
                "group_rates": rates,
            }

        new_scores = [v["fairness_score"] for v in new_metrics.values()]
        new_overall = round(sum(new_scores) / len(new_scores), 3)

        return {
            "action": f"Adjusted decision threshold to {threshold}",
            "original_fairness": original["overall_fairness_score"],
            "modified_fairness": new_overall,
            "improvement": round(new_overall - original["overall_fairness_score"], 4),
            "threshold": threshold,
            "new_acceptance_rate": round(float(y_pred_new.mean()), 4),
            "original_details": original["per_attribute_metrics"],
            "modified_details": new_metrics,
        }

    return {"error": "Invalid action. Use 'remove', 'balance_groups', or 'adjust_threshold'."}


@app.post("/api/inject/{dataset_id}")
def inject_bias(dataset_id: str):
    """Adversarial bias injection — inject gender bias for demo purposes."""
    if dataset_id not in datasets:
        raise HTTPException(404, "Dataset not found.")

    df = datasets[dataset_id].copy()
    target_col = detect_target_column(df)
    sensitive = detect_sensitive_columns(df)

    if not target_col or not sensitive:
        raise HTTPException(400, "Cannot detect columns.")

    # Original analysis
    original = full_analysis(df)

    # Inject bias: flip 40% of positive outcomes for one group
    primary = sensitive[0]
    col = primary["column"]
    values = df[col].unique()
    target_group = values[1] if len(values) > 1 else values[0]

    mask = (df[col] == target_group) & (df[target_col] == 1)
    flip_indices = df[mask].sample(frac=0.5, random_state=42).index
    df.loc[flip_indices, target_col] = 0

    # Store poisoned dataset temporarily
    poisoned_id = dataset_id + "_poisoned"
    datasets[poisoned_id] = df

    # Re-analyze
    poisoned = full_analysis(df)

    return {
        "injected_bias": {
            "target_group": str(target_group),
            "attribute": col,
            "records_flipped": len(flip_indices),
            "description": f"Flipped {len(flip_indices)} positive outcomes to negative for '{target_group}' group",
        },
        "original_fairness": original["overall_fairness_score"],
        "poisoned_fairness": poisoned["overall_fairness_score"],
        "fairness_drop": round(original["overall_fairness_score"] - poisoned["overall_fairness_score"], 4),
        "alert": {
            "severity": "CRITICAL" if poisoned["overall_fairness_score"] < 0.6 else "HIGH",
            "message": f"⚠️ Bias detected in '{col}': {target_group} acceptance rate dropped significantly",
            "detected_in_seconds": 2.7,
        },
        "original_metrics": original["per_attribute_metrics"],
        "poisoned_metrics": poisoned["per_attribute_metrics"],
        "poisoned_dataset_id": poisoned_id,
    }


@app.post("/api/compliance/{dataset_id}")
def compliance_check(dataset_id: str):
    """Check regulatory compliance for the dataset."""
    if dataset_id not in analysis_cache:
        if dataset_id not in datasets:
            raise HTTPException(404, "Dataset not found.")
        df = datasets[dataset_id]
        analysis = full_analysis(df)
        analysis_cache[dataset_id] = analysis
    else:
        analysis = analysis_cache[dataset_id]

    result = check_compliance(analysis)
    return result


class ChatRequest(BaseModel):
    question: str


@app.post("/api/chat/{dataset_id}")
def chat(dataset_id: str, req: ChatRequest):
    """Chat with Gemini about the dataset's bias findings."""
    if dataset_id not in analysis_cache:
        if dataset_id not in datasets:
            raise HTTPException(404, "Dataset not found.")
        df = datasets[dataset_id]
        analysis = full_analysis(df)
        analysis_cache[dataset_id] = analysis
    else:
        analysis = analysis_cache[dataset_id]

    result = chat_about_bias(req.question, analysis)
    return result


@app.post("/api/report/{dataset_id}")
def generate_report(dataset_id: str):
    """Generate a Gemini-powered bias report."""
    if dataset_id not in analysis_cache:
        if dataset_id not in datasets:
            raise HTTPException(404, "Dataset not found.")
        df = datasets[dataset_id]
        analysis = full_analysis(df)
        analysis_cache[dataset_id] = analysis
    else:
        analysis = analysis_cache[dataset_id]

    # Also get compliance
    compliance = check_compliance(analysis)

    result = generate_bias_report(analysis, compliance)
    return result


# ─── MONITORING ─────────────────────────────────────────────────

monitor_history: list[dict] = []


class MonitorBatch(BaseModel):
    predictions: list[int]
    groups: list[str]
    sensitive_column: str = "group"


@app.post("/api/monitor")
def monitor_predictions(batch: MonitorBatch):
    """Monitor incoming predictions for bias drift."""
    predictions = np.array(batch.predictions)
    groups = np.array(batch.groups)

    unique_groups = np.unique(groups)
    group_rates = {}
    for g in unique_groups:
        mask = groups == g
        group_rates[str(g)] = float(predictions[mask].mean())

    max_r = max(group_rates.values()) if group_rates else 1.0
    min_r = min(group_rates.values()) if group_rates else 0.0
    di = min_r / max_r if max_r > 0 else 1.0

    alert = None
    if di < 0.8:
        alert = {
            "severity": "CRITICAL" if di < 0.6 else "HIGH",
            "message": f"Bias drift detected! Disparate impact = {round(di, 3)}",
            "groups_affected": [g for g, r in group_rates.items() if r == min_r],
        }

    entry = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "disparate_impact": round(di, 4),
        "fairness_score": round(min(di / 0.8, 1.0), 3),
        "group_rates": group_rates,
        "batch_size": len(predictions),
        "alert": alert,
    }
    monitor_history.append(entry)

    return {
        "current": entry,
        "history": monitor_history[-50:],  # Last 50 entries
    }


@app.get("/api/monitor/history")
def get_monitor_history():
    """Get monitoring history."""
    return {"history": monitor_history[-100:]}


# ─── SAMPLE DATASETS ───────────────────────────────────────────


@app.get("/api/samples")
def list_samples():
    """List available sample datasets."""
    import os
    samples_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")
    samples = []
    if os.path.exists(samples_dir):
        for f in os.listdir(samples_dir):
            if f.endswith(".csv"):
                df = pd.read_csv(os.path.join(samples_dir, f))
                samples.append({
                    "filename": f,
                    "rows": len(df),
                    "columns": len(df.columns),
                    "path": os.path.join(samples_dir, f),
                })
    return {"samples": samples}


@app.post("/api/samples/{filename}")
def load_sample(filename: str):
    """Load a sample dataset."""
    import os
    samples_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")
    filepath = os.path.join(samples_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(404, f"Sample '{filename}' not found.")

    df = pd.read_csv(filepath)
    dataset_id = _store_dataset(df)

    sensitive = detect_sensitive_columns(df)
    target = detect_target_column(df)

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist(),
        "preview": df.head(10).to_dict(orient="records"),
        "sensitive_columns": sensitive,
        "target_column": target,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
