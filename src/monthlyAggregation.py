from __future__ import annotations

from typing import Optional, Tuple
import pandas as pd


def coerceDate(df: pd.DataFrame, dateCol: str) -> pd.DataFrame:
    if dateCol not in df.columns:
        raise ValueError(f"dateCol '{dateCol}' not found in dataframe")
    out = df.copy()
    out[dateCol] = pd.to_datetime(out[dateCol], errors="coerce")
    if out[dateCol].isna().all():
        raise ValueError(f"Could not parse any dates in column '{dateCol}'")
    return out


def enforceMonthly(
    df: pd.DataFrame,
    *,
    dateCol: str,
    metricCol: str,
    groupCol: Optional[str] = None,
    agg: str = "sum",
) -> Tuple[pd.DataFrame, str]:
    if dateCol not in df.columns:
        raise ValueError(f"dateCol '{dateCol}' not found in dataframe")
    if metricCol not in df.columns:
        raise ValueError(f"metricCol '{metricCol}' not found in dataframe")
    if groupCol is not None and groupCol not in df.columns:
        raise ValueError(f"groupCol '{groupCol}' not found in dataframe")

    out = df.copy()
    out = out.dropna(subset=[dateCol])
    if not pd.api.types.is_datetime64_any_dtype(out[dateCol]):
        out[dateCol] = pd.to_datetime(out[dateCol], errors="coerce")
    out.loc[:, "_month"] = out[dateCol].dt.to_period("M").dt.to_timestamp()

    groupKeys = ["_month"] if not groupCol else [groupCol, "_month"]

    if agg == "sum":
        grouped = out.groupby(groupKeys, dropna=False)[metricCol].sum().reset_index()
        message = "Aggregated to monthly (sum)."
    elif agg == "mean":
        grouped = out.groupby(groupKeys, dropna=False)[metricCol].mean().reset_index()
        message = "Aggregated to monthly (mean)."
    else:
        raise ValueError(f"Unsupported aggregation '{agg}'")

    grouped = grouped.rename(columns={"_month": dateCol})
    sortKeys = [dateCol] if not groupCol else [groupCol, dateCol]
    grouped = grouped.sort_values(sortKeys).reset_index(drop=True)
    return grouped, message
