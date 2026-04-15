"""
FairLens Counterfactual Engine — Generate individual bias stories.
"If this person were male, they would have been hired."
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings

warnings.filterwarnings("ignore")


def generate_counterfactuals(df, target_col, sensitive_cols, num_examples=5):
    """
    For rejected candidates, flip their sensitive attribute and predict.
    Shows individual-level bias.
    """
    primary_col = sensitive_cols[0]

    # Prepare features
    feature_cols = [c for c in df.columns if c != target_col
                    and df[c].dtype in ["int64", "float64", "int32", "float32"]]
    all_cols = feature_cols + [primary_col]

    X = df[all_cols].copy()
    y = df[target_col].values

    # Encode the sensitive column
    le_sensitive = LabelEncoder()
    X[primary_col] = le_sensitive.fit_transform(X[primary_col].astype(str))

    for col in X.columns:
        if X[col].dtype == "object":
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))

    X = X.fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_scaled, y)

    # Find rejected candidates
    y_pred = model.predict(X_scaled)
    y_proba = model.predict_proba(X_scaled)[:, 1]
    rejected_indices = np.where(y_pred == 0)[0]

    counterfactuals = []
    sensitive_values = df[primary_col].unique().tolist()

    for idx in rejected_indices[:num_examples * 3]:  # Check more to find good examples
        if len(counterfactuals) >= num_examples:
            break

        original_row = df.iloc[idx]
        original_value = original_row[primary_col]
        original_prob = float(y_proba[idx])

        # Try flipping to each other sensitive value
        best_flip = None
        best_flip_prob = 0.0

        for alt_value in sensitive_values:
            if alt_value == original_value:
                continue

            # Create counterfactual
            X_cf = X.iloc[idx:idx+1].copy()
            X_cf[primary_col] = le_sensitive.transform([alt_value])[0]
            X_cf_scaled = scaler.transform(X_cf)
            cf_prob = float(model.predict_proba(X_cf_scaled)[:, 1][0])
            cf_pred = int(model.predict(X_cf_scaled)[0])

            if cf_pred == 1 and cf_prob > best_flip_prob:
                best_flip = alt_value
                best_flip_prob = cf_prob

        if best_flip:
            # Build the story
            name_col = None
            for c in df.columns:
                if "name" in c.lower():
                    name_col = c
                    break

            name = original_row[name_col] if name_col else f"Applicant #{idx}"

            # Get relevant info
            info = {}
            for c in df.columns:
                if c not in [target_col, primary_col] and c != name_col:
                    info[c] = str(original_row[c])

            counterfactuals.append({
                "index": int(idx),
                "name": str(name),
                "original_attribute": f"{primary_col}: {original_value}",
                "counterfactual_attribute": f"{primary_col}: {best_flip}",
                "original_outcome": "REJECTED",
                "counterfactual_outcome": "ACCEPTED",
                "original_probability": round(original_prob, 3),
                "counterfactual_probability": round(best_flip_prob, 3),
                "probability_shift": round(best_flip_prob - original_prob, 3),
                "profile": info,
                "story": (
                    f"{name} ({original_value}, {info.get('age', '?')} years old) was REJECTED "
                    f"with a {round(original_prob * 100, 1)}% acceptance probability. "
                    f"If {name} were {best_flip} with identical qualifications, "
                    f"they would have been ACCEPTED with {round(best_flip_prob * 100, 1)}% probability."
                ),
            })

    return {
        "sensitive_column": primary_col,
        "target_column": target_col,
        "counterfactuals": counterfactuals,
        "total_rejected": int(len(rejected_indices)),
        "bias_affected_count": len(counterfactuals),
    }
