from typing import Any, Dict, List


def calculate_profile_metrics(transactions: List[Dict[str, Any]], pos_sales: Dict[str, Any], business_name: str) -> Dict[str, Any]:
    monthly_revenue = float(pos_sales.get("monthly_revenue", 0))
    transaction_count = len(transactions)
    sales_days = len(pos_sales.get("daily_sales", []))
    avg_daily = monthly_revenue / max(1, sales_days)

    merchant_stability = min(95, 55 + int(monthly_revenue / 10000) + min(15, transaction_count // 2) + (5 if sales_days > 10 else 0))
    business_credibility = min(95, 50 + min(20, transaction_count // 3) + (10 if pos_sales.get("sales_frequency", "steady") == "steady" else 0) + (10 if monthly_revenue > 20000 else 0))
    cash_flow_score = min(95, 45 + min(20, int(monthly_revenue / 5000)) + (10 if avg_daily > 1000 else 0))

    eco_score = int((merchant_stability + business_credibility + cash_flow_score) / 3)

    if eco_score >= 80:
        loan_readiness = "Eligible"
        risk_level = "Low"
    elif eco_score >= 65:
        loan_readiness = "Review"
        risk_level = "Medium"
    else:
        loan_readiness = "High Risk"
        risk_level = "High"

    cash_flow_forecast = round(monthly_revenue * 1.08, 2)

    return {
        "eco_score": eco_score,
        "merchant_stability": merchant_stability,
        "business_credibility": business_credibility,
        "loan_readiness": loan_readiness,
        "cash_flow_score": cash_flow_score,
        "cash_flow_forecast": cash_flow_forecast,
        "risk_level": risk_level,
        "monthly_revenue": monthly_revenue,
        "business_name": business_name,
    }
