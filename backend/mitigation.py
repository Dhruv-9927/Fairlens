"""
FairLens Mitigation Engine — Reweighting and resampling strategies.
Pure numpy/sklearn implementation — no fairlearn/scipy dependency.
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score
import warnings

warnings.filterwarnings("ignore")


def _prepare_data(df, target_col, sensitive_cols):
    """Prepare features for model training."""
    feature_cols = [c for c in df.columns if c != target_col and c not in sensitive_cols
                    and df[c].dtype in ["int64", "float64", "int32", "float32"]]
    if not feature_cols:
        feature_cols = [c for c in df.columns if c != target_col and c not in sensitive_cols]

    X = df[feature_cols].copy()
    y = df[target_col].values

    for col in X.columns:
        if X[col].dtype == "object":
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

    X = X.fillna(0)
    return X, y, feature_cols


def _compute_scores(df, X, y, target_col, sensitive_cols, sample_weight=None):
    """Train model with optional weights and compute fairness metrics."""
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_scaled, y, sample_weight=sample_weight)
    y_pred = model.predict(X_scaled)

    acc = float(accuracy_score(y, y_pred))

    fairness_scores = {}
    for col in sensitive_cols:
        groups = df[col].values
        rates = {}
        for g in df[col].unique():
            mask = groups == g
            rates[str(g)] = float(y_pred[mask].mean()) if mask.sum() > 0 else 0.0
        max_r = max(rates.values()) if rates else 1.0
        min_r = min(rates.values()) if rates else 0.0
        di = min_r / max_r if max_r > 0 else 1.0
        fairness_scores[col] = {
            "disparate_impact": round(di, 4),
            "fairness_score": round(min(di / 0.8, 1.0), 3),
            "group_rates": rates,
        }

    overall_scores = [v["fairness_score"] for v in fairness_scores.values()]
    overall = round(sum(overall_scores) / len(overall_scores), 3) if overall_scores else 0.5

    return {
        "accuracy": round(acc, 4),
        "overall_fairness_score": overall,
        "per_attribute": fairness_scores,
        "predictions": y_pred.tolist(),
    }


def apply_reweighting(df, target_col, sensitive_cols):
    """Apply sample reweighting to equalize group outcomes."""
    X, y, feature_cols = _prepare_data(df, target_col, sensitive_cols)
    primary_col = sensitive_cols[0]
    groups = df[primary_col].values

    overall_rate = y.mean()
    weights = np.ones(len(y))

    for group in df[primary_col].unique():
        mask = groups == group
        group_rate = y[mask].mean()
        if group_rate > 0:
            pos_mask = mask & (y == 1)
            neg_mask = mask & (y == 0)
            expected_pos = overall_rate * mask.sum()
            actual_pos = pos_mask.sum()
            if actual_pos > 0:
                weights[pos_mask] = expected_pos / actual_pos
            actual_neg = neg_mask.sum()
            expected_neg = (1 - overall_rate) * mask.sum()
            if actual_neg > 0:
                weights[neg_mask] = expected_neg / actual_neg

    before = _compute_scores(df, X, y, target_col, sensitive_cols)
    after = _compute_scores(df, X, y, target_col, sensitive_cols, sample_weight=weights)

    return {
        "method": "reweighting",
        "description": "Adjusts sample weights to equalize positive outcome rates across demographic groups",
        "before": before,
        "after": after,
        "accuracy_impact": round(after["accuracy"] - before["accuracy"], 4),
        "fairness_improvement": round(after["overall_fairness_score"] - before["overall_fairness_score"], 3),
    }


def apply_resampling(df, target_col, sensitive_cols):
    """Apply oversampling of underrepresented groups."""
    primary_col = sensitive_cols[0]

    X_orig, y_orig, feature_cols = _prepare_data(df, target_col, sensitive_cols)
    before = _compute_scores(df, X_orig, y_orig, target_col, sensitive_cols)

    group_rates = {}
    for group in df[primary_col].unique():
        mask = df[primary_col] == group
        group_rates[group] = df.loc[mask, target_col].mean()

    target_rate = max(group_rates.values())

    dfs = [df]
    for group, rate in group_rates.items():
        if rate < target_rate * 0.9:
            group_df = df[df[primary_col] == group]
            positive_df = group_df[group_df[target_col] == 1]
            if len(positive_df) > 0:
                needed = int((target_rate - rate) * len(group_df))
                oversample = positive_df.sample(n=max(1, needed), replace=True, random_state=42)
                dfs.append(oversample)

    df_resampled = pd.concat(dfs, ignore_index=True)

    X_new, y_new, _ = _prepare_data(df_resampled, target_col, sensitive_cols)
    after = _compute_scores(df_resampled, X_new, y_new, target_col, sensitive_cols)

    return {
        "method": "resampling",
        "description": "Oversamples positive outcomes in underrepresented groups to balance the dataset",
        "before": before,
        "after": after,
        "original_size": len(df),
        "resampled_size": len(df_resampled),
        "accuracy_impact": round(after["accuracy"] - before["accuracy"], 4),
        "fairness_improvement": round(after["overall_fairness_score"] - before["overall_fairness_score"], 3),
    }


def mitigate(df, target_col, sensitive_cols, method="reweighting"):
    """Run mitigation and return before/after comparison."""
    if method == "resampling":
        return apply_resampling(df, target_col, sensitive_cols)
    else:
        return apply_reweighting(df, target_col, sensitive_cols)
