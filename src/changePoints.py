from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
import ruptures as rpt


def detectChangePoints(
    series: pd.Series,
    *,
    model: str = "rbf",
    pen: float = 10.0,
) -> List[Dict[str, Any]]:
    cleanSeries = series.astype(float).dropna().sort_index()
    if len(cleanSeries) < 4:
        return []

    signal = cleanSeries.to_numpy(dtype=float)
    # fit_predict returns 1-based segment end indices; final index == len(signal)
    breakpoints = rpt.Pelt(model=model).fit_predict(signal, pen=pen)
    if not breakpoints:
        return []

    changePoints: List[Dict[str, Any]] = []
    segmentStart = 0
    for bp in breakpoints:
        if bp >= len(signal):
            continue
        before = signal[segmentStart:bp]
        after = signal[bp:]
        if len(before) == 0 or len(after) == 0:
            continue

        meanBefore = float(np.mean(before))
        meanAfter = float(np.mean(after))
        denom = abs(meanBefore) if abs(meanBefore) > 1e-9 else 1e-9
        shiftPct = float(((meanAfter - meanBefore) / denom) * 100.0)

        cpDate = cleanSeries.index[bp]
        changePoints.append(
            {
                "date": cpDate.isoformat() if hasattr(cpDate, "isoformat") else str(cpDate),
                "mean_before": meanBefore,
                "mean_after": meanAfter,
                "shift_pct": shiftPct,
            }
        )
        segmentStart = bp

    return changePoints
