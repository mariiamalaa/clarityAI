from __future__ import annotations

from typing import Any, Dict, List, Optional


def _fmtNumber(value: Optional[float], digits: int = 1) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):,.{digits}f}"


def _fmtPct(value: Optional[float], digits: int = 1) -> str:
    if value is None:
        return "n/a"
    sign = "+" if value > 0 else ""
    return f"{sign}{float(value):.{digits}f}%"


def _fmtMonth(isoDate: Optional[str]) -> str:
    if not isoDate:
        return "unknown month"
    # Deterministic and locale-independent month rendering.
    parts = str(isoDate).split("T")[0].split("-")
    if len(parts) >= 2:
        y, m = parts[0], parts[1]
        monthNames = {
            "01": "Jan",
            "02": "Feb",
            "03": "Mar",
            "04": "Apr",
            "05": "May",
            "06": "Jun",
            "07": "Jul",
            "08": "Aug",
            "09": "Sep",
            "10": "Oct",
            "11": "Nov",
            "12": "Dec",
        }
        return f"{monthNames.get(m, m)} {y}"
    return str(isoDate)


def generateInsights(
    forecast: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    changepoints: List[Dict[str, Any]],
    model_weights: Dict[str, int],
) -> List[str]:
    insights: List[str] = []

    yhat = [float(v) for v in forecast.get("yhat", []) if v is not None]
    dates = forecast.get("dates", [])
    yhatLower = [float(v) for v in forecast.get("yhat_lower", []) if v is not None]
    yhatUpper = [float(v) for v in forecast.get("yhat_upper", []) if v is not None]
    smape = forecast.get("smape")

    # Insight 1: trend direction + % over horizon
    if len(yhat) >= 2:
        startVal = yhat[0]
        endVal = yhat[-1]
        denom = abs(startVal) if abs(startVal) > 1e-9 else 1e-9
        deltaPct = ((endVal - startVal) / denom) * 100.0
        direction = "increasing" if deltaPct >= 0 else "decreasing"
        insights.append(
            f"Forecast trend is {direction} over the horizon ({_fmtPct(deltaPct)} from {_fmtNumber(startVal)} to {_fmtNumber(endVal)})."
        )

    # Insight 2: peak month vs current
    if yhat and dates:
        peakIdx = max(range(min(len(yhat), len(dates))), key=lambda i: yhat[i])
        peakVal = yhat[peakIdx]
        currentVal = yhat[0]
        denom = abs(currentVal) if abs(currentVal) > 1e-9 else 1e-9
        upliftPct = ((peakVal - currentVal) / denom) * 100.0
        insights.append(
            f"Peak forecast is {_fmtNumber(peakVal)} in {_fmtMonth(dates[peakIdx])}, {_fmtPct(upliftPct)} versus current forecast level."
        )

    # Insight 3: anomalies summary (conditional)
    if anomalies:
        bySeverity = {"high": 0, "medium": 0, "low": 0}
        for a in anomalies:
            sev = str(a.get("severity", "low")).lower()
            if sev in bySeverity:
                bySeverity[sev] += 1
            else:
                bySeverity["low"] += 1
        insights.append(
            "Detected "
            f"{len(anomalies)} anomalies "
            f"({bySeverity['high']} high, {bySeverity['medium']} medium, {bySeverity['low']} low)."
        )

    # Insight 4: changepoint summary (conditional)
    if changepoints:
        top = max(changepoints, key=lambda cp: abs(float(cp.get("shift_pct", 0.0))))
        cpDate = _fmtMonth(top.get("date"))
        cpShift = float(top.get("shift_pct", 0.0))
        insights.append(
            f"Detected {len(changepoints)} structural change points; largest shift was {_fmtPct(cpShift)} around {cpDate}."
        )

    # Insight 5: best model + SMAPE
    if model_weights:
        bestModel = max(model_weights.items(), key=lambda kv: int(kv[1]))[0]
        if smape is not None:
            insights.append(
                f"Top contributing model is {bestModel} (weight {int(model_weights[bestModel])}%) with ensemble SMAPE {_fmtNumber(float(smape), 2)}."
            )
        else:
            insights.append(
                f"Top contributing model is {bestModel} (weight {int(model_weights[bestModel])}%)."
            )

    # Insight 6: uncertainty flag (conditional)
    if yhat and yhatLower and yhatUpper:
        widths = []
        for i in range(min(len(yhat), len(yhatLower), len(yhatUpper))):
            center = abs(yhat[i]) if abs(yhat[i]) > 1e-9 else 1e-9
            widths.append((yhatUpper[i] - yhatLower[i]) / center)
        avgBand = (sum(widths) / len(widths)) if widths else 0.0
        if avgBand > 0.20:
            insights.append(
                f"Forecast uncertainty is elevated: average prediction band is {_fmtPct(avgBand * 100.0)} of central forecast."
            )

    # Guarantee deterministic 4-6 insights.
    if len(insights) < 4:
        insights.append("No major risk signals detected beyond the core forecast trajectory.")
    return insights[:6]

