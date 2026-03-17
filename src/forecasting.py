from __future__ import annotations

from typing import Tuple

import numpy as np
import pandas as pd


def _make_supervised(series: pd.Series, *, n_lags: int) -> Tuple[np.ndarray, np.ndarray]:
    """
    Turn a univariate time series into a supervised learning dataset using lag features.

    Returns (X, y) where:
    - X is shape (n_samples, n_lags)
    - y is shape (n_samples,)
    """
    if not isinstance(series, pd.Series):
        raise TypeError("series must be a pandas Series")
    if n_lags < 1:
        raise ValueError("n_lags must be >= 1")
    if len(series) <= n_lags:
        raise ValueError("series is too short for the requested number of lags")

    y = series.astype(float)
    df = pd.concat({f"lag_{k}": y.shift(k) for k in range(1, n_lags + 1)}, axis=1)
    df["target"] = y
    df = df.dropna()

    X = df[[f"lag_{k}" for k in range(1, n_lags + 1)]].to_numpy(dtype=float)
    yArr = df["target"].to_numpy(dtype=float)
    return X, yArr


def makeSupervised(series: pd.Series, *, nLags: int) -> Tuple[np.ndarray, np.ndarray]:
    return _make_supervised(series, n_lags=nLags)

