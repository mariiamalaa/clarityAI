from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd


def stlResiduals(
    series: pd.Series,
    *,
    seasonalPeriod: int = 12,
) -> Dict[str, List[float]]:
    cleanSeries = series.astype(float).dropna().sort_index()
    if cleanSeries.empty:
        return {"dates": [], "actual": [], "expected": [], "residual": [], "zscore": []}

    expected: np.ndarray
    try:
        from statsmodels.tsa.seasonal import STL

        robustSeasonal = max(3, int(seasonalPeriod))
        stl = STL(cleanSeries.to_numpy(dtype=float), period=robustSeasonal, robust=True)
        fit = stl.fit()
        expected = np.asarray(fit.trend + fit.seasonal, dtype=float)
    except Exception:
        # Fallback when STL is unavailable: smooth baseline preserves endpoint stability.
        expected = (
            cleanSeries.rolling(window=max(3, seasonalPeriod), center=True, min_periods=1).mean().to_numpy(dtype=float)
        )

    actual = cleanSeries.to_numpy(dtype=float)
    residual = actual - expected
    std = float(np.std(residual))
    if std <= 1e-9:
        zscore = np.zeros_like(residual, dtype=float)
    else:
        zscore = residual / std

    return {
        "dates": [d.isoformat() if hasattr(d, "isoformat") else str(d) for d in cleanSeries.index],
        "actual": actual.tolist(),
        "expected": expected.tolist(),
        "residual": residual.tolist(),
        "zscore": zscore.tolist(),
    }


def detectAnomalies(
    stlOutput: Dict[str, List[float]],
    *,
    zThreshold: float = 2.5,
) -> List[Dict[str, Any]]:
    dates = stlOutput.get("dates", [])
    actual = stlOutput.get("actual", [])
    expected = stlOutput.get("expected", [])
    residual = stlOutput.get("residual", [])
    zscore = stlOutput.get("zscore", [])

    n = min(len(dates), len(actual), len(expected), len(residual), len(zscore))
    anomalies: List[Dict[str, Any]] = []
    for i in range(n):
        z = float(zscore[i])
        absZ = abs(z)
        if absZ < zThreshold:
            continue
        if absZ > 3.5:
            severity = "high"
        elif absZ > 2.5:
            severity = "medium"
        else:
            severity = "low"
        anomalies.append(
            {
                "date": dates[i],
                "actual": float(actual[i]),
                "expected": float(expected[i]),
                "residual": float(residual[i]),
                "zscore": z,
                "detectors": ["stlResidualZScore"],
                "severity": severity,
            }
        )
    return anomalies


def stl_residuals(series: pd.Series, *, seasonal_period: int = 12) -> Dict[str, List[float]]:
    return stlResiduals(series, seasonalPeriod=seasonal_period)


def detect_anomalies(
    stl_output: Dict[str, List[float]],
    *,
    z_threshold: float = 2.5,
) -> List[Dict[str, Any]]:
    return detectAnomalies(stl_output, zThreshold=z_threshold)
