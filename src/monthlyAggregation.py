from __future__ import annotations

from typing import Optional, Tuple
import pandas as pd


def coerce_date(df: pd.DataFrame, date_col: str) -> pd.DataFrame:
    if date_col not in df.columns:
        raise ValueError(f"date_col '{date_col}' not found in dataframe")
    out = df.copy()
    out[date_col] = pd.to_datetime(out[date_col], errors="coerce")
    if out[date_col].isna().all():
        raise ValueError(f"Could not parse any dates in column '{date_col}'")
    return out


def enforce_monthly(
    df: pd.DataFrame,
    *,
    date_col: str,
    metric_col: str,
    group_col: Optional[str] = None,
    agg: str = "sum",
) -> Tuple[pd.DataFrame, str]:
    if date_col not in df.columns:
        raise ValueError(f"date_col '{date_col}' not found in dataframe")
    if metric_col not in df.columns:
        raise ValueError(f"metric_col '{metric_col}' not found in dataframe")
    if group_col is not None and group_col not in df.columns:
        raise ValueError(f"group_col '{group_col}' not found in dataframe")

    out = df.copy()
    out = out.dropna(subset=[date_col])
    if not pd.api.types.is_datetime64_any_dtype(out[date_col]):
        out[date_col] = pd.to_datetime(out[date_col], errors="coerce")
    out.loc[:, "_month"] = out[date_col].dt.to_period("M").dt.to_timestamp()

    group_keys = ["_month"] if not group_col else [group_col, "_month"]

    if agg == "sum":
        grouped = out.groupby(group_keys, dropna=False)[metric_col].sum().reset_index()
        message = "Aggregated to monthly (sum)."
    elif agg == "mean":
        grouped = out.groupby(group_keys, dropna=False)[metric_col].mean().reset_index()
        message = "Aggregated to monthly (mean)."
    else:
        raise ValueError(f"Unsupported aggregation '{agg}'")

    grouped = grouped.rename(columns={"_month": date_col})
    sort_keys = [date_col] if not group_col else [group_col, date_col]
    grouped = grouped.sort_values(sort_keys).reset_index(drop=True)
    return grouped, message

