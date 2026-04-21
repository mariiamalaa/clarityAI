"""Core forecast endpoint + async job tracking."""

from __future__ import annotations

from pathlib import Path
import sys
from threading import Thread
from typing import Optional, Any, Dict, List, Union

import numpy as np
import pandas as pd
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from api.jobs import createJob, getJob, serializeJob, setJob, setJobDone, setJobError

# Import from src modules (match existing router style)
projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))

from src.ioLoading import loadTable
from src.changePoints import detectChangePoints
from src.insights import generateInsights
from src.monthlyAggregation import coerce_date, enforce_monthly
from src.models.metaLearner import trainMetaLearner, ensembleForecastWithMetaLearner
from src.trainPipeline import run_backtests

router = APIRouter()

uploadsDir = Path(__file__).parent.parent.parent / "uploads"


class ForecastRequest(BaseModel):
    fileId: str = Field(alias="file_id")
    dateCol: str = Field(alias="date_col")
    metricCol: str = Field(alias="metric_col")
    groupCol: Optional[str] = Field(default=None, alias="group_col")
    horizon: int
    models: Union[str, List[str]] = "ensemble"

    model_config = {
        "populate_by_name": True,
    }


def _smape(yTrue: List[float], yPred: List[float]) -> float:
    yT = pd.Series(yTrue, dtype=float).to_numpy(dtype=float)
    yP = pd.Series(yPred, dtype=float).to_numpy(dtype=float)
    denom = np.abs(yT) + np.abs(yP)
    denom = np.where(denom == 0.0, 1e-9, denom)
    return float(200.0 * np.mean(np.abs(yP - yT) / denom))


def _normalizeModelToken(m: str) -> str:
    u = m.upper().strip().replace("_", "-")
    if u == "NBEATS":
        return "N-BEATS"
    return u


def _resolveModels(models: Union[str, List[str]]) -> List[str]:
    if isinstance(models, list):
        return [_normalizeModelToken(m) for m in models]
    key = str(models).lower().strip()
    if key in ("ensemble", "all", ""):
        return ["ETS", "THETA", "XGB", "N-BEATS"]
    if key == "classical":
        return ["ETS", "THETA"]
    if key == "ml":
        return ["XGB"]
    return [_normalizeModelToken(key)]


def _findUploadPath(fileId: str) -> Path:
    for ext in [".csv", ".xlsx", ".xls"]:
        candidatePath = uploadsDir / f"{fileId}{ext}"
        if candidatePath.exists():
            return candidatePath
    raise FileNotFoundError("File not found")


