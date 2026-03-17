from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd


class EtsError(ValueError):
    pass


def _infer_monthly_freq(index: pd.DatetimeIndex) -> str:
    freq = pd.infer_freq(index)
    if freq:
        return freq
    # Fallback: monthly start is the expected pipeline output
    return "MS"


def _future_dates(last_date: pd.Timestamp, periods: int, freq: str) -> list[str]:
    start = last_date
    # If monthly, advance one period for the first forecast point
    future = pd.date_range(start=start, periods=periods + 1, freq=freq)[1:]
    return [d.isoformat() for d in future.to_pydatetime()]


def _select_seasonal_mode(y: pd.Series) -> str:
    # multiplicative fails with zeros / negatives
    if (y <= 0).any():
        return "add"
    return "mul"


def _try_statsmodels_fit_forecast(
    y: pd.Series,
    horizon: int,
    seasonal_periods: int,
    seasonal: str,
) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    Returns (yhat, fittedvalues) if statsmodels is available, else None.
    """
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing  # type: ignore
    except Exception:
        return None

    model = ExponentialSmoothing(
        y.astype(float),
        trend="add",
        seasonal=seasonal,
        seasonal_periods=seasonal_periods,
        initialization_method="estimated",
    )
    fitted = model.fit(optimized=True)
    yhat = fitted.forecast(horizon).to_numpy(dtype=float)
    fitted_values = fitted.fittedvalues.to_numpy(dtype=float)
    return yhat, fitted_values


@dataclass
class _HwParams:
    alpha: float = 0.25
    beta: float = 0.05
    gamma: float = 0.2


def _hw_fit_forecast_add(
    y: np.ndarray, horizon: int, seasonal_periods: int, params: _HwParams
) -> Tuple[np.ndarray, np.ndarray]:
    n = len(y)
    m = seasonal_periods

    level = np.mean(y[:m])
    trend = (np.mean(y[m : 2 * m]) - np.mean(y[:m])) / m if n >= 2 * m else 0.0
    seasonals = np.zeros(m, dtype=float)
    for i in range(m):
        seasonals[i] = y[i] - level

    fitted = np.full(n, np.nan, dtype=float)
    for t in range(n):
        s = seasonals[t % m]
        fitted[t] = level + trend + s
        value = y[t]
        prev_level = level
        level = params.alpha * (value - s) + (1 - params.alpha) * (level + trend)
        trend = params.beta * (level - prev_level) + (1 - params.beta) * trend
        seasonals[t % m] = params.gamma * (value - level) + (1 - params.gamma) * s

    yhat = np.zeros(horizon, dtype=float)
    for h in range(1, horizon + 1):
        yhat[h - 1] = level + h * trend + seasonals[(n + h - 1) % m]
    return yhat, fitted


def _hw_fit_forecast_mul(
    y: np.ndarray, horizon: int, seasonal_periods: int, params: _HwParams
) -> Tuple[np.ndarray, np.ndarray]:
    n = len(y)
    m = seasonal_periods

    level = np.mean(y[:m])
    trend = (np.mean(y[m : 2 * m]) - np.mean(y[:m])) / m if n >= 2 * m else 0.0
    seasonals = np.ones(m, dtype=float)
    for i in range(m):
        seasonals[i] = y[i] / level if level != 0 else 1.0

    fitted = np.full(n, np.nan, dtype=float)
    for t in range(n):
        s = seasonals[t % m]
        fitted[t] = (level + trend) * s
        value = y[t]
        prev_level = level
        # avoid divide-by-zero if s==0; clamp
        s_safe = s if s != 0 else 1e-9
        level = params.alpha * (value / s_safe) + (1 - params.alpha) * (level + trend)
        trend = params.beta * (level - prev_level) + (1 - params.beta) * trend
        denom = level if level != 0 else 1e-9
        seasonals[t % m] = params.gamma * (value / denom) + (1 - params.gamma) * s

    yhat = np.zeros(horizon, dtype=float)
    for h in range(1, horizon + 1):
        yhat[h - 1] = (level + h * trend) * seasonals[(n + h - 1) % m]
    return yhat, fitted


def ets_forecast(
    series: pd.Series,
    *,
    horizon: int,
    seasonal_periods: int = 12,
) -> Dict[str, Any]:
    """
    Holt-Winters ETS-style seasonal baseline.

    If statsmodels is available, we wrap ExponentialSmoothing.
    Otherwise we use a lightweight in-house Holt-Winters implementation.
    """
    if not isinstance(series, pd.Series):
        raise EtsError("series must be a pandas Series")
    if len(series) < 12:
        raise EtsError("ETS requires at least 12 rows to model seasonality")
    if horizon < 1:
        raise EtsError("horizon must be >= 1")
    if not isinstance(series.index, pd.DatetimeIndex):
        raise EtsError("series index must be a pandas DatetimeIndex")

    y = series.astype(float)
    seasonal_mode = _select_seasonal_mode(y)
    last_date = series.index.max()
    freq = _infer_monthly_freq(series.index)
    dates = _future_dates(last_date, horizon, freq)

    sm = _try_statsmodels_fit_forecast(
        y=y,
        horizon=horizon,
        seasonal_periods=seasonal_periods,
        seasonal="add" if seasonal_mode == "add" else "mul",
    )
    if sm is not None:
        yhat, fitted_values = sm
    else:
        params = _HwParams()
        y_np = y.to_numpy(dtype=float)
        if seasonal_mode == "add":
            yhat, fitted_values = _hw_fit_forecast_add(y_np, horizon, seasonal_periods, params)
        else:
            yhat, fitted_values = _hw_fit_forecast_mul(y_np, horizon, seasonal_periods, params)

    resid = y.to_numpy(dtype=float) - fitted_values
    resid = resid[np.isfinite(resid)]
    resid_std = float(np.std(resid, ddof=1)) if resid.size >= 2 else 0.0
    band = 1.96 * resid_std

    yhat = yhat.astype(float)
    out = {
        "dates": dates,
        "yhat": yhat.tolist(),
        "yhat_lower": (yhat - band).tolist(),
        "yhat_upper": (yhat + band).tolist(),
        "model": "ETS",
    }
    return out

