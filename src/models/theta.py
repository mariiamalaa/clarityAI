from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd


class ThetaUnavailable(RuntimeError):
    pass


class ThetaError(ValueError):
    pass


def _inferMonthlyFreq(index: pd.DatetimeIndex) -> str:
    freq = pd.infer_freq(index)
    if freq:
        return freq
    return "MS"


def _futureDates(lastDate: pd.Timestamp, periods: int, freq: str) -> list[str]:
    future = pd.date_range(start=lastDate, periods=periods + 1, freq=freq)[1:]
    return [d.isoformat() for d in future.to_pydatetime()]


def _getThetaModel() -> Tuple[Any, Optional[str]]:
    """
    Returns (ThetaModelClass, versionString) or raises ThetaUnavailable.
    """
    try:
        from statsmodels.tsa.forecasting.theta import ThetaModel  # type: ignore
    except Exception as e:  # pragma: no cover
        raise ThetaUnavailable(
            "statsmodels ThetaModel not available (statsmodels missing or too old)"
        ) from e

    versionString: Optional[str] = None
    try:
        import statsmodels  # type: ignore

        versionString = getattr(statsmodels, "__version__", None)
    except Exception:
        versionString = None

    return ThetaModel, versionString


def _fitForecastWithIntervals(
    series: pd.Series,
    horizon: int,
    *,
    alpha: float,
    seasonalPeriod: Optional[int],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    ThetaModel, _ = _getThetaModel()

    y = series.astype(float)
    if seasonalPeriod is not None:
        try:
            model = ThetaModel(y, period=int(seasonalPeriod))
        except TypeError:
            model = ThetaModel(y)
    else:
        model = ThetaModel(y)
    results = model.fit()

    if not hasattr(results, "get_forecast"):
        raise ThetaUnavailable("statsmodels ThetaModel result missing get_forecast (too old)")

    forecastRes = results.get_forecast(steps=horizon)

    predicted = getattr(forecastRes, "predicted_mean", None)
    if predicted is None:
        raise ThetaError("Theta forecast did not provide predicted_mean")

    confInt = None
    if hasattr(forecastRes, "conf_int"):
        try:
            confInt = forecastRes.conf_int(alpha=alpha)
        except TypeError:
            confInt = forecastRes.conf_int()

    if confInt is None:
        raise ThetaUnavailable("Theta forecast confidence intervals not available in this statsmodels")

    if isinstance(confInt, pd.DataFrame):
        lower = confInt.iloc[:, 0].to_numpy(dtype=float)
        upper = confInt.iloc[:, 1].to_numpy(dtype=float)
    else:
        confIntArr = np.asarray(confInt, dtype=float)
        if confIntArr.ndim != 2 or confIntArr.shape[1] < 2:
            raise ThetaError("Theta conf_int returned unexpected shape")
        lower = confIntArr[:, 0]
        upper = confIntArr[:, 1]

    yhat = np.asarray(predicted, dtype=float)
    return yhat, np.asarray(lower, dtype=float), np.asarray(upper, dtype=float)


def thetaForecast(
    series: pd.Series,
    *,
    horizon: int,
    alpha: float = 0.05,
    seasonalPeriod: Optional[int] = 12,
) -> Dict[str, Any]:
    """
    Theta method forecast with statistically-derived prediction intervals
    (from statsmodels' ThetaModel forecast confidence intervals).
    """
    if not isinstance(series, pd.Series):
        raise ThetaError("series must be a pandas Series")
    if horizon < 1:
        raise ThetaError("horizon must be >= 1")
    if not isinstance(series.index, pd.DatetimeIndex):
        raise ThetaError("series index must be a pandas DatetimeIndex")
    if len(series) < 3:
        raise ThetaError("Theta requires at least 3 rows")

    lastDate = series.index.max()
    freq = _inferMonthlyFreq(series.index)
    dates = _futureDates(lastDate, horizon, freq)

    yhat, yhatLower, yhatUpper = _fitForecastWithIntervals(
        series, horizon, alpha=alpha, seasonalPeriod=seasonalPeriod
    )

    return {
        "dates": dates,
        "yhat": yhat.tolist(),
        "yhat_lower": yhatLower.tolist(),
        "yhat_upper": yhatUpper.tolist(),
        "model": "Theta",
    }


# Backwards-compatible alias (repo currently uses snake_case elsewhere)
def theta_forecast(series: pd.Series, *, horizon: int, alpha: float = 0.05) -> Dict[str, Any]:
    return thetaForecast(series, horizon=horizon, alpha=alpha)

