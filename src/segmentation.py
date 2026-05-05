from __future__ import annotations

from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

__all__ = ["segmentByGroups", "computeGrowthRates"]


def segmentByGroups(
    df: pd.DataFrame,
    groupCol: str,
    dateCol: str,
    metricCol: str,
    minGroupSize: int = 6
) -> Dict[str, pd.Series]:
    """
    Segment data by groups, returning time series for each group.

    Args:
        df: Input dataframe
        groupCol: Column name for grouping
        dateCol: Column name for dates
        metricCol: Column name for metric values
        minGroupSize: Minimum data points required for a group

    Returns:
        Dict mapping group names to pandas Series (indexed by datetime)
    """
    segments: Dict[str, pd.Series] = {}

    for groupValue, gdf in df.groupby(groupCol, dropna=False):
        if len(gdf) < minGroupSize:
            print(f"Warning: Skipping group '{groupValue}' - insufficient data ({len(gdf)} points < {minGroupSize})")
            continue

        try:
            # Create time series
            series = pd.Series(
                gdf[metricCol].to_numpy(dtype=float),
                index=pd.DatetimeIndex(gdf[dateCol]),
            ).sort_index()

            # Remove duplicates (keep last)
            series = series[~series.index.duplicated(keep='last')]

            segments[str(groupValue)] = series

        except Exception as e:
            print(f"Warning: Failed to process group '{groupValue}': {e}")
            continue

    return segments


def computeGrowthRates(
    segments: Dict[str, pd.Series],
    horizon: int = 6
) -> Dict[str, Dict[str, Any]]:
    """
    Compute forecasted growth rates for each segment.

    Args:
        segments: Dict of group name -> time series
        horizon: Forecast horizon in months

    Returns:
        Dict with growth statistics for each group
    """
    growthStats: Dict[str, Dict[str, Any]] = {}

    for groupName, series in segments.items():
        if len(series) < horizon + 3:
            print(f"Warning: Skipping growth calculation for '{groupName}' - insufficient history")
            continue

        try:
            # Calculate current value (last actual)
            currentValue = float(series.iloc[-1])

            # Simple linear trend projection for growth estimate
            # Use last N months to estimate trend
            lookback = min(len(series) - horizon, 12)  # Use up to 12 months of history
            recent = series.iloc[-(lookback + horizon):-horizon]

            if len(recent) >= 3:
                # Linear regression on recent data
                x = np.arange(len(recent))
                y = recent.values

                # Simple slope calculation
                slope = np.polyfit(x, y, 1)[0]

                # Project forward by horizon months
                projectedValue = currentValue + (slope * horizon)

                # Calculate growth rate
                if abs(currentValue) > 1e-9:
                    growthRate = ((projectedValue - currentValue) / abs(currentValue)) * 100
                else:
                    growthRate = 0.0

                # Determine trend direction
                trend = "up" if growthRate > 0 else "down" if growthRate < 0 else "flat"

                growthStats[groupName] = {
                    "currentValue": currentValue,
                    "projectedValue": projectedValue,
                    "growthRate": growthRate,
                    "trend": trend,
                    "confidence": min(0.95, max(0.1, len(recent) / 12.0)),  # Rough confidence based on data size
                    "dataPoints": len(series)
                }
            else:
                # Fallback: assume flat growth
                growthStats[groupName] = {
                    "currentValue": currentValue,
                    "projectedValue": currentValue,
                    "growthRate": 0.0,
                    "trend": "flat",
                    "confidence": 0.1,
                    "dataPoints": len(series)
                }

        except Exception as e:
            print(f"Warning: Failed to compute growth for '{groupName}': {e}")
            continue

    return growthStats