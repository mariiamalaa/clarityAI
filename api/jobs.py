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


def create_job(progress: str = "Queued") -> str:
    job_id = str(uuid4())
    with _lock:
        _jobs[job_id] = Job(status="pending", progress=progress)
    return job_id


def get_job(job_id: str) -> Optional[Job]:
    with _lock:
        return _jobs.get(job_id)


def set_job(job_id: str, *, status: Optional[str] = None, progress: Optional[str] = None) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        if status is not None:
            job.status = status
        if progress is not None:
            job.progress = progress


def set_job_done(job_id: str, *, result: Dict[str, Any]) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.status = "done"
        job.progress = "Done"
        job.result = result
        job.error = None


def set_job_error(job_id: str, *, error: str) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.status = "error"
        job.progress = "Failed"
        job.result = None
        job.error = error


def serialize_job(job: Job) -> Dict[str, Any]:
    return asdict(job)

