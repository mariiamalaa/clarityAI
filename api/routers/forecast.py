"""Forecast stub endpoint + async job tracking."""

from __future__ import annotations

from pathlib import Path
import sys
import time
from threading import Thread
from typing import Optional, Any, Dict, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.jobs import create_job, get_job, serialize_job, set_job, set_job_done, set_job_error

# Import from src modules (match existing router style)
projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))

from src.ioLoading import loadTable
from src.monthlyAggregation import coerce_date, enforce_monthly

router = APIRouter()

uploadsDir = Path(__file__).parent.parent.parent / "uploads"


class Cols(BaseModel):
    date_col: str
    metric_col: str
    group_col: Optional[str] = None


class ForecastRequest(BaseModel):
    file_id: str
    cols: Cols
    horizon: int
    models: Literal["ensemble", "classical", "ml", "custom"] = "ensemble"


def _run_forecast_job(job_id: str, payload: ForecastRequest) -> None:
    try:
        # Keep "pending" observable for polling UIs
        time.sleep(0.9)
        set_job(job_id, status="running", progress="Loading file...")

        filePath = None
        for ext in [".csv", ".xlsx", ".xls"]:
            candidatePath = uploadsDir / f"{payload.file_id}{ext}"
            if candidatePath.exists():
                filePath = candidatePath
                break
        if filePath is None:
            raise FileNotFoundError("File not found")

        df = loadTable(filePath)

        set_job(job_id, progress="Coercing date column...")
        time.sleep(0.9)
        df = coerce_date(df, payload.cols.date_col)

        set_job(job_id, progress="Aggregating to monthly...")
        time.sleep(0.9)
        monthlyDf, monthlyMsg = enforce_monthly(
            df,
            date_col=payload.cols.date_col,
            metric_col=payload.cols.metric_col,
            group_col=payload.cols.group_col,
        )

        # Stub "result" for Week 2 endpoint: return preview + metadata
        set_job(job_id, progress="Finalizing...")
        time.sleep(0.6)
        preview = monthlyDf.head(10).to_dict("records")
        result: Dict[str, Any] = {
            "message": monthlyMsg,
            "rows": int(len(monthlyDf)),
            "columns": list(monthlyDf.columns),
            "preview": preview,
            "horizon": payload.horizon,
            "models": payload.models,
        }

        set_job_done(job_id, result=result)
    except Exception as e:
        set_job_error(job_id, error=str(e))


@router.get("/status/{job_id}")
async def getStatus(job_id: str) -> Dict[str, Any]:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **serialize_job(job)}


@router.post("/forecast")
async def forecastStub(request: ForecastRequest) -> Dict[str, Any]:
    job_id = create_job(progress="Pending...")

    Thread(target=_run_forecast_job, args=(job_id, request), daemon=True).start()

    return {"job_id": job_id}

