"""Data validation endpoint."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys

# Import from src modules
projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))
from src.ioLoading import loadTable
from src.dataValidator import validateData

router = APIRouter()

# Uploads directory
uploadsDir = Path(__file__).parent.parent.parent / "uploads"


class ValidateRequest(BaseModel):
    """Request model for validation endpoint."""
    file_id: str
    date_col: Optional[str] = None
    metric_col: Optional[str] = None
    group_col: Optional[str] = None


@router.post("/validate")
async def validate(request: ValidateRequest):
    """
    Validate data with confirmed column selections.
    
    Args:
        request: Validation request with file_id and column names
        
    Returns:
        {
            "valid": bool,
            "errors": List[str],
            "warnings": List[str],
            "series_length": int
        }
    """
    # Find the file in uploads directory
    filePath = None
    for ext in ['.csv', '.xlsx', '.xls']:
        candidatePath = uploadsDir / f"{request.file_id}{ext}"
        if candidatePath.exists():
            filePath = candidatePath
            break
    
    if filePath is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    
    try:
        # Load the file
        df = loadTable(filePath)
        
        # Run validation
        isValid, errors, warnings, seriesLength = validateData(
            df,
            request.date_col,
            request.metric_col,
            request.group_col
        )
        
        return {
            "valid": isValid,
            "errors": errors,
            "warnings": warnings,
            "series_length": seriesLength
        }
    
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    except Exception as e:
        # Return plain English error, no tracebacks
        raise HTTPException(
            status_code=500,
            detail=f"Error validating data: {str(e)}"
        )
