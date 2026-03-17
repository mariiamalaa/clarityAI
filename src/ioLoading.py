"""I/O utilities for loading data tables from CSV and Excel files."""
import pandas as pd
from pathlib import Path
from typing import Union


def loadTable(filePath: Union[str, Path]) -> pd.DataFrame:
    """
    Load a table from a CSV or Excel file.
    
    Args:
        filePath: Path to the CSV or Excel file
        
    Returns:
        pandas.DataFrame: The loaded data table
        
    Raises:
        ValueError: If the file cannot be read or is not a supported format
        FileNotFoundError: If the file does not exist
    """
    filePath = Path(filePath)
    
    if not filePath.exists():
        raise FileNotFoundError(f"File not found: {filePath}")
    
    suffix = filePath.suffix.lower()
    
    try:
        if suffix == '.csv':
            df = pd.read_csv(filePath)
        elif suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(filePath)
        else:
            raise ValueError(f"Unsupported file format: {suffix}")
        
        return df
    except Exception as e:
        raise ValueError(f"Could not read file: {str(e)}")
