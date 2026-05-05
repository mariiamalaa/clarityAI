# ClarityAI — Architecture Overview

> System architecture for non-technical committee reviewers.

---

## What it does

ClarityAI takes a CSV or Excel file from a small business owner, runs 4 machine learning forecasting models on the time series inside it, combines their predictions using a trained weighting algorithm, detects anomalies and structural shifts, and presents everything as an interactive dashboard with plain-English explanations — in under 5 minutes.

---

## System Components

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (User)                        │
│  React 18 + Vite (port 5173)                            │
│                                                          │
│  Wizard Steps:                                           │
│  [1. Upload] → [2. Columns] → [3. Configure] → [4. Results] │
│                                                          │
│  Results Dashboard:                                      │
│  KPI Cards | Insights | Chart | Model Table             │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP (proxied /api → :8000)
┌─────────────────────────▼───────────────────────────────┐
│                  BACKEND API                             │
│  FastAPI + Uvicorn (port 8000)                          │
│                                                          │
│  POST /upload     → saves file, returns file_id         │
│  GET  /profile    → auto-detects columns                 │
│  POST /validate   → checks column selections             │
│  POST /forecast   → starts background job, returns jobId │
│  GET  /status     → polls job progress                  │
│  GET  /anomalies  → returns anomaly list                 │
│  GET  /changepoints → returns changepoint list           │
│  GET  /report     → serves saved JSON report            │
└─────────────────────────┬───────────────────────────────┘
                          │ Python function calls
┌─────────────────────────▼───────────────────────────────┐
│                   ML ENGINE (src/)                       │
│                                                          │
│  ioLoading          → reads CSV / Excel                  │
│  profiling          → auto-detects column roles          │
│  dataValidator      → checks data quality                │
│  monthlyAggregation → resamples to monthly frequency     │
│  segmentation       → splits by group column             │
│                                                          │
│  models/            Forecasting models:                  │
│    ets.py           → Holt-Winters ETS                  │
│    theta.py         → Theta (M3 Competition winner)      │
│    xgb.py           → XGBoost with lag features         │
│    nbeats.py        → N-BEATS (deep learning)           │
│    metaLearner.py   → Ridge stacked ensemble             │
│                                                          │
│  anomalies.py       → STL residual Z-score detection     │
│  changePoints.py    → PELT structural shift detection    │
│  insights.py        → Plain-English bullet generation    │
└─────────────────────────────────────────────────────────┘

Storage:
  uploads/           → Uploaded files (UUID-named)
  artifacts/reports/ → JSON reports per job
```

---

## How a Forecast Request Flows

1. User uploads a CSV → `POST /upload` saves it and returns a `file_id`
2. `GET /profile/{file_id}` auto-detects which columns are date, metric, group
3. User confirms columns, `POST /validate` checks data quality
4. User clicks "Run forecast" → `POST /forecast` creates a job and returns a `jobId` immediately (< 200ms)
5. A background thread runs the full ML pipeline (30s–3min depending on data size and models)
6. Frontend polls `GET /status/{jobId}` every 2 seconds, showing live progress messages
7. When status = "done", the full result is returned and the dashboard renders

---

## Technology Choices

| Layer | Technology | Why |
|---|---|---|
| Backend API | FastAPI | Modern Python async framework, automatic docs, Pydantic validation |
| Background jobs | Python threading | Simple, in-process, no queue infrastructure needed |
| ML models | statsmodels, XGBoost, neuralforecast | Industry-standard, well-maintained libraries |
| Ensemble | scikit-learn Ridge | Simple, robust, interpretable |
| Anomaly detection | statsmodels STL + scipy | Zero-dependency, interpretable residuals |
| Changepoints | ruptures PELT | O(n) optimal algorithm, well-cited in literature |
| Frontend | React 18 + Vite | Fast HMR, modern component model |
| Charts | Recharts | Composable, accessible SVG charts for React |
| HTTP | Axios | Interceptors for global error handling |

---

## Key Design Decisions

**Async jobs over synchronous response:** Forecasting 4 models + meta-learner can take 30–120 seconds. A synchronous HTTP response would time out. The job pattern lets the frontend show real-time progress.

**Meta-learner over equal-weight averaging:** Naive averaging treats all models as equally good. Ridge regression on backtested predictions discovers the optimal per-dataset weights. The safety fallback (don't use ensemble if it's worse than the best model) guarantees robustness.

**No external job queue:** Redis, Celery, etc. add infrastructure complexity. A daemon thread per job is sufficient for a single-user demo/capstone deployment. A production version would move to a proper queue.

**Single-detector anomaly detection:** The current implementation uses STL residual Z-score only. Multi-detector consensus (Isolation Forest + One-Class SVM + Z-score) would reduce false positives further but adds model overhead not justified for the capstone scope.
