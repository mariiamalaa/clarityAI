from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Dict

import pandas as pd
from fastapi import APIRouter, HTTPException

from api.jobs import getJob

projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))

from src.anomalies import detectAnomalies, stlResiduals

router = APIRouter()


def _seriesFromResult(result: Dict[str, Any]) -> pd.Series:
    history = result.get("history", {})
    dates = history.get("dates", [])
    values = history.get("y", [])
    if not dates or not values:
        return pd.Series(dtype=float)
    n = min(len(dates), len(values))
    idx = pd.to_datetime(dates[:n], errors="coerce")
    vals = pd.Series(values[:n], dtype=float)
    valid = ~idx.isna()
    return pd.Series(vals[valid].to_numpy(dtype=float), index=idx[valid]).sort_index()


@router.get("/anomalies/{job_id}")
async def getAnomalies(job_id: str) -> Dict[str, Any]:
    job = getJob(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "error":
        raise HTTPException(status_code=400, detail=job.error or "Job failed")
    if job.status != "done" or not job.result:
        return {"jobId": job_id, "status": job.status, "anomalies": []}

    result = job.result
    if result.get("grouped"):
        groups = result.get("groups", {})
        grouped = {}
        for groupKey, groupData in groups.items():
            series = _seriesFromResult(groupData)
            if series.empty:
                grouped[groupKey] = []
                continue
            grouped[groupKey] = detectAnomalies(stlResiduals(series))
        return {"jobId": job_id, "status": "done", "grouped": True, "anomalies": grouped}

    series = _seriesFromResult(result)
    anomalies = detectAnomalies(stlResiduals(series)) if not series.empty else []
    return {"jobId": job_id, "status": "done", "grouped": False, "anomalies": anomalies}
