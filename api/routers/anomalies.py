from fastapi import APIRouter, HTTPException
from pathlib import Path
import sys
import pandas as pd

from api.jobs import getJob

# Import from src modules
projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))

from src.anomalies import detect_anomalies
from src.ioLoading import loadTable
from src.changepoints import detectChangePoints
from src.monthlyAggregation import coerce_date, enforce_monthly

router = APIRouter()


@router.get("/anomalies/{job_id}")
async def get_anomalies(job_id: str):
    """
    Get anomalies for a completed forecast job.
    """
    job = getJob(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "error":
        raise HTTPException(status_code=400, detail=job.error or "Job failed")

    if job.status != "done" or not job.result:
        return {"jobId": job_id, "status": job.status, "anomalies": []}

    result = job.result

    # Load the original data
    try:
        from api.routers.forecast import _findUploadPath
        filePath = _findUploadPath(result.get("fileId", ""))
        df = loadTable(filePath)

        # Coerce date column
        df = coerce_date(df, result.get("dateCol", ""))

        # Aggregate to monthly
        monthlyDf, _ = enforce_monthly(
            df,
            date_col=result.get("dateCol", ""),
            metric_col=result.get("metricCol", ""),
            group_col=result.get("groupCol")
        )

        # Create series
        series = pd.Series(
            monthlyDf[result.get("metricCol", "")].to_numpy(dtype=float),
            index=pd.DatetimeIndex(monthlyDf[result.get("dateCol", "")]),
        ).sort_index()

        # Detect anomalies
        anomalies = detect_anomalies(series)

        return {
            "jobId": job_id,
            "status": "done",
            "anomalies": anomalies
        }

    except Exception as e:
        # If anomaly detection fails, return empty list
        return {
            "jobId": job_id,
            "status": "done",
            "anomalies": []
        }