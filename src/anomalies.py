from __future__ import annotations

from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler

__all__ = ["detect_anomalies", "stl_residuals"]


def stl_residuals(series: pd.Series, seasonal_periods: int = 12) -> pd.Series:
    """
    Decompose time series using STL and return residuals.
    Falls back to simple differencing if statsmodels not available.
    """
    try:
        from statsmodels.tsa.seasonal import STL
        stl = STL(series, seasonal=seasonal_periods, robust=True)
        result = stl.fit()
        return result.resid
    except ImportError:
        # Fallback: simple seasonal differencing
        seasonal_diff = series - series.shift(seasonal_periods)
        return seasonal_diff.dropna()


def _zscore_anomalies(residuals: pd.Series, threshold: float = 2.5) -> pd.Series:
    """Detect anomalies using Z-score method."""
    z_scores = np.abs((residuals - residuals.mean()) / residuals.std())
    return z_scores > threshold


def _isolation_forest_anomalies(series: pd.Series, contamination: float = 0.1) -> pd.Series:
    """Detect anomalies using Isolation Forest."""
    try:
        # Reshape for sklearn
        X = series.values.reshape(-1, 1)
        clf = IsolationForest(contamination=contamination, random_state=42)
        predictions = clf.fit_predict(X)
        # Convert to boolean: -1 = anomaly, 1 = normal
        return pd.Series(predictions == -1, index=series.index)
    except Exception:
        # Fallback to all False if isolation forest fails
        return pd.Series(False, index=series.index)


def _one_class_svm_anomalies(series: pd.Series, nu: float = 0.1) -> pd.Series:
    """Detect anomalies using One-Class SVM."""
    try:
        # Reshape for sklearn
        X = series.values.reshape(-1, 1)
        clf = OneClassSVM(nu=nu, kernel='rbf', gamma='scale')
        predictions = clf.fit_predict(X)
        # Convert to boolean: -1 = anomaly, 1 = normal
        return pd.Series(predictions == -1, index=series.index)
    except Exception:
        # Fallback to all False if SVM fails
        return pd.Series(False, index=series.index)


def detect_anomalies(
    series: pd.Series,
    seasonal_periods: int = 12,
    z_threshold: float = 2.5,
    contamination: float = 0.1,
    svm_nu: float = 0.1
) -> List[Dict[str, Any]]:
    """
    Detect anomalies using multiple methods and combine results.

    Returns list of anomaly dictionaries with:
    - date: ISO date string
    - actual: actual value
    - expected: expected value (mean of non-anomalous points)
    - residual: residual from expected
    - zscore: Z-score of residual
    - detectors: list of detector names that flagged this point
    - severity: 'high', 'medium', 'low' based on Z-score
    """
    if len(series) < seasonal_periods * 2:
        return []

    # Get residuals using STL decomposition
    residuals = stl_residuals(series, seasonal_periods)

    # Detect anomalies with different methods
    zscore_anomalies = _zscore_anomalies(residuals, z_threshold)
    iforest_anomalies = _isolation_forest_anomalies(series, contamination)
    svm_anomalies = _one_class_svm_anomalies(series, svm_nu)

    # Calculate Z-scores for severity
    z_scores = (residuals - residuals.mean()) / residuals.std()

    # Calculate expected values (mean of non-anomalous points)
    non_anomalous = series[~zscore_anomalies]  # Use Z-score as primary
    expected_value = non_anomalous.mean() if len(non_anomalous) > 0 else series.mean()

    anomalies = []

    for i in range(len(residuals)):
        date = series.index[i]
        actual = series.iloc[i]
        residual = residuals.iloc[i]
        zscore = z_scores.iloc[i]

        # Check which detectors flagged this point
        detectors = []
        if zscore_anomalies.iloc[i]:
            detectors.append("Z-score")
        if iforest_anomalies.iloc[i]:
            detectors.append("Isolation Forest")
        if svm_anomalies.iloc[i]:
            detectors.append("One-Class SVM")

        # Only include if at least one detector flagged it
        if detectors:
            # Determine severity
            abs_z = abs(zscore)
            if abs_z > 3.5:
                severity = "high"
            elif abs_z > 2.5:
                severity = "medium"
            else:
                severity = "low"

            anomalies.append({
                "date": date.isoformat() if hasattr(date, "isoformat") else str(date),
                "actual": float(actual),
                "expected": float(expected_value),
                "residual": float(residual),
                "zscore": float(zscore),
                "detectors": detectors,
                "severity": severity
            })

    return anomalies