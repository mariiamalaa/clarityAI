from pathlib import Path
import json
import sys
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

router = APIRouter()

projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))

reportsDir = projectRoot / "artifacts" / "reports"
reportsDir.mkdir(parents=True, exist_ok=True)


@router.get("/report/{job_id}")
async def get_report(job_id: str) -> Dict[str, Any]:
    reportPath = reportsDir / f"{job_id}.json"
    if not reportPath.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        return json.loads(reportPath.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read report: {e}")
