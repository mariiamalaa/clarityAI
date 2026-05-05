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



