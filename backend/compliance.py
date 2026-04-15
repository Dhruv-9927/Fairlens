"""
FairLens Compliance Engine — Map bias findings to real-world regulations.
EEOC (hiring), ECOA (lending), HHS (healthcare).
"""


REGULATIONS = {
    "hiring": {
        "name": "EEOC — Equal Employment Opportunity",
        "rules": [
            {
                "id": "eeoc_four_fifths",
                "name": "Four-Fifths (80%) Rule",
                "description": "Selection rate for any protected group must be at least 80% of the rate for the group with the highest rate.",
                "citation": "29 CFR §1607.4(D) — Uniform Guidelines on Employee Selection Procedures",
                "check": lambda di: di >= 0.8,
                "threshold": 0.8,
                "metric": "disparate_impact",
            },
            {
                "id": "eeoc_pattern",
                "name": "Pattern or Practice of Discrimination",
                "description": "Statistical evidence showing systematic discrimination against a protected group.",
                "citation": "Title VII of the Civil Rights Act of 1964, 42 U.S.C. §2000e",
                "check": lambda di: di >= 0.7,
                "threshold": 0.7,
                "metric": "disparate_impact",
            },
            {
                "id": "eeoc_adverse_impact",
                "name": "Adverse Impact Analysis",
                "description": "Any employment practice that has a disproportionately negative effect on a protected group.",
                "citation": "Griggs v. Duke Power Co., 401 U.S. 424 (1971)",
                "check": lambda di: di >= 0.8,
                "threshold": 0.8,
                "metric": "disparate_impact",
            },
        ],
    },
    "lending": {
        "name": "ECOA — Equal Credit Opportunity Act",
        "rules": [
            {
                "id": "ecoa_disparate_treatment",
                "name": "Disparate Treatment",
                "description": "Intentional discrimination based on race, color, religion, national origin, sex, marital status, or age.",
                "citation": "15 U.S.C. §1691 — Equal Credit Opportunity Act",
                "check": lambda di: di >= 0.85,
                "threshold": 0.85,
                "metric": "disparate_impact",
            },
            {
                "id": "ecoa_disparate_impact",
                "name": "Disparate Impact in Lending",
                "description": "Facially neutral lending practices that disproportionately affect protected groups.",
                "citation": "Regulation B, 12 CFR Part 1002",
                "check": lambda di: di >= 0.8,
                "threshold": 0.8,
                "metric": "disparate_impact",
            },
            {
                "id": "ecoa_redlining",
                "name": "Digital Redlining Detection",
                "description": "Algorithmic practices that effectively deny services to communities of color.",
                "citation": "Fair Housing Act, 42 U.S.C. §§3601-3619",
                "check": lambda di: di >= 0.75,
                "threshold": 0.75,
                "metric": "disparate_impact",
            },
        ],
    },
    "healthcare": {
        "name": "HHS — Health and Human Services",
        "rules": [
            {
                "id": "hhs_nondiscrimination",
                "name": "Section 1557 Nondiscrimination",
                "description": "Prohibits discrimination in health programs on the basis of race, color, national origin, sex, age, or disability.",
                "citation": "Section 1557 of the ACA, 42 U.S.C. §18116",
                "check": lambda di: di >= 0.85,
                "threshold": 0.85,
                "metric": "disparate_impact",
            },
            {
                "id": "hhs_algorithmic_fairness",
                "name": "AI/ML Algorithmic Fairness",
                "description": "Health AI systems must not produce discriminatory outcomes across protected groups.",
                "citation": "HHS Final Rule, 89 FR 37522 (May 2024)",
                "check": lambda di: di >= 0.9,
                "threshold": 0.9,
                "metric": "disparate_impact",
            },
        ],
    },
}


def detect_industry(df_columns: list[str]) -> str:
    """Auto-detect industry from column names."""
    cols_lower = [c.lower() for c in df_columns]

    hiring_keywords = ["hired", "interview", "experience", "education", "resume", "position", "job"]
    lending_keywords = ["loan", "credit", "income", "debt", "mortgage", "interest", "approved"]
    health_keywords = ["diagnosis", "treatment", "patient", "health", "medical", "hospital", "condition"]

    scores = {
        "hiring": sum(1 for c in cols_lower for k in hiring_keywords if k in c),
        "lending": sum(1 for c in cols_lower for k in lending_keywords if k in c),
        "healthcare": sum(1 for c in cols_lower for k in health_keywords if k in c),
    }

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "hiring"  # Default to hiring


def check_compliance(analysis_results: dict, industry: str = None) -> dict:
    """Check bias findings against regulatory requirements."""
    if not industry:
        industry = detect_industry(analysis_results.get("dataset_info", {}).get("column_names", []))

    reg = REGULATIONS.get(industry, REGULATIONS["hiring"])

    compliance_results = {
        "industry": industry,
        "regulation_name": reg["name"],
        "checks": [],
        "overall_compliant": True,
        "violations_count": 0,
        "warnings_count": 0,
    }

    per_attr = analysis_results.get("per_attribute_metrics", {})

    for rule in reg["rules"]:
        for attr_name, attr_metrics in per_attr.items():
            di = attr_metrics.get("disparate_impact", 1.0)
            passed = rule["check"](di)

            status = "PASS" if passed else "VIOLATION"
            if not passed and di >= rule["threshold"] * 0.9:
                status = "WARNING"

            check_result = {
                "rule_id": rule["id"],
                "rule_name": rule["name"],
                "description": rule["description"],
                "citation": rule["citation"],
                "attribute": attr_name,
                "measured_value": round(di, 4),
                "threshold": rule["threshold"],
                "status": status,
            }

            compliance_results["checks"].append(check_result)

            if status == "VIOLATION":
                compliance_results["overall_compliant"] = False
                compliance_results["violations_count"] += 1
            elif status == "WARNING":
                compliance_results["warnings_count"] += 1

    return compliance_results
