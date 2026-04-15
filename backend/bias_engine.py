"""
FairLens Bias Engine — Core fairness detection using scikit-learn + numpy.
Pure implementation — no scipy/fairlearn dependency needed.
Zero API calls, runs 100% locally for free.
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score
import warnings

warnings.filterwarnings("ignore")

# Common sensitive column names to auto-detect
SENSITIVE_KEYWORDS = {
    "gender": ["gender", "sex", "male", "female"],
    "race": ["race", "ethnicity", "ethnic", "racial"],
    "age": ["age", "age_group", "age_range", "dob", "birth"],
    "region": ["region", "state", "country", "zip", "zipcode", "zip_code", "location", "city"],
}

# Common target column names
TARGET_KEYWORDS = [
    "hired", "approved", "accepted", "selected", "admitted",
    "loan_approved", "outcome", "result", "target", "label",
    "decision", "status", "granted", "passed",
]


def detect_sensitive_columns(df: pd.DataFrame) -> list:
    """Auto-detect demographic/sensitive columns in the dataset."""
    sensitive = []
    for col in df.columns:
        col_lower = col.lower().strip()
        for category, keywords in SENSITIVE_KEYWORDS.items():
            if any(kw in col_lower for kw in keywords):
                unique_vals = df[col].nunique()
                sensitive.append({
                    "column": col,
                    "category": category,
                    "unique_values": int(unique_vals),
                    "values": [str(v) for v in df[col].unique().tolist()[:20]],
                })
                break
    return sensitive


def detect_target_column(df: pd.DataFrame):
    """Auto-detect the target/outcome column."""
    for col in df.columns:
        col_lower = col.lower().strip()
        if any(kw in col_lower for kw in TARGET_KEYWORDS):
            if df[col].nunique() <= 5:
                return col
    # Fallback: last column with binary values
    for col in reversed(df.columns.tolist()):
        if df[col].nunique() == 2:
            return col
    return None


def demographic_parity_difference(y, sensitive_features):
    """Compute demographic parity difference (pure numpy)."""
    groups = np.unique(sensitive_features)
    rates = []
    for g in groups:
        mask = sensitive_features == g
        if mask.sum() > 0:
            rates.append(float(np.mean(y[mask])))
    if len(rates) < 2:
        return 0.0
    return max(rates) - min(rates)


def disparate_impact_ratio(y, sensitive_features):
    """Compute disparate impact ratio (min_rate / max_rate)."""
    groups = np.unique(sensitive_features)
    rates = []
    for g in groups:
        mask = sensitive_features == g
        if mask.sum() > 0:
            rates.append(float(np.mean(y[mask])))
    if len(rates) < 2 or max(rates) == 0:
        return 1.0
    return min(rates) / max(rates)


def compute_fairness_metrics(df: pd.DataFrame, sensitive_col: str, target_col: str) -> dict:
    """Compute comprehensive fairness metrics for a given sensitive attribute."""
    y_true = df[target_col].values.astype(float)
    groups = df[sensitive_col].values

    # Per-group acceptance rates
    group_metrics = {}
    for group in df[sensitive_col].unique():
        mask = groups == group
        group_y = y_true[mask]
        group_metrics[str(group)] = {
            "count": int(mask.sum()),
            "positive_rate": round(float(group_y.mean()), 4) if len(group_y) > 0 else 0.0,
            "positive_count": int(group_y.sum()),
            "negative_count": int(len(group_y) - group_y.sum()),
        }

    # Overall fairness metrics
    dp_diff = demographic_parity_difference(y_true, groups)
    di = disparate_impact_ratio(y_true, groups)

    # Overall fairness score (0-1 scale, 1 = perfectly fair)
    fairness_score = round(min(di / 0.8, 1.0), 3)

    return {
        "sensitive_column": sensitive_col,
        "target_column": target_col,
        "group_metrics": group_metrics,
        "demographic_parity_difference": round(dp_diff, 4),
        "disparate_impact": round(di, 4),
        "fairness_score": fairness_score,
        "four_fifths_rule_violated": di < 0.8,
        "bias_detected": di < 0.8,
    }


def compute_intersectional_metrics(df: pd.DataFrame, sensitive_cols: list, target_col: str) -> dict:
    """Compute intersectional bias across combined demographic groups."""
    if len(sensitive_cols) < 2:
        return {"error": "Need at least 2 sensitive columns for intersectional analysis"}

    df_copy = df.copy()
    df_copy["_intersect"] = df_copy[sensitive_cols].astype(str).agg(" + ".join, axis=1)

    y_true = df_copy[target_col].values.astype(float)
    groups = df_copy["_intersect"].values

    group_metrics = {}
    for group in df_copy["_intersect"].unique():
        mask = groups == group
        group_y = y_true[mask]
        if mask.sum() >= 3:
            group_metrics[str(group)] = {
                "count": int(mask.sum()),
                "positive_rate": round(float(group_y.mean()), 4),
                "positive_count": int(group_y.sum()),
            }

    rates = [m["positive_rate"] for m in group_metrics.values()]
    max_rate = max(rates) if rates else 1.0
    min_rate = min(rates) if rates else 0.0
    di = min_rate / max_rate if max_rate > 0 else 1.0

    worst_group = min(group_metrics.items(), key=lambda x: x[1]["positive_rate"]) if group_metrics else None
    best_group = max(group_metrics.items(), key=lambda x: x[1]["positive_rate"]) if group_metrics else None

    return {
        "intersectional_columns": sensitive_cols,
        "target_column": target_col,
        "group_metrics": group_metrics,
        "disparate_impact": round(di, 4),
        "fairness_gap": round(max_rate - min_rate, 4),
        "worst_group": {"name": worst_group[0], **worst_group[1]} if worst_group else None,
        "best_group": {"name": best_group[0], **best_group[1]} if best_group else None,
        "bias_detected": di < 0.8,
    }


def generate_heatmap_data(df: pd.DataFrame, sensitive_cols: list, target_col: str) -> list:
    """Generate heatmap data: per-group positive rates for each sensitive attribute."""
    heatmap = []
    for col in sensitive_cols:
        for group in df[col].unique():
            mask = df[col] == group
            group_y = df.loc[mask, target_col]
            rate = float(group_y.mean()) if len(group_y) > 0 else 0.0
            heatmap.append({
                "attribute": col,
                "group": str(group),
                "positive_rate": round(rate, 4),
                "count": int(mask.sum()),
                "bias_level": "high" if rate < 0.4 else ("medium" if rate < 0.6 else "low"),
            })
    return heatmap


def train_model_and_predict(df: pd.DataFrame, target_col: str, sensitive_cols: list):
    """Train a simple model and return predictions for fairness evaluation."""
    feature_cols = [c for c in df.columns if c != target_col and c not in sensitive_cols
                    and df[c].dtype in ["int64", "float64", "int32", "float32"]]

    if not feature_cols:
        feature_cols = [c for c in df.columns if c != target_col and c not in sensitive_cols]

    X = df[feature_cols].copy()
    y = df[target_col].values

    # Encode categorical columns
    encoders = {}
    for col in X.columns:
        if X[col].dtype == "object":
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            encoders[col] = le

    X = X.fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_scaled, y)
    y_pred = model.predict(X_scaled)

    # Feature importance
    importance = dict(zip(feature_cols, [round(abs(float(c)), 4) for c in model.coef_[0]]))

    return {
        "y_true": y.tolist(),
        "y_pred": y_pred.tolist(),
        "accuracy": round(float(accuracy_score(y, y_pred)), 4),
        "feature_importance": importance,
        "model_type": "LogisticRegression",
        "feature_cols": feature_cols,
    }


def generate_bias_fingerprint(df: pd.DataFrame, sensitive_cols: list, target_col: str) -> dict:
    """Generate radial fingerprint data for the Bias Fingerprint visualization."""
    axes = []

    for col in sensitive_cols:
        metrics = compute_fairness_metrics(df, col, target_col)
        axes.append({
            "axis": col,
            "disparate_impact": metrics["disparate_impact"],
            "fairness_score": metrics["fairness_score"],
            "parity_gap": metrics["demographic_parity_difference"],
            "bias_severity": 1.0 - metrics["fairness_score"],
        })

    if len(sensitive_cols) >= 2:
        inter = compute_intersectional_metrics(df, sensitive_cols[:2], target_col)
        axes.append({
            "axis": f"{sensitive_cols[0]}×{sensitive_cols[1]}",
            "disparate_impact": inter.get("disparate_impact", 1.0),
            "fairness_score": min(inter.get("disparate_impact", 1.0) / 0.8, 1.0),
            "parity_gap": inter.get("fairness_gap", 0.0),
            "bias_severity": 1.0 - min(inter.get("disparate_impact", 1.0) / 0.8, 1.0),
        })

    return {"fingerprint_axes": axes}


def full_analysis(df: pd.DataFrame) -> dict:
    """Run the complete bias analysis pipeline."""
    sensitive_cols_info = detect_sensitive_columns(df)
    target_col = detect_target_column(df)

    if not target_col:
        return {"error": "Could not auto-detect target column. Please specify."}

    if not sensitive_cols_info:
        return {"error": "No sensitive/demographic columns detected."}

    sensitive_cols = [s["column"] for s in sensitive_cols_info]

    # Per-attribute fairness
    per_attribute = {}
    for col in sensitive_cols:
        per_attribute[col] = compute_fairness_metrics(df, col, target_col)

    # Intersectional
    intersectional = None
    if len(sensitive_cols) >= 2:
        intersectional = compute_intersectional_metrics(df, sensitive_cols[:2], target_col)

    # Heatmap
    heatmap = generate_heatmap_data(df, sensitive_cols, target_col)

    # Model
    model_results = train_model_and_predict(df, target_col, sensitive_cols)

    # Fingerprint
    fingerprint = generate_bias_fingerprint(df, sensitive_cols, target_col)

    # Overall fairness
    scores = [m["fairness_score"] for m in per_attribute.values()]
    overall_score = round(sum(scores) / len(scores), 3) if scores else 0.5

    return {
        "dataset_info": {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "target_column": target_col,
            "sensitive_columns": sensitive_cols_info,
        },
        "overall_fairness_score": overall_score,
        "bias_detected": overall_score < 0.9,
        "per_attribute_metrics": per_attribute,
        "intersectional_metrics": intersectional,
        "heatmap_data": heatmap,
        "model_results": model_results,
        "fingerprint": fingerprint,
    }
