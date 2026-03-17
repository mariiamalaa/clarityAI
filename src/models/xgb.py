from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd

from src.forecasting import _make_supervised


class XgbUnavailable(RuntimeError):
    pass


class XgbError(ValueError):
    pass


def _inferMonthlyFreq(index: pd.DatetimeIndex) -> str:
    freq = pd.infer_freq(index)
    if freq:
        return freq
    return "MS"


def _futureDates(lastDate: pd.Timestamp, periods: int, freq: str) -> list[str]:
    future = pd.date_range(start=lastDate, periods=periods + 1, freq=freq)[1:]
    return [d.isoformat() for d in future.to_pydatetime()]


def _getXgb() -> Any:
    try:
        import xgboost  # type: ignore
    except Exception as e:  # pragma: no cover
        raise XgbUnavailable("xgboost is not installed") from e
    return xgboost


@dataclass(frozen=True)
class _SearchSpace:
    nEstimators: Tuple[int, ...] = (200, 400, 800, 1200)
    maxDepth: Tuple[int, ...] = (2, 3, 4, 5, 6, 8)
    learningRate: Tuple[float, ...] = (0.01, 0.03, 0.05, 0.1, 0.2)


def _calcRmse(yTrue: np.ndarray, yPred: np.ndarray) -> float:
    err = yTrue.astype(float) - yPred.astype(float)
    return float(np.sqrt(np.mean(err * err)))


def _trainValSplit(X: np.ndarray, y: np.ndarray, *, valFraction: float) -> Tuple[np.ndarray, ...]:
    if not (0.0 < valFraction < 0.5):
        raise ValueError("valFraction must be in (0, 0.5)")
    n = X.shape[0]
    nVal = max(1, int(round(n * valFraction)))
    nTrain = n - nVal
    if nTrain < 2:
        raise ValueError("not enough samples for train/val split")
    return X[:nTrain], y[:nTrain], X[nTrain:], y[nTrain:]


def _randomSearchFit(
    X: np.ndarray,
    y: np.ndarray,
    *,
    nIter: int,
    randomState: int,
    valFraction: float,
    space: _SearchSpace,
) -> Any:
    XTrain, yTrain, XVal, yVal = _trainValSplit(X, y, valFraction=valFraction)
    xgb = _getXgb()

    rng = np.random.default_rng(int(randomState))
    bestRmse = float("inf")
    bestModel: Optional[Any] = None

    for _ in range(int(nIter)):
        numBoostRound = int(rng.choice(space.nEstimators))
        params = {
            "objective": "reg:squarederror",
            "max_depth": int(rng.choice(space.maxDepth)),
            "eta": float(rng.choice(space.learningRate)),
            "subsample": float(rng.uniform(0.7, 1.0)),
            "colsample_bytree": float(rng.uniform(0.7, 1.0)),
            "min_child_weight": float(rng.uniform(1.0, 10.0)),
            "alpha": float(rng.uniform(0.0, 1.0)),
            "lambda": float(rng.uniform(0.5, 3.0)),
            "seed": int(randomState),
            "verbosity": 0,
            "nthread": 1,
        }

        dTrain = xgb.DMatrix(XTrain, label=yTrain)
        dVal = xgb.DMatrix(XVal, label=yVal)
        booster = xgb.train(params, dTrain, num_boost_round=numBoostRound)
        pred = booster.predict(dVal)
        score = _calcRmse(yVal, pred)
        if score < bestRmse:
            bestRmse = score
            bestModel = (booster, params, numBoostRound)

    if bestModel is None:
        raise XgbError("random search failed to produce a model")

    _, bestParams, bestRounds = bestModel
    dAll = xgb.DMatrix(X, label=y)
    finalBooster = xgb.train(bestParams, dAll, num_boost_round=int(bestRounds))
    return finalBooster


def _recursiveForecast(
    model: Any,
    *,
    lastWindow: np.ndarray,
    horizon: int,
) -> np.ndarray:
    xgb = _getXgb()
    window = np.asarray(lastWindow, dtype=float).copy()
    if window.ndim != 1:
        raise XgbError("lastWindow must be 1D")
    nLags = window.shape[0]
    preds = np.zeros(int(horizon), dtype=float)

    for h in range(int(horizon)):
        x = window.reshape(1, nLags)
        dm = xgb.DMatrix(x)
        yhat = float(model.predict(dm)[0])
        preds[h] = yhat
        window = np.roll(window, 1)
        window[0] = yhat
    return preds


def _residualStd(model: Any, X: np.ndarray, y: np.ndarray) -> float:
    xgb = _getXgb()
    d = xgb.DMatrix(X)
    pred = model.predict(d).astype(float)
    resid = y.astype(float) - pred
    if resid.size < 2:
        return 0.0
    return float(np.std(resid, ddof=1))


def xgbForecast(
    series: pd.Series,
    *,
    horizon: int,
    nLags: int = 12,
    searchIter: int = 20,
    valFraction: float = 0.2,
    randomState: int = 42,
) -> Dict[str, Any]:
    if not isinstance(series, pd.Series):
        raise XgbError("series must be a pandas Series")
    if horizon < 1:
        raise XgbError("horizon must be >= 1")
    if not isinstance(series.index, pd.DatetimeIndex):
        raise XgbError("series index must be a pandas DatetimeIndex")
    if len(series) <= nLags:
        raise XgbError("series too short for requested lag features")

    y = series.astype(float)
    X, ySup = _make_supervised(y, n_lags=int(nLags))

    model = _randomSearchFit(
        X,
        ySup,
        nIter=int(searchIter),
        randomState=int(randomState),
        valFraction=float(valFraction),
        space=_SearchSpace(),
    )

    residStd = _residualStd(model, X, ySup)
    band = 1.96 * residStd

    lastDate = series.index.max()
    freq = _inferMonthlyFreq(series.index)
    dates = _futureDates(lastDate, horizon, freq)

    lastWindow = y.iloc[-int(nLags) :].to_numpy(dtype=float)[::-1]
    yhat = _recursiveForecast(model, lastWindow=lastWindow, horizon=int(horizon))

    return {
        "dates": dates,
        "yhat": yhat.tolist(),
        "yhat_lower": (yhat - band).tolist(),
        "yhat_upper": (yhat + band).tolist(),
        "model": "XGB",
    }


def xgb_forecast(
    series: pd.Series,
    *,
    horizon: int,
    n_lags: int = 12,
    search_iter: int = 20,
    val_fraction: float = 0.2,
    random_state: int = 42,
) -> Dict[str, Any]:
    return xgbForecast(
        series,
        horizon=horizon,
        nLags=n_lags,
        searchIter=search_iter,
        valFraction=val_fraction,
        randomState=random_state,
    )

