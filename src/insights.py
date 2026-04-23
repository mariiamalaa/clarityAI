from __future__ import annotations

from typing import List, Dict, Any
import numpy as np

__all__ = ["generate_insights"]


def generate_insights(
    forecast: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    changepoints: List[Dict[str, Any]],
    model_weights: Dict[str, float]
) -> List[str]:
    """
    Generate plain-English insights from forecast and anomaly data.

    Returns a list of insight strings, typically 4-6 items.
    """
    insights = []

    # Insight 1: Trend direction and % over horizon
    ensemble = forecast.get("ensemble", {})
    history = forecast.get("history", {})
    horizon = forecast.get("horizon", 6)

    if ensemble.get("yhat") and history.get("y"):
        actuals = np.array(history["y"])
        forecasts = np.array(ensemble["yhat"])

        # Calculate trend over forecast horizon
        if len(forecasts) >= horizon:
            start_value = forecasts[0]
            end_value = forecasts[horizon - 1]
            trend_pct = ((end_value - start_value) / abs(start_value)) * 100

            direction = "upward" if trend_pct > 0 else "downward"
            insights.append(f"Forecast shows {direction} trend of {abs(trend_pct):.1f}% over next {horizon} months")

    # Insight 2: Peak month and value vs current
    if ensemble.get("yhat") and ensemble.get("dates"):
        forecasts = ensemble["yhat"]
        dates = ensemble["dates"]

        peak_idx = np.argmax(forecasts)
        peak_value = forecasts[peak_idx]
        peak_date = dates[peak_idx]

        # Compare to last actual
        if history.get("y"):
            last_actual = history["y"][-1]
            peak_vs_current = ((peak_value - last_actual) / abs(last_actual)) * 100

            try:
                from dateutil import parser
                peak_month = parser.parse(peak_date).strftime("%B %Y")
                insights.append(f"Peak forecasted in {peak_month} at {peak_value:.1f} ({peak_vs_current:+.1f}% vs current)")
            except:
                insights.append(f"Peak forecasted at {peak_value:.1f} ({peak_vs_current:+.1f}% vs current)")

    # Insight 3: Anomaly summary (skip if none)
    if anomalies:
        high_count = sum(1 for a in anomalies if a.get("severity") == "high")
        medium_count = sum(1 for a in anomalies if a.get("severity") == "medium")
        low_count = sum(1 for a in anomalies if a.get("severity") == "low")

        total_anomalies = len(anomalies)
        insights.append(f"Detected {total_anomalies} anomalies ({high_count} high, {medium_count} medium, {low_count} low severity)")

    # Insight 4: Changepoint summary (skip if none)
    if changepoints:
        total_changes = len(changepoints)
        avg_shift = np.mean([abs(cp.get("shift_pct", 0)) for cp in changepoints])

        insights.append(f"Found {total_changes} structural changepoints with average {avg_shift:.1f}% shift in data patterns")

    # Insight 5: Best model name and SMAPE accuracy
    smape_scores = forecast.get("smape", {})
    if smape_scores:
        best_model = min(smape_scores.items(), key=lambda x: x[1].get("smape", float('inf')))
        model_name, metrics = best_model
        smape_value = metrics.get("smape", 0)
        accuracy = max(0, 100 - smape_value)  # SMAPE accuracy approximation

        insights.append(f"Best performing model is {model_name} with {accuracy:.1f}% forecast accuracy")

    # Insight 6: Uncertainty flag if band > 20% of yhat (conditional)
    if ensemble.get("yhat") and ensemble.get("yhat_lower") and ensemble.get("yhat_upper"):
        forecasts = np.array(ensemble["yhat"])
        lower_bounds = np.array(ensemble["yhat_lower"])
        upper_bounds = np.array(ensemble["yhat_upper"])

        # Calculate average band width as percentage of forecast
        band_widths = upper_bounds - lower_bounds
        avg_band_pct = np.mean(band_widths / np.abs(forecasts)) * 100

        if avg_band_pct > 20:
            insights.append(f"High forecast uncertainty with {avg_band_pct:.1f}% average confidence band width")

    # Ensure we have at least 4 insights, pad with generic ones if needed
    if len(insights) < 4:
        if ensemble.get("yhat"):
            avg_forecast = np.mean(ensemble["yhat"])
            insights.append(f"Average forecasted value is {avg_forecast:.1f} over the prediction horizon")

    return insights[:6]  # Limit to 6 insights max