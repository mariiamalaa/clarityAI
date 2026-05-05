from __future__ import annotations

from typing import List, Dict, Any
import numpy as np
from dateutil import parser

__all__ = ["generateInsights"]


def _formatNum(val: float) -> str:
    """Standardized rounding for KPIs (~91,600)."""
    if abs(val) >= 1000000:
        return f"~{val/1000000:.1f}M"
    if abs(val) >= 1000:
        return f"~{int(round(val)):,}"
    return f"{int(round(val))}"


def generateInsights(
    forecast: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    changepoints: List[Dict[str, Any]],
    modelWeights: Dict[str, float]
) -> List[str]:
    """
    Final pass for executive-grade decision insights.
    """
    insights = []

    # 1. Projected Growth
    ensemble = forecast.get("ensemble", {})
    history = forecast.get("history", {})
    horizon = forecast.get("horizon", 12)

    if ensemble.get("yhat") and history.get("y"):
        forecasts = np.array(ensemble["yhat"])
        if len(forecasts) >= horizon:
            startValue = forecasts[0]
            endValue = forecasts[horizon - 1]
            if abs(startValue) > 1e-9:
                trendPct = ((endValue - startValue) / abs(startValue)) * 100
                insights.append(f"Projected growth: **{trendPct:+.1f}% over {horizon} months**")

    # 2. Peak Expected
    if ensemble.get("yhat") and ensemble.get("dates"):
        forecastValues = ensemble["yhat"]
        dates = ensemble["dates"]
        peakIdx = int(np.argmax(forecastValues))
        peakValue = forecastValues[peakIdx]
        peakDate = dates[peakIdx]

        if history.get("y"):
            lastActual = history["y"][-1]
            if abs(lastActual) > 1e-9:
                peakVsCurrent = ((peakValue - lastActual) / abs(lastActual)) * 100
                try:
                    peakMonth = parser.parse(peakDate).strftime("%B %Y")
                    insights.append(f"Peak expected in **{peakMonth} ({_formatNum(peakValue)}, {peakVsCurrent:+.1f}%)**")
                except Exception:
                    insights.append(f"Peak expected at **{_formatNum(peakValue)} ({peakVsCurrent:+.1f}%)**")

    # 3. Model Performance Note
    smapeScores = forecast.get("smape", {})
    if smapeScores:
        bestModel = min(smapeScores.items(), key=lambda x: x[1].get("smape", float("inf")))
        modelName, _ = bestModel
        insights.append(f"**{modelName} performed best on this dataset**")

    # 4. Average Projection
    if ensemble.get("yhat"):
        avgForecast = float(np.mean(ensemble["yhat"]))
        insights.append(f"Average projected value: **{_formatNum(avgForecast)}**")

    # 5. Confidence Interpretation (Executive Tone)
    smapeValue = 0
    if smapeScores:
        bestModel = min(smapeScores.values(), key=lambda x: x.get("smape", 100))
        smapeValue = bestModel.get("smape", 100)
    
    if smapeValue < 10:
        insights.append("High confidence driven by stable historical patterns and strong model agreement.")
    elif smapeValue < 20:
        insights.append("Stable confidence; model patterns align with recent trends.")
    else:
        insights.append("Moderate confidence; expect variance due to shifting pattern dynamics.")

    return insights[:5]