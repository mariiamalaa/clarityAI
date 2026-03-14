"""File upload endpoint for CSV and Excel files."""
import os
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

# Import from src.ioLoading
# Add project root to path
import sys
projectRoot = Path(__file__).parent.parent.parent
if str(projectRoot) not in sys.path:
    sys.path.insert(0, str(projectRoot))
from src.ioLoading import loadTable

router = APIRouter()

# Ensure uploads directory exists
uploadsDir = Path(__file__).parent.parent.parent / "uploads"
uploadsDir.mkdir(exist_ok=True)

allowedExtensions = {'.csv', '.xlsx', '.xls'}


@router.post("/upload")
async def uploadFile(file: UploadFile = File(...)):
    """
    Upload a CSV or Excel file.
    
    Accepts .csv, .xlsx, or .xls files.
    Saves the file to ./uploads/{fileId}.{ext} and validates it can be read.
    
    Returns:
        {
            "file_id": str,
            "filename": str,
            "rows": int,
            "columns": List[str]
        }
    """
    # Validate file extension
    fileExt = Path(file.filename).suffix.lower()
    if fileExt not in allowedExtensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only .csv, .xlsx, and .xls files are allowed."
        )
    
    # Generate fileId and save file
    fileId = str(uuid4())
    savedFilename = f"{fileId}{fileExt}"
    savedPath = uploadsDir / savedFilename
    
    try:
        # Save uploaded file
        with open(savedPath, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Verify file can be read using loadTable
        try:
            df = loadTable(savedPath)
        except Exception as e:
            # Remove the file if it can't be read
            if savedPath.exists():
                os.remove(savedPath)
            raise HTTPException(
                status_code=422,
                detail="Could not read file"
            )
        
        # Return file info
        return {
            "file_id": fileId,
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if something went wrong
        if savedPath.exists():
            os.remove(savedPath)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )
