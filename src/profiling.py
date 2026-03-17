"""Column profiling and data analysis utilities."""
import pandas as pd
import numpy as np
from typing import Dict, Optional, Any
from datetime import datetime


def suggestColumns(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """
    Suggest date, metric, and group columns from a dataframe.
    
    Args:
        df: Input dataframe
        
    Returns:
        Dictionary with 'date_col', 'metric_col', 'group_col' suggestions
    """
    suggestions = {
        'date_col': None,
        'metric_col': None,
        'group_col': None
    }
    
    # Common date column name patterns
    datePatterns = ['date', 'time', 'timestamp', 'day', 'month', 'year', 'period', 'week']
    # Common metric column name patterns
    metricPatterns = ['value', 'metric', 'amount', 'count', 'sales', 'revenue', 'quantity', 'volume', 'price', 'cost']
    # Common group column name patterns
    groupPatterns = ['group', 'category', 'type', 'segment', 'region', 'product', 'customer', 'store', 'location']
    
    # Find date column
    for col in df.columns:
        colLower = col.lower()
        # Check by name pattern
        if any(pattern in colLower for pattern in datePatterns):
            # Verify it's actually date-like
            if _isDateLike(df[col]):
                suggestions['date_col'] = col
                break
    
    # If no date found by name, try to find by type
    if suggestions['date_col'] is None:
        for col in df.columns:
            if _isDateLike(df[col]):
                suggestions['date_col'] = col
                break
    
    # Find metric column (numeric, not date)
    numericCols = df.select_dtypes(include=[np.number]).columns.tolist()
    if suggestions['date_col'] and suggestions['date_col'] in numericCols:
        numericCols.remove(suggestions['date_col'])
    
    if numericCols:
        # Prefer columns matching metric patterns
        for col in numericCols:
            colLower = col.lower()
            if any(pattern in colLower for pattern in metricPatterns):
                suggestions['metric_col'] = col
                break
        
        # If no match, use first numeric column
        if suggestions['metric_col'] is None:
            suggestions['metric_col'] = numericCols[0]
    
    # Find group column (categorical/string, not date)
    categoricalCols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    if suggestions['date_col'] and suggestions['date_col'] in categoricalCols:
        categoricalCols.remove(suggestions['date_col'])
    
    if categoricalCols:
        # Prefer columns matching group patterns
        for col in categoricalCols:
            colLower = col.lower()
            if any(pattern in colLower for pattern in groupPatterns):
                suggestions['group_col'] = col
                break
        
        # If no match, use first categorical column
        if suggestions['group_col'] is None and categoricalCols:
            suggestions['group_col'] = categoricalCols[0]
    
    return suggestions


def analyzeDataCharacteristics(df: pd.DataFrame, dateCol: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze data characteristics including date range and frequency.
    
    Args:
        df: Input dataframe
        dateCol: Name of the date column (if None, will try to detect)
        
    Returns:
        Dictionary with analysis results
    """
    characteristics = {
        'date_range': None,
        'frequency': None,
        'row_count': len(df),
        'column_count': len(df.columns)
    }
    
    # Find date column if not provided
    if dateCol is None:
        for col in df.columns:
            if _isDateLike(df[col]):
                dateCol = col
                break
    
    if dateCol and dateCol in df.columns:
        try:
            # Convert to datetime if not already
            dateSeries = pd.to_datetime(df[dateCol], errors='coerce')
            dateSeries = dateSeries.dropna()
            
            if len(dateSeries) > 0:
                minDate = dateSeries.min()
                maxDate = dateSeries.max()
                characteristics['date_range'] = {
                    'start': minDate.isoformat() if hasattr(minDate, 'isoformat') else str(minDate),
                    'end': maxDate.isoformat() if hasattr(maxDate, 'isoformat') else str(maxDate)
                }
                
                # Detect frequency
                if len(dateSeries) > 1:
                    dateSeriesSorted = dateSeries.sort_values()
                    diffs = dateSeriesSorted.diff().dropna()
                    if len(diffs) > 0:
                        medianDiff = diffs.median()
                        characteristics['frequency'] = _detectFrequency(medianDiff)
        except Exception:
            pass
    
    return characteristics


def _isDateLike(series: pd.Series) -> bool:
    """Check if a series looks like dates."""
    # Check if already datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    
    # Check if string that can be parsed as date
    if series.dtype == 'object':
        sample = series.dropna().head(10)
        if len(sample) == 0:
            return False
        try:
            pd.to_datetime(sample, errors='raise')
            return True
        except:
            return False
    
    return False


def _detectFrequency(medianDiff: pd.Timedelta) -> str:
    """Detect frequency from median time difference."""
    days = medianDiff.total_seconds() / 86400
    
    if days < 0.1:
        return 'hourly'
    elif days < 0.5:
        return 'daily'
    elif days < 7:
        return 'weekly'
    elif days < 32:
        return 'monthly'
    elif days < 93:
        return 'quarterly'
    else:
        return 'yearly'
