from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

from src.models.ets import etsForecast, EtsError
from src.models.nbeats import nbeatsForecast, NbeatsUnavailable
from src.models.theta import thetaForecast, ThetaUnavailable, ThetaError
from src.models.xgb import xgbForecast, XgbUnavailable, XgbError


def _isNbeatsModelName(name: str) -> bool:
    n = name.upper().strip().replace("_", "-")
    return n in ("N-BEATS", "NBEATS")


def backtestEts(
    series: pd.Series,
    *,
    horizon: int,
    seasonalPeriods: int = 12,
) -> Dict[str, Any]:
    """Minimal backtesting entrypoint for ETS."""
    if len(series) < 12:
        raise EtsError("ETS requires at least 12 rows to backtest")
    forecast = etsForecast(series, horizon=horizon, seasonal_periods=seasonalPeriods)
    return {"model": "ETS", "forecast": forecast}


def backtestTheta(
    series: pd.Series,
    *,
    horizon: int,
    alpha: float = 0.05,
) -> Dict[str, Any]:
    if len(series) < 3:
        raise ThetaError("Theta requires at least 3 rows to backtest")
    forecast = thetaForecast(series, horizon=horizon, alpha=alpha)
    return {"model": "Theta", "forecast": forecast}


def backtestXgb(
    series: pd.Series,
    *,
    horizon: int,
    nLags: int = 12,
    searchIter: int = 20,
) -> Dict[str, Any]:
    if len(series) <= nLags:
        raise XgbError("XGB requires more rows than nLags to backtest")
    forecast = xgbForecast(series, horizon=horizon, nLags=nLags, searchIter=searchIter)
    return {"model": "XGB", "forecast": forecast}


def backtestNbeats(
    series: pd.Series,
    *,
    horizon: int,
    randomState: int = 42,
    maxSteps: int = 80,
) -> Dict[str, Any]:
    forecast = nbeatsForecast(series, horizon=horizon, randomState=randomState, maxSteps=maxSteps)
    return {"model": "N-BEATS", "forecast": forecast}


def runBacktests(series: pd.Series, *, horizon: int, models: List[str]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    for name in models:
        if name.upper() == "ETS":
            results["ETS"] = backtestEts(series, horizon=horizon)
        elif name.upper() == "THETA":
            try:
                results["THETA"] = backtestTheta(series, horizon=horizon)
            except ThetaUnavailable:
                continue
        elif name.upper() in ("XGB", "XGBOOST"):
            try:
                results["XGB"] = backtestXgb(series, horizon=horizon)
            except XgbUnavailable:
                continue
        elif _isNbeatsModelName(name):
            try:
                results["N-BEATS"] = backtestNbeats(series, horizon=horizon)
            except NbeatsUnavailable:
                continue
            except ValueError:
                # Short history (< 36 months); skip without failing the job.
                continue
        else:
            raise ValueError(f"Unknown model '{name}'")
    return results


# ---------- backwards-compatible snake_case aliases ----------
def run_backtests(series: pd.Series, *, horizon: int, models: List[str]) -> Dict[str, Any]:
    return runBacktests(series, horizon=horizon, models=models)

def backtest_ets(series: pd.Series, *, horizon: int, seasonal_periods: int = 12) -> Dict[str, Any]:
    return backtestEts(series, horizon=horizon, seasonalPeriods=seasonal_periods)

def backtest_theta(series: pd.Series, *, horizon: int, alpha: float = 0.05) -> Dict[str, Any]:
    return backtestTheta(series, horizon=horizon, alpha=alpha)

def backtest_xgb(series: pd.Series, *, horizon: int, n_lags: int = 12, search_iter: int = 20) -> Dict[str, Any]:
    return backtestXgb(series, horizon=horizon, nLags=n_lags, searchIter=search_iter)

def backtest_nbeats(series: pd.Series, *, horizon: int, random_state: int = 42, max_steps: int = 200) -> Dict[str, Any]:
    return backtestNbeats(series, horizon=horizon, randomState=random_state, maxSteps=max_steps)