def _runForecastJob(jobId: str, payload: ForecastRequest) -> None:
    try:
        setJob(jobId, status="running", progress="Loading file...")
        filePath = _findUploadPath(payload.fileId)
        df = loadTable(filePath)

        setJob(jobId, progress="Coercing date column...")
        df = coerce_date(df, payload.dateCol)

        setJob(jobId, progress="Aggregating to monthly...")
        monthlyDf, monthlyMsg = enforce_monthly(
            df,
            date_col=payload.dateCol,
            metric_col=payload.metricCol,
            group_col=payload.groupCol,
        )

        requestedModels = _resolveModels(payload.models)
        setJob(jobId, progress=f"Running models: {', '.join(requestedModels)}")

        def runForSeries(series: pd.Series) -> Dict[str, Any]:
            forecasts: Dict[str, Any] = {}
            metricsByModel: Dict[str, Any] = {}
            failedModels: Dict[str, str] = {}
            backtestPredictions: Dict[str, List[float]] = {}

            if len(series) <= payload.horizon + 3:
                raise ValueError("Not enough history for backtesting")

            train = series.iloc[: -payload.horizon]
            test = series.iloc[-payload.horizon :]

            # Backtest + future forecast (future forecast uses full series)
            for modelName in requestedModels:
                try:
                    bt = run_backtests(train, horizon=payload.horizon, models=[modelName])
                    if modelName.upper() not in bt:
                        raise RuntimeError("Model unavailable")
                    btForecast = bt[modelName.upper()]["forecast"]
                    modelSmape = _smape(test.astype(float).tolist(), btForecast["yhat"])
                    yTrue = test.astype(float).to_numpy(dtype=float)
                    yPred = np.asarray(btForecast["yhat"], dtype=float)
                    modelMae = float(np.mean(np.abs(yTrue - yPred)))
                    metricsByModel[modelName.upper()] = {"smape": modelSmape, "mae": modelMae}
                    backtestPredictions[modelName.upper()] = btForecast["yhat"]

                    fut = run_backtests(series, horizon=payload.horizon, models=[modelName])
                    if modelName.upper() not in fut:
                        raise RuntimeError("Model unavailable")
                    forecasts[modelName.upper()] = fut[modelName.upper()]["forecast"]
                except Exception as e:
                    failedModels[modelName.upper()] = str(e)
                    continue

            if not forecasts:
                raise RuntimeError("All models failed")

            actuals = test.astype(float).tolist()
            metaModel = trainMetaLearner(backtestPredictions, actuals, alpha=1.0)
            ensemble = ensembleForecastWithMetaLearner(forecasts, metaModel)
            modelWeights = metaModel.get("percentWeights", {})

            if ensemble and "yhat" in ensemble:
                ensembleSmape = _smape(actuals, ensemble["yhat"])
                bestModel = min(metricsByModel.items(), key=lambda kv: kv[1]["smape"])[0]
                bestSmape = metricsByModel[bestModel]["smape"]
                if ensembleSmape > bestSmape:
                    ensemble = {
                        **forecasts[bestModel],
                        "model": "Ensemble",
                        "modelWeights": {bestModel: 100},
                        "model_weights": {bestModel: 100},
                    }
                    modelWeights = {bestModel: 100}
                    ensembleSmape = bestSmape
                ensemble["smape"] = ensembleSmape
            changePoints = detectChangePoints(series, model="rbf", pen=10.0)
            anomalies: List[Dict[str, Any]] = []
            insights = generateInsights(
                ensemble if isinstance(ensemble, dict) else {},
                anomalies=anomalies,
                changepoints=changePoints,
                model_weights=modelWeights,
            )

            return {
                "forecasts": forecasts,
                "smape": metricsByModel,
                "metrics": metricsByModel,
                "ensemble": ensemble,
                "changePoints": changePoints,
                "changepoints": changePoints,
                "anomalies": anomalies,
                "insights": insights,
                "modelWeights": modelWeights,
                "model_weights": modelWeights,
                "failedModels": failedModels,
            }

        if payload.groupCol:
            groupedResults: Dict[str, Any] = {}
            for groupValue, gdf in monthlyDf.groupby(payload.groupCol, dropna=False):
                setJob(jobId, progress=f"Running group: {groupValue}")
                series = pd.Series(
                    gdf[payload.metricCol].to_numpy(dtype=float),
                    index=pd.DatetimeIndex(gdf[payload.dateCol]),
                ).sort_index()
                core = runForSeries(series)
                history = {
                    "dates": [d.isoformat() for d in series.index.to_pydatetime()],
                    "y": series.astype(float).tolist(),
                }
                groupedResults[str(groupValue)] = {**core, "history": history}
            result: Dict[str, Any] = {
                "message": monthlyMsg,
                "grouped": True,
                "groups": groupedResults,
                "horizon": payload.horizon,
                "modelsRequested": requestedModels,
            }
        else:
            series = pd.Series(
                monthlyDf[payload.metricCol].to_numpy(dtype=float),
                index=pd.DatetimeIndex(monthlyDf[payload.dateCol]),
            ).sort_index()
            core = runForSeries(series)
            history = {
                "dates": [d.isoformat() for d in series.index.to_pydatetime()],
                "y": series.astype(float).tolist(),
            }
            result = {
                "message": monthlyMsg,
                "grouped": False,
                "horizon": payload.horizon,
                "modelsRequested": requestedModels,
                "history": history,
                **core,
            }

        setJobDone(jobId, result=result)
    except Exception as e:
        setJobError(jobId, error=str(e))


def _startForecastJob(jobId: str, payload: ForecastRequest) -> None:
    # BackgroundTasks execute after the response is sent, but still in-process.
    # To guarantee the POST returns quickly even under TestClient, we offload the
    # heavy work to a daemon thread here.
    Thread(target=_runForecastJob, args=(jobId, payload), daemon=True).start()


@router.get("/status/{job_id}")
async def getStatus(job_id: str) -> Dict[str, Any]:
    job = getJob(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"jobId": job_id, **serializeJob(job)}


@router.get("/changepoints/{job_id}")
async def getChangePoints(job_id: str) -> Dict[str, Any]:
    job = getJob(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "error":
        raise HTTPException(status_code=400, detail=job.error or "Job failed")
    if job.status != "done" or not job.result:
        return {"jobId": job_id, "status": job.status, "changepoints": []}

    result = job.result
    if result.get("grouped"):
        groups = result.get("groups", {})
        groupedCp = {k: v.get("changepoints", v.get("changePoints", [])) for k, v in groups.items()}
        return {"jobId": job_id, "status": "done", "grouped": True, "changepoints": groupedCp}

    cps = result.get("changepoints", result.get("changePoints", []))
    return {"jobId": job_id, "status": "done", "grouped": False, "changepoints": cps}


@router.post("/forecast")
async def forecast(request: ForecastRequest, backgroundTasks: BackgroundTasks) -> Dict[str, Any]:
    jobId = createJob(progress="Pending...")
    backgroundTasks.add_task(_startForecastJob, jobId, request)
    return {"jobId": jobId}

