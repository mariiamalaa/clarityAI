# ClarityAI — Methodology

> Technical documentation covering all forecasting models, the meta-learner ensemble, anomaly detection pipeline, changepoint detection, and insights generation. Written for committee review at the graduation defence.

---

## 1. Problem & Motivation

Small business owners face a gap between overly simple tools (Excel, which shows the past but not the future) and overly complex platforms (Power BI, Tableau) that require dedicated data teams and weeks of setup.

ClarityAI fills that gap by letting a non-technical user upload a CSV, confirm three column selections, and receive statistically valid forecasts, anomaly alerts, changepoint detection, and plain-English insights — in under five minutes.

---

## 2. Data Pipeline

### 2.1 Ingestion
`src/ioLoading.py` reads CSV and Excel files (.csv, .xlsx, .xls) into a pandas DataFrame. The upload endpoint (`POST /upload`) validates file type and readability before accepting it.

### 2.2 Column Profiling
`src/profiling.py` scans column names and data types to suggest which column is the date, which is the metric, and which (if any) is a group/category. Heuristics include: presence of substrings like "date", "month", "time"; dtype detection for datetime-parseable values; and cardinality checks for group columns.

### 2.3 Monthly Aggregation
`src/monthlyAggregation.py` coerces the date column to proper datetime, then resamples the data to monthly frequency. If multiple rows fall in the same month they are summed. Missing months are filled with forward-filled or zero-filled values depending on context.

### 2.4 Segmentation
`src/segmentation.py` splits a dataset with a group column into one `pd.Series` per group (e.g. per region or product). Groups with fewer data points than `horizon + 3` are skipped with a warning. Growth rates per group are estimated via linear regression on recent history.

---

## 3. Forecasting Models

All models output the same structure:
```json
{
  "dates": ["2025-01-01", ...],
  "yhat":  [120.4, ...],
  "yhat_lower": [108.0, ...],
  "yhat_upper": [132.8, ...],
  "model": "ETS"
}
```

### 3.1 ETS — Holt-Winters Exponential Smoothing
**File:** `src/models/ets.py`  
**Type:** Additive decomposition (trend + seasonal + level)

Wraps `statsmodels.tsa.holtwinters.ExponentialSmoothing`. Automatically selects additive or multiplicative seasonal mode based on whether the series contains zeros (multiplicative breaks with zero). Falls back to a hand-coded Holt-Winters implementation if statsmodels is unavailable.

**Why included:** Fast, robust, interpretable. Excellent baseline for regular seasonal business data (monthly retail, monthly revenue). No hyperparameters to tune.

**Uncertainty bands:** ±1.96 × in-sample residual standard deviation (approximate 95% interval).

**Minimum data:** 12 rows.

### 3.2 Theta — Linear Decomposition
**File:** `src/models/theta.py`  
**Type:** Linear decomposition + drift

Wraps `statsmodels.tsa.forecasting.theta.ThetaModel`. The Theta method decomposes the series into two "theta lines" (one with zero slope capturing level, one with double slope capturing trend) and combines their forecasts.

**Why included:** Won the M3 International Forecasting Competition (3,003 time series benchmark). Consistently strong on monthly business series. Zero new dependencies — piggybacks on statsmodels.

**Uncertainty bands:** Derived from model prediction intervals.

**Minimum data:** 3 rows (robust on short series).

### 3.3 XGBoost — Gradient Boosting with Lag Features
**File:** `src/models/xgb.py`  
**Type:** Supervised ML with recursive multi-step forecasting

Converts the time series into a supervised learning problem using `_make_supervised()` (12 lag features). Performs a 20-iteration random hyperparameter search over `(n_estimators, max_depth, learning_rate)` with a 20% validation split and RMSE scoring. The best booster is retrained on all available data. Forecasts recursively: the predicted value at step `h` is fed back as a lag feature for step `h+1`.

**Why included:** Captures complex, non-linear trend interactions. Provides ensemble diversity vs. the decomposition-based models. Already widely used in time series competitions (M5).

**Uncertainty bands:** ±1.96 × training residual standard deviation.

**Minimum data:** `nLags + 2` rows (default: 14).

### 3.4 N-BEATS — Neural Basis Expansion Analysis
**File:** `src/models/nbeats.py`  
**Type:** Deep learning (pure neural, no feature engineering)

Wraps `neuralforecast.models.NBEATS`. N-BEATS uses a deep stack of fully connected layers with backward and forward residual connections. It requires no hand-engineered features — the architecture itself learns the basis expansions for trend and seasonality.

**Why included:** Only neural model in the stack. Adds architectural diversity to the ensemble. Consistently top-performing on Makridakis Competition datasets.

**Configuration:** `input_size = 2 × horizon`, `max_steps = 80`, `loss = MAE`, conformal 95% prediction intervals.

**Minimum data:** 36 months (enforced). Jobs with shorter history skip N-BEATS gracefully.

---

## 4. Meta-Learner Stacked Ensemble

**File:** `src/models/metaLearner.py`  
**Type:** Stacked generalisation (Ridge regression)

This is the **core academic contribution** of ClarityAI.

