from __future__ import annotations

from dataclasses import dataclass, asdict
from threading import Lock
from typing import Any, Dict, Optional
from uuid import uuid4


@dataclass
class Job:
    status: str  # "pending" | "running" | "done" | "error"
    progress: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


_lock = Lock()
_jobs: Dict[str, Job] = {}


def createJob(progress: str = "Queued") -> str:
    jobId = str(uuid4())
    with _lock:
        _jobs[jobId] = Job(status="pending", progress=progress)
    return jobId


def getJob(jobId: str) -> Optional[Job]:
    with _lock:
        return _jobs.get(jobId)


def setJob(jobId: str, *, status: Optional[str] = None, progress: Optional[str] = None) -> None:
    with _lock:
        job = _jobs.get(jobId)
        if not job:
            return
        if status is not None:
            job.status = status
        if progress is not None:
            job.progress = progress


def setJobDone(jobId: str, *, result: Dict[str, Any]) -> None:
    with _lock:
        job = _jobs.get(jobId)
        if not job:
            return
        job.status = "done"
        job.progress = "Done"
        job.result = result
        job.error = None


def setJobError(jobId: str, *, error: str) -> None:
    with _lock:
        job = _jobs.get(jobId)
        if not job:
            return
        job.status = "error"
        job.progress = "Failed"
        job.result = None
        job.error = error


def serializeJob(job: Job) -> Dict[str, Any]:
    return asdict(job)


# Backwards-compatible snake_case aliases (existing code may import these)
def create_job(progress: str = "Queued") -> str:
    return createJob(progress=progress)


def get_job(job_id: str) -> Optional[Job]:
    return getJob(jobId=job_id)


def set_job(job_id: str, *, status: Optional[str] = None, progress: Optional[str] = None) -> None:
    return setJob(jobId=job_id, status=status, progress=progress)


def set_job_done(job_id: str, *, result: Dict[str, Any]) -> None:
    return setJobDone(jobId=job_id, result=result)


def set_job_error(job_id: str, *, error: str) -> None:
    return setJobError(jobId=job_id, error=error)


def serialize_job(job: Job) -> Dict[str, Any]:
    return serializeJob(job)

