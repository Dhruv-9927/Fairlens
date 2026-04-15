"""
FairLens Gemini Service — Report generation + Chat Q&A.
Uses google-genai SDK. Cached by dataset hash to save API quota.
"""

import hashlib
import json
import os
from dotenv import load_dotenv

load_dotenv()

# In-memory cache
_report_cache: dict[str, str] = {}
_chat_cache: dict[str, str] = {}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def _get_client():
    """Initialize Gemini client."""
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        return client
    except Exception as e:
        print(f"Gemini client init failed: {e}")
        return None


def _hash_data(data: dict) -> str:
    """Create MD5 hash of analysis results for caching."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(serialized.encode()).hexdigest()


def generate_bias_report(analysis_results: dict, compliance_results: dict = None) -> dict:
    """
    Generate a plain-English bias report using Gemini 2.0 Flash.
    Cached by dataset hash — same dataset = 0 API calls after first.
    """
    cache_key = _hash_data(analysis_results)

    if cache_key in _report_cache:
        return {"report": _report_cache[cache_key], "cached": True}

    client = _get_client()
    if not client:
        return {"report": _generate_fallback_report(analysis_results, compliance_results), "cached": False, "fallback": True}

    # Build prompt
    prompt = f"""You are FairLens, an AI Bias Detection expert. Analyze these bias audit results and write a clear, 
actionable report that a non-technical HR director or compliance officer can understand and act on.

## Dataset Analysis Results
{json.dumps(analysis_results, indent=2, default=str)}

## Compliance Results
{json.dumps(compliance_results, indent=2, default=str) if compliance_results else "Not available"}

Write a bias audit report with these sections:
1. **Executive Summary** — 2-3 sentences on the overall finding
2. **Key Findings** — bullet points of the most critical bias issues found
3. **Affected Groups** — which demographic groups are most impacted and how
4. **Risk Assessment** — severity level (Critical/High/Medium/Low) and regulatory implications
5. **Recommended Actions** — specific, actionable steps to fix the bias
6. **Intersectional Concerns** — if combined demographic groups show worse outcomes

Use plain English. No jargon. Be specific with numbers.
Format in Markdown."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        report = response.text
        _report_cache[cache_key] = report
        return {"report": report, "cached": False}
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {"report": _generate_fallback_report(analysis_results, compliance_results), "cached": False, "fallback": True}


def chat_about_bias(question: str, analysis_results: dict) -> dict:
    """
    Answer a natural language question about the dataset's bias using Gemini.
    """
    cache_key = _hash_data({"q": question, "data_hash": _hash_data(analysis_results)})

    if cache_key in _chat_cache:
        return {"answer": _chat_cache[cache_key], "cached": True}

    client = _get_client()
    if not client:
        return {"answer": _fallback_chat(question, analysis_results), "cached": False, "fallback": True}

    prompt = f"""You are FairLens, an AI bias detection assistant. A user is examining a dataset for bias and asks:

"{question}"

Here are the bias analysis results for this dataset:
{json.dumps(analysis_results, indent=2, default=str)}

Answer the question clearly and specifically, referencing the actual numbers from the analysis.
Keep your answer concise (3-5 sentences max). Use plain English."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        answer = response.text
        _chat_cache[cache_key] = answer
        return {"answer": answer, "cached": False}
    except Exception as e:
        print(f"Gemini chat error: {e}")
        return {"answer": _fallback_chat(question, analysis_results), "cached": False, "fallback": True}


def _generate_fallback_report(analysis_results: dict, compliance_results: dict = None) -> str:
    """Generate a structured report without Gemini (fallback)."""
    info = analysis_results.get("dataset_info", {})
    overall = analysis_results.get("overall_fairness_score", 0.5)
    per_attr = analysis_results.get("per_attribute_metrics", {})

    report = f"""# FairLens Bias Audit Report

## Executive Summary
Analysis of a dataset with {info.get('rows', '?')} records across {info.get('columns', '?')} features. 
The overall fairness score is **{overall}** out of 1.0. {"Significant bias was detected." if overall < 0.9 else "The dataset appears relatively fair."}

## Key Findings
"""
    for attr, metrics in per_attr.items():
        di = metrics.get("disparate_impact", 1.0)
        report += f"- **{attr}**: Disparate impact ratio = {di}. "
        if di < 0.8:
            report += "⚠️ FAILS the 4/5ths rule — bias detected.\n"
        else:
            report += "✅ Passes the 4/5ths rule.\n"

        # Group breakdown
        for group, gm in metrics.get("group_metrics", {}).items():
            rate = gm.get("positive_rate", 0)
            report += f"  - {group}: {round(rate * 100, 1)}% positive rate ({gm.get('count', '?')} samples)\n"

    inter = analysis_results.get("intersectional_metrics")
    if inter and inter.get("bias_detected"):
        worst = inter.get("worst_group", {})
        best = inter.get("best_group", {})
        report += f"""
## Intersectional Concerns
- Worst-performing group: **{worst.get('name', '?')}** ({round(worst.get('positive_rate', 0) * 100, 1)}% positive rate)
- Best-performing group: **{best.get('name', '?')}** ({round(best.get('positive_rate', 0) * 100, 1)}% positive rate)
- Intersectional gap: {round(inter.get('fairness_gap', 0) * 100, 1)} percentage points
"""

    report += """
## Recommended Actions
1. Apply reweighting or resampling to equalize group outcomes
2. Review and audit the features used for decision-making
3. Monitor ongoing decisions for bias drift
4. Consult with legal/compliance team regarding regulatory requirements
"""
    return report


def _fallback_chat(question: str, analysis_results: dict) -> str:
    """Simple fallback for chat when Gemini is unavailable."""
    overall = analysis_results.get("overall_fairness_score", 0.5)
    per_attr = analysis_results.get("per_attribute_metrics", {})

    answer = f"Based on the analysis, the overall fairness score is {overall}/1.0. "

    for attr, metrics in per_attr.items():
        di = metrics.get("disparate_impact", 1.0)
        if di < 0.8:
            answer += f"Significant bias was detected in '{attr}' with a disparate impact of {di}. "

    answer += "Please try again when the AI service is available for a more detailed answer."
    return answer
