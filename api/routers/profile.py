"""Column profiling endpoint for file analysis."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from datetime import datetime
import pandas as pd
import numpy as np
import sys

# Import from src modules
projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))
from src.io_loading import loadTable
from src.profiling import suggestColumns, analyzeDataCharacteristics

router = APIRouter()

# Uploads directory
uploadsDir = Path(__file__).parent.parent.parent / "uploads"


@router.get("/profile/{fileId}")
async def getProfile(fileId: str):
    """
    Get column profiling and data characteristics for an uploaded file.
    
    Args:
        fileId: UUID of the uploaded file
        
    Returns:
        {
            "suggestions": {
                "date_col": str | null,
                "metric_col": str | null,
                "group_col": str | null
            },
            "characteristics": {
                "date_range": {...} | null,
                "frequency": str | null,
                "row_count": int,
                "column_count": int
            },
            "preview": [...]
        }
    """
    # Find the file in uploads directory
    filePath = None
    for ext in ['.csv', '.xlsx', '.xls']:
        candidatePath = uploadsDir / f"{fileId}{ext}"
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
        
        # Get column suggestions
        suggestions = suggestColumns(df)
        
        # Analyze data characteristics
        characteristics = analyzeDataCharacteristics(df, suggestions.get('date_col'))
        
        # Get first 5 rows as preview
        preview = df.head(5).to_dict('records')
        # Convert any non-serializable types to strings
        for row in preview:
            for key, value in row.items():
                if pd.isna(value):
                    row[key] = None
                elif isinstance(value, (pd.Timestamp, datetime)):
                    row[key] = str(value)
                elif isinstance(value, (np.integer, np.floating)):
                    row[key] = float(value) if isinstance(value, np.floating) else int(value)
        
        return {
            "suggestions": suggestions,
            "characteristics": characteristics,
            "preview": preview
        }
    
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )
