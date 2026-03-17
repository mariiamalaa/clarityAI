from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

from src.models.ets import ets_forecast, EtsError


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


def run_backtests(series: pd.Series, *, horizon: int, models: List[str]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    for name in models:
        if name.upper() == "ETS":
            results["ETS"] = backtest_ets(series, horizon=horizon)
        else:
            raise ValueError(f"Unknown model '{name}'")
    return results

