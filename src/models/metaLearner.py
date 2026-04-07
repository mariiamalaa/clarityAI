from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
from sklearn.linear_model import Ridge


def _toPercentWeights(rawWeights: Dict[str, float]) -> Dict[str, int]:
    if not rawWeights:
        return {}

    models = list(rawWeights.keys())
    vals = np.asarray([max(0.0, float(rawWeights[m])) for m in models], dtype=float)

    if vals.sum() <= 0:
        vals = np.ones(len(models), dtype=float)

    if len(models) > 1:
        vals = vals + 1e-6

    vals = vals / vals.sum()
    pct = vals * 100.0

    rounded = np.floor(pct).astype(int)
    remainder = 100 - int(rounded.sum())
    order = np.argsort(-(pct - rounded))
    for i in range(max(0, remainder)):
        rounded[order[i % len(models)]] += 1

    return {m: int(v) for m, v in zip(models, rounded.tolist())}


def trainMetaLearner(
    backtestPredictions: Dict[str, List[float]],
    actuals: List[float],
    *,
    alpha: float = 1.0,
) -> Dict[str, Any]:
    modelNames = [m for m, preds in backtestPredictions.items() if len(preds) == len(actuals)]
    if len(modelNames) < 2:
        equal = (
            {m: 1.0 / len(modelNames) for m in modelNames}
            if modelNames
            else {}
        )
        return {
            "modelNames": modelNames,
            "weights": equal,
            "percentWeights": _toPercentWeights(equal),
            "ridge": None,
            "fallbackEqualWeight": True,
        }

    x = np.column_stack([np.asarray(backtestPredictions[m], dtype=float) for m in modelNames])
    y = np.asarray(actuals, dtype=float)

    ridge = Ridge(alpha=alpha)
    ridge.fit(x, y)

    coef = np.asarray(ridge.coef_, dtype=float)
    coef = np.abs(coef)
    if coef.sum() <= 0:
        coef = np.ones_like(coef, dtype=float)
    coef = coef / coef.sum()
    weights = {m: float(w) for m, w in zip(modelNames, coef.tolist())}

    return {
        "modelNames": modelNames,
        "weights": weights,
        "percentWeights": _toPercentWeights(weights),
        "ridge": ridge,
        "fallbackEqualWeight": False,
    }


def ensembleForecastWithMetaLearner(
    futureForecasts: Dict[str, Dict[str, Any]],
    metaModel: Dict[str, Any],
) -> Dict[str, Any]:
    modelNames: List[str] = [
        m
        for m in metaModel.get("modelNames", [])
        if m in futureForecasts
    ]
    if not modelNames:
        return {}

    first = futureForecasts[modelNames[0]]
    dates = first.get("dates", [])
    horizon = len(dates)

    def _stack(key: str) -> np.ndarray:
        return np.column_stack(
            [np.asarray(futureForecasts[m].get(key, []), dtype=float)[:horizon] for m in modelNames]
        )

    yhatX = _stack("yhat")
    yhatLowerX = _stack("yhat_lower")
    yhatUpperX = _stack("yhat_upper")

    ridge = metaModel.get("ridge")
    if ridge is not None:
        yhat = ridge.predict(yhatX)
    else:
        w = np.asarray([metaModel["weights"][m] for m in modelNames], dtype=float)
        yhat = yhatX @ w

    w = np.asarray([metaModel["weights"][m] for m in modelNames], dtype=float)
    yhatLower = yhatLowerX @ w
    yhatUpper = yhatUpperX @ w

    return {
        "dates": dates,
        "yhat": yhat.tolist(),
        "yhat_lower": yhatLower.tolist(),
        "yhat_upper": yhatUpper.tolist(),
        "model": "Ensemble",
        "modelWeights": metaModel.get("percentWeights", {}),
        "model_weights": metaModel.get("percentWeights", {}),
    }
