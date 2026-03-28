# ClarityAI

> Turn your business data into decisions — no technical expertise required.

ClarityAI is an AI-powered forecasting and analytics platform built for small business owners. Upload a CSV or Excel file, answer three guided questions, and get enterprise-grade forecasts, anomaly alerts, and plain-English insights in under five minutes.

---

## The problem

Small business owners are stuck between two worlds that don't work for them.

**Too simple:** Excel and Google Sheets can visualize past data but have no predictive power. They show you what happened — not what's coming.

**Too complex:** Power BI and Tableau require dedicated data teams, weeks of setup, and technical expertise most small businesses don't have. Tableau starts at $70/user/month and still won't tell you what your data *means*.

**The gap:** There is no accessible tool that takes a non-technical business owner from raw data to a statistically valid forecast, anomaly detection, and plain-English recommendations — in minutes, not weeks.

ClarityAI fills that gap.

---

## What ClarityAI does

### Guided wizard
No configuration knowledge required. ClarityAI auto-detects your date column, metric column, and grouping from your file. You confirm in three clicks and choose how far ahead to forecast.

### Multi-model ensemble forecasting
ClarityAI runs seven forecasting models simultaneously and combines them using a trained meta-learner that learns the optimal weight for each model on your specific dataset. Every forecast includes confidence bands and a reported accuracy score (SMAPE).

### Consensus anomaly detection
Three independent anomaly detectors (Isolation Forest, One-Class SVM, and Robust Z-score) run on the residuals of your time series. A data point is only flagged as an anomaly when at least two methods agree — minimising false alarms. Anomalies appear as markers on the forecast chart with a tooltip showing the date, actual value, expected value, and Z-score.

### Changepoint detection
Beyond one-off anomalies, ClarityAI detects permanent structural shifts in your data — moments where the underlying trend changed (a new competitor, a price change, an external shock). These appear as shaded bands on the chart, distinct from anomaly markers.

### Plain-English insights
ClarityAI generates 4–6 insight bullets from your forecast and anomaly results. Examples:
- "Upward trend of +18% forecast over the next 6 months"
- "Peak expected in April at 4,200 units — 22% above current"
- "2 anomalies detected — August 2023 was 2.3σ below expected"
- "Structural shift detected in March 2022 — mean increased by 31%"
- "Best model: Prophet with 91.4% accuracy (SMAPE)"

### KPI summary cards
Four auto-computed KPIs update live above the chart: forecasted growth %, peak predicted month, ensemble accuracy score, and total projected value.

### Group segmentation
If your dataset has a group column (product, region, store), ClarityAI runs a separate forecast per group and lets you switch between them with a dropdown. A summary table ranks all groups by forecasted growth.

### One-click report export
Download a PDF report containing the forecast chart, KPI cards, anomaly list, insight bullets, and model accuracy comparison — ready to share with stakeholders.

---

## Model stack

| Model | Type | Why it's included |
|---|---|---|
| Prophet | Additive decomposition | Handles holidays, trend shifts, and missing data robustly |
| SARIMA | Classical seasonal | Strong baseline for regular seasonal patterns |
| LightGBM | Gradient boosting | Captures complex non-linear trends via lag features |
| XGBoost | Gradient boosting | Diverse boosting implementation — improves ensemble quality |
| Holt-Winters (ETS) | Exponential smoothing | Fast, reliable baseline for multiplicative seasonality |
| Theta | Linear decomposition | Won the M3 International Forecasting Competition |
| N-BEATS | Deep learning | Pure neural approach — no feature engineering required |
| **Meta-learner (Ridge)** | **Stacked ensemble** | **Learns optimal model weights per dataset via backtesting** |

The meta-learner is the core academic contribution of this project. Rather than averaging model outputs equally, it trains a Ridge regression on out-of-sample predictions from all seven models to discover which combination minimises error for each specific dataset.

---

## Anomaly detection stack

| Method | Approach | Catches |
|---|---|---|
| Isolation Forest | Tree-based outlier isolation | Global outliers in residual space |
| One-Class SVM | Boundary-based novelty detection | Distributional anomalies |
| Robust Z-score (MAD) | Statistical threshold (3.5σ) | Extreme residual spikes |

A point is flagged only when **at least 2 of 3 methods agree** — this consensus approach dramatically reduces false positives compared to any single method.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| ML pipeline | Python — Prophet, statsmodels, LightGBM, XGBoost, scikit-learn, neuralforecast |
| Anomaly detection | scikit-learn, scipy |
| Changepoint detection | ruptures (PELT algorithm) |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| HTTP client | Axios |

---

## Academic context

This project was developed as a graduation capstone. The core research contribution is the **adaptive meta-learner ensemble** — a stacked generalisation approach that learns per-dataset model weights through backtesting, outperforming naive equal-weight averaging across diverse time-series datasets.
The anomaly detection pipeline extends the consensus approach described in the literature: combining tree-based, kernel-based, and statistical methods reduces false positive rates compared to any single detector, particularly on short monthly business series where individual methods are prone to over-flagging.
