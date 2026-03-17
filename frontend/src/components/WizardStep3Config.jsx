import { useEffect, useMemo, useRef, useState } from 'react'
import client from '../api/client'

const MODEL_OPTIONS = [
  {
    value: 'ensemble',
    label: 'Full Ensemble',
    tooltip: 'Runs Prophet + LightGBM (and other supported models) and combines them into a single forecast.',
  },
  {
    value: 'classical',
    label: 'Classical',
    tooltip: 'Runs traditional time-series models like Prophet/ETS/ARIMA-style baselines (where available).',
  },
  {
    value: 'ml',
    label: 'ML',
    tooltip: 'Runs machine-learning models like LightGBM with time-series features (where available).',
  },
  {
    value: 'custom',
    label: 'Custom',
    tooltip: 'Choose a custom subset of models (coming soon).',
  },
]

export default function WizardStep3Config({ wizardState, onUpdate, onNext }) {
  const [horizon, setHorizon] = useState(wizardState.horizon ?? 6)
  const [models, setModels] = useState(wizardState.models ?? 'ensemble')
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Preparing...')
  const [error, setError] = useState(null)
  const jobIdRef = useRef(null)

  const fallbackMessages = useMemo(() => ['Running Prophet...', 'Running LightGBM...'], [])

  useEffect(() => {
    if (!submitting || !jobIdRef.current) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await client.get(`/status/${jobIdRef.current}`)
        const data = res.data

        if (!cancelled) {
          setStatusMessage(data.progress || data.status || 'Working...')
        }

        if (data.status === 'done') {
          onUpdate?.({ forecastJobId: jobIdRef.current, forecastResult: data.result || null })
          onNext?.()
          return
        }

        if (data.status === 'error') {
          throw new Error(data.error || 'Forecast failed')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to fetch job status')
          setSubmitting(false)
        }
        return
      }
      setTimeout(poll, 2000)
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [submitting, onNext, onUpdate])

  useEffect(() => {
    if (!submitting) return
    const t = setInterval(() => {
      setStatusMessage((prev) => prev || fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)])
    }, 1500)
    return () => clearInterval(t)
  }, [submitting, fallbackMessages])

  const handleSubmit = async () => {
    setError(null)

    const payload = {
      file_id: wizardState.fileId,
      date_col: wizardState.dateCol,
      metric_col: wizardState.metricCol,
      group_col: wizardState.groupCol || null,
      horizon: Number(horizon),
      models,
    }

    // Acceptance criteria: log full payload before submitting
    // eslint-disable-next-line no-console
    console.log('Forecast payload', payload)

    setSubmitting(true)
    setStatusMessage('Submitting forecast job...')
    try {
      onUpdate?.({ horizon: Number(horizon), models })
      const res = await client.post('/forecast', payload)
      const jobId = res.data?.jobId
      if (!jobId) throw new Error('No jobId returned from /forecast')
      jobIdRef.current = jobId
      setStatusMessage('Queued...')
    } catch (err) {
      setError(err.message || 'Failed to start forecast')
      setSubmitting(false)
    }
  }

  if (submitting) {
    return (
      <div className="configStep">
        <div className="loadingState">
          <div className="uploadSpinner"></div>
          <p>{statusMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="configStep">
      <h2 className="columnsTitle">Configure your forecast</h2>
      <p className="columnsSubtitle">Set a horizon and choose the model group to run</p>

      <div className="configForm">
        <div className="configSection">
          <div className="configHeaderRow">
            <div className="configLabel">Horizon</div>
            <div className="configHint">{`Forecast the next ${horizon} months`}</div>
          </div>
          <input
            className="horizonSlider"
            type="range"
            min={1}
            max={24}
            step={1}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            aria-label="Forecast horizon in months"
          />
          <div className="sliderTicks">
            <span>1</span>
            <span>24</span>
          </div>
        </div>

        <div className="configSection">
          <div className="configHeaderRow">
            <div className="configLabel">Model group</div>
            <div className="configHint">Full Ensemble is recommended</div>
          </div>

          <div className="modelGrid" role="radiogroup" aria-label="Model group selector">
            {MODEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`modelOption ${models === opt.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="models"
                  value={opt.value}
                  checked={models === opt.value}
                  onChange={() => setModels(opt.value)}
                />
                <div className="modelOptionText">
                  <span className="modelOptionLabel">{opt.label}</span>
                  <span className="modelOptionInfo" title={opt.tooltip} aria-label={opt.tooltip}>
                    ⓘ
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="uploadError">
          <span className="errorIcon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="columnsActions">
        <button
          className="btnPrimary"
          onClick={handleSubmit}
          disabled={!wizardState.fileId || !wizardState.dateCol || !wizardState.metricCol}
        >
          Run forecast
        </button>
      </div>
    </div>
  )
}