### 4.1 Training Phase
1. Each model is backtested: trained on `series[:-horizon]`, then predicts `series[-horizon:]`
2. Out-of-sample predictions from all models are stacked as columns of a feature matrix **X** (shape: `horizon × n_models`)
3. The actual held-out values form the target vector **y**
4. A `Ridge(alpha=1.0)` regression is fitted: **ŷ_ensemble = Ridge.predict(X)**
5. Ridge coefficients (made non-negative and normalised to sum to 1) become the **model weights**

### 4.2 Inference Phase
The Ridge model is applied to the future forecasts from all models to produce the final ensemble. Confidence bands are combined using the same weights (linear combination).

### 4.3 Why Better Than Equal-Weight Averaging
Equal weighting assumes all models are equally good on every dataset. Ridge regression discovers which combination minimises error on *this specific dataset* through backtesting. On datasets with strong seasonality, ETS/Theta tend to dominate. On irregular non-linear series, XGB/N-BEATS get higher weight.

### 4.4 Safety Fallback
If the Ridge ensemble SMAPE exceeds the best single model SMAPE, the ensemble falls back to that best single model. This prevents the ensemble from being worse than its best component. Weights sum to exactly 100% at all times.

---

## 5. Anomaly Detection

**File:** `src/anomalies.py`

### 5.1 STL Residual Extraction
The series is decomposed using **STL (Seasonal-Trend decomposition using LOESS)** via `statsmodels.tsa.seasonal.STL`. The expected value is `trend + seasonal`. The residual is `actual - expected`.

### 5.2 Z-Score Threshold
The residual Z-score is computed as `residual / std(residual)`. Points where `|Z| ≥ 2.5σ` are flagged:

| |Z| range | Severity |
|---|---|---|
| 2.5 – 3.5 | Low |
| 3.5+ | Medium / High |

### 5.3 Why STL
STL is robust to outliers and handles arbitrary seasonal patterns. Unlike differencing-based methods, it produces interpretable expected values that are shown to the user in the tooltip ("Expected: 142.3, Actual: 89.1").

---

## 6. Changepoint Detection

**File:** `src/changePoints.py`  
**Library:** `ruptures` (PELT algorithm)

**PELT (Pruned Exact Linear Time)** detects the globally optimal set of breakpoints in a piecewise-constant signal. It runs in `O(n)` time on most inputs.

Configuration: `model="rbf"` (radial basis function kernel), `pen=10` (penalty term controlling number of breakpoints).

For each detected changepoint, ClarityAI reports:
- `date`: ISO date of the structural shift
- `mean_before` / `mean_after`: mean values of each segment
- `shift_pct`: `(mean_after - mean_before) / mean_before × 100`

Changepoints appear as purple shaded bands on the forecast chart, distinct from red anomaly dots.

**Distinction from anomalies:** Anomalies are transient (one-off spikes). Changepoints are permanent structural shifts (new competitor, price change, external shock) where the *level* of the series changes and stays changed.

---

## 7. Insights Generation

**File:** `src/insights.py`

Generates 4–6 plain-English bullet points deterministically from the forecast result:

1. **Trend direction**: `"Upward trend of +18.3% forecast over the next 6 months"`
2. **Peak month**: `"Peak forecast in April 2025 at 4,230 units (+22% vs current)"`
3. **Anomaly summary** (conditional): `"3 anomalies detected (1 high, 2 medium severity)"`
4. **Changepoint summary** (conditional): `"2 structural shifts detected with avg 31% mean shift"`
5. **Best model**: `"Best model: ETS with 91.4% accuracy (SMAPE-based)"`
6. **Uncertainty warning** (conditional): `"High forecast uncertainty — 34.2% average confidence band width"`

Insights 3, 4, and 6 are omitted if the data doesn't warrant them (zero anomalies, zero changepoints, narrow bands), keeping the output clean.

---

## 8. Data Flow Summary

```
Upload CSV/Excel
    └─► Validate file type and readability
         └─► Profile columns (auto-detect date / metric / group)
              └─► User confirms column selections
                   └─► POST /forecast → Job ID returned immediately
                        └─► Background thread:
                             1. Load file
                             2. Coerce dates → monthly aggregation
                             3. [Optional] Segment by group
                             4. For each series:
                                a. Backtest each model → collect predictions
                                b. Train Ridge meta-learner on backtest predictions
                                c. Run each model on full series → future forecasts
                                d. Combine forecasts via Ridge → ensemble + bands
                                e. PELT changepoint detection
                                f. STL residual anomaly detection
                                g. Generate insights
                             5. Store result in job store
                             6. Save JSON report to artifacts/reports/
                        └─► Frontend polls GET /status every 2s
                             └─► Results dashboard:
                                  KPI Cards → Insights → Changepoint/Anomaly chart
                                  → Model Contribution → Model Accuracy Table
```

---

## 9. Academic Context

This project was developed as a graduation capstone. The core research contribution is the **adaptive meta-learner ensemble** — a stacked generalisation approach that learns per-dataset model weights through backtesting, outperforming naive equal-weight averaging across diverse time-series datasets. The safety fallback (ensemble ≤ best single model) ensures robustness on any dataset.
