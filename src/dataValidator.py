"""Data validation utilities for time series data."""
import pandas as pd
from typing import Dict, List, Optional, Tuple


def validateData(
    df: pd.DataFrame,
    dateCol: Optional[str],
    metricCol: Optional[str],
    groupCol: Optional[str]
) -> Tuple[bool, List[str], List[str], int]:
    """
    Validate time series data with confirmed columns.
    
    Args:
        df: Input dataframe
        dateCol: Name of the date column
        metricCol: Name of the metric column
        groupCol: Name of the group column (optional)
        
    Returns:
        Tuple of (isValid, errors, warnings, seriesLength)
        - isValid: True if no blocking errors
        - errors: List of blocking error messages (plain English)
        - warnings: List of non-blocking warning messages (plain English)
        - seriesLength: Minimum series length across all groups
    """
    errors = []
    warnings = []
    
    # Check for missing date column (blocking error)
    if not dateCol or dateCol not in df.columns:
        errors.append("Date column is missing or not found in the data. Please select a valid date column.")
        return (False, errors, warnings, 0)
    
    # Check for missing metric column (blocking error)
    if not metricCol or metricCol not in df.columns:
        errors.append("Metric column is missing or not found in the data. Please select a valid metric column.")
        return (False, errors, warnings, 0)
    
    # Convert date column to datetime
    try:
        df[dateCol] = pd.to_datetime(df[dateCol], errors='coerce')
    except Exception:
        errors.append(f"Unable to parse dates in the '{dateCol}' column. Please ensure the date column contains valid dates.")
        return (False, errors, warnings, 0)
    
    # Remove rows with missing dates or metrics
    dfClean = df[[dateCol, metricCol]].copy()
    if groupCol and groupCol in df.columns:
        dfClean[groupCol] = df[groupCol]
    
    dfClean = dfClean.dropna(subset=[dateCol, metricCol])
    
    if len(dfClean) == 0:
        errors.append("No valid data rows found after removing missing dates and metrics.")
        return (False, errors, warnings, 0)
    
    # Check for duplicate dates (warning, not blocking)
    if groupCol and groupCol in dfClean.columns:
        # Check duplicates per group
        duplicates = dfClean.groupby([groupCol, dateCol]).size()
        duplicateCount = (duplicates > 1).sum()
        if duplicateCount > 0:
            warnings.append(f"Found {duplicateCount} duplicate date(s) within one or more groups. The forecast may use the last value for each date.")
    else:
        # Check duplicates overall
        duplicateDates = dfClean[dateCol].duplicated().sum()
        if duplicateDates > 0:
            warnings.append(f"Found {duplicateDates} duplicate date(s) in the data. The forecast may use the last value for each date.")
    
    # Calculate series length
    if groupCol and groupCol in dfClean.columns:
        # Minimum series length across all groups
        groupLengths = dfClean.groupby(groupCol).size()
        seriesLength = int(groupLengths.min())
    else:
        # Overall series length
        seriesLength = len(dfClean)
    
    # Check minimum series length (blocking error)
    if seriesLength < 12:
        errors.append(f"Time series is too short ({seriesLength} rows). At least 12 data points are required for forecasting.")
        return (False, errors, warnings, seriesLength)
    
    # Check if metric column is numeric
    if not pd.api.types.is_numeric_dtype(dfClean[metricCol]):
        try:
            dfClean[metricCol] = pd.to_numeric(dfClean[metricCol], errors='coerce')
            if dfClean[metricCol].isna().all():
                errors.append(f"The metric column '{metricCol}' does not contain numeric values.")
                return (False, errors, warnings, seriesLength)
        except Exception:
            errors.append(f"The metric column '{metricCol}' does not contain numeric values.")
            return (False, errors, warnings, seriesLength)
    
    isValid = len(errors) == 0
    return (isValid, errors, warnings, seriesLength)
