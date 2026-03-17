from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

from src.models.ets import ets_forecast, EtsError
from src.models.theta import theta_forecast, ThetaUnavailable, ThetaError
from src.models.xgb import xgb_forecast, XgbUnavailable, XgbError


def backtest_ets(
    series: pd.Series,
    *,
    horizon: int,
    seasonal_periods: int = 12,
) -> Dict[str, Any]:
    """
    Minimal backtesting entrypoint for ETS.
    Week-2 ready: provides a clean hook for adding more models later.
    """
    if len(series) < 12:
        raise EtsError("ETS requires at least 12 rows to backtest")

    forecast = ets_forecast(series, horizon=horizon, seasonal_periods=seasonal_periods)
    return {
        "model": "ETS",
        "forecast": forecast,
    }


def backtestTheta(
    series: pd.Series,
    *,
    horizon: int,
    alpha: float = 0.05,
) -> Dict[str, Any]:
    if len(series) < 3:
        raise ThetaError("Theta requires at least 3 rows to backtest")

    forecast = theta_forecast(series, horizon=horizon, alpha=alpha)
    return {
        "model": "Theta",
        "forecast": forecast,
    }


def backtest_theta(series: pd.Series, *, horizon: int, alpha: float = 0.05) -> Dict[str, Any]:
    return backtestTheta(series, horizon=horizon, alpha=alpha)


def backtestXgb(
    series: pd.Series,
    *,
    horizon: int,
    nLags: int = 12,
    searchIter: int = 20,
) -> Dict[str, Any]:
    if len(series) <= nLags:
        raise XgbError("XGB requires more rows than nLags to backtest")

    forecast = xgb_forecast(series, horizon=horizon, n_lags=nLags, search_iter=searchIter)
    return {
        "model": "XGB",
        "forecast": forecast,
    }


def backtest_xgb(series: pd.Series, *, horizon: int, n_lags: int = 12, search_iter: int = 20) -> Dict[str, Any]:
    return backtestXgb(series, horizon=horizon, nLags=n_lags, searchIter=search_iter)


def run_backtests(series: pd.Series, *, horizon: int, models: List[str]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    for name in models:
        if name.upper() == "ETS":
            results["ETS"] = backtest_ets(series, horizon=horizon)
        elif name.upper() == "THETA":
            try:
                results["THETA"] = backtestTheta(series, horizon=horizon)
            except ThetaUnavailable:
                # Gracefully skip if statsmodels is missing/too old for ThetaModel.
                continue
        elif name.upper() in ("XGB", "XGBOOST"):
            try:
                results["XGB"] = backtestXgb(series, horizon=horizon)
            except XgbUnavailable:
                continue
        else:
            raise ValueError(f"Unknown model '{name}'")
    return results

