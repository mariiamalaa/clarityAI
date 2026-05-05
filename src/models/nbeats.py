from __future__ import annotations

from typing import Any, Dict
import os

import pandas as pd

MIN_NBEATS_MONTHS = 36


class NbeatsUnavailable(RuntimeError):
    pass


class NbeatsError(ValueError):
    pass


# macOS OpenMP collisions can occur when running XGBoost and torch in one process.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")


def _inferMonthlyFreq(index: pd.DatetimeIndex) -> str:
    freq = pd.infer_freq(index)
    if freq:
        return freq
    return "MS"


def _futureDates(lastDate: pd.Timestamp, periods: int, freq: str) -> list[str]:
    future = pd.date_range(start=lastDate, periods=periods + 1, freq=freq)[1:]
    return [d.isoformat() for d in future.to_pydatetime()]


def _seriesToNeuralDf(series: pd.Series, *, uniqueId: str = "series") -> pd.DataFrame:
    return pd.DataFrame(
        {
            "unique_id": uniqueId,
            "ds": series.index,
            "y": series.astype(float).values,
        }
    )


def nbeatsForecast(
    series: pd.Series,
    *,
    horizon: int,
    randomState: int = 42,
    level: int = 95,
    maxSteps: int = 80,
) -> Dict[str, Any]:
    """
    N-BEATS forecast via neuralforecast. Requires at least 36 monthly observations.
    Uses conformal 95% intervals (configurable via ``level``).
    """
    if not isinstance(series, pd.Series):
        raise NbeatsError("series must be a pandas Series")
    if horizon < 1:
        raise NbeatsError("horizon must be >= 1")
    if not isinstance(series.index, pd.DatetimeIndex):
        raise NbeatsError("series index must be a pandas DatetimeIndex")
    if len(series) < MIN_NBEATS_MONTHS:
        raise ValueError(
            f"N-BEATS requires at least {MIN_NBEATS_MONTHS} monthly observations; got {len(series)}"
        )

    try:
        from neuralforecast import NeuralForecast
        from neuralforecast.losses.pytorch import MAE
        from neuralforecast.models import NBEATS
        from neuralforecast.utils import PredictionIntervals
        import torch
    except Exception as e:  # pragma: no cover
        raise NbeatsUnavailable("neuralforecast (or its dependencies) is not available") from e

    try:
        torch.set_num_threads(1)
        if hasattr(torch, "set_num_interop_threads"):
            torch.set_num_interop_threads(1)
    except Exception:
        # Thread tuning is best-effort and should never block forecasts.
        pass

    y = series.astype(float)
    df = _seriesToNeuralDf(y)
    freq = _inferMonthlyFreq(series.index)
    inputSize = 2 * int(horizon)
    steps = int(maxSteps)
    if steps < 1:
        raise NbeatsError("maxSteps must be >= 1")

    model = NBEATS(
        h=int(horizon),
        input_size=inputSize,
        max_steps=steps,
        loss=MAE(),
        random_seed=int(randomState),
        batch_size=1,
        val_check_steps=steps,
        enable_progress_bar=False,
        logger=False,
        accelerator="cpu",
        devices=1,
    )
    nf = NeuralForecast(models=[model], freq=freq)

    try:
        nf.fit(
            df,
            prediction_intervals=PredictionIntervals(n_windows=2, method="conformal_distribution"),
        )
        fcst = nf.predict(df=df, h=int(horizon), level=[int(level)])
    except Exception as e:
        raise NbeatsError(f"N-BEATS training or prediction failed: {e}") from e

    col = "NBEATS"
    loCol = f"{col}-lo-{level}"
    hiCol = f"{col}-hi-{level}"
    if loCol not in fcst.columns or hiCol not in fcst.columns:
        raise NbeatsError("N-BEATS forecast missing conformal interval columns")

    fcst = fcst.sort_values("ds")
    yhat = fcst[col].to_numpy(dtype=float)
    lower = fcst[loCol].to_numpy(dtype=float)
    upper = fcst[hiCol].to_numpy(dtype=float)

    lastDate = series.index.max()
    dates = _futureDates(lastDate, int(horizon), freq)

    return {
        "dates": dates,
        "yhat": yhat.tolist(),
        "yhat_lower": lower.tolist(),
        "yhat_upper": upper.tolist(),
        "model": "N-BEATS",
    }


