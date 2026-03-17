import { useMemo } from 'react'

function formatNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function formatInteger(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function formatPercentSigned(value, decimals = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toFixed(decimals)}%`
}

function formatMonth(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return String(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
}

function getBestModelBySmape(metricsByModel) {
  const entries = Object.entries(metricsByModel || {})
    .map(([model, m]) => ({ model, smape: Number(m?.smape) }))
    .filter((x) => Number.isFinite(x.smape))
  if (!entries.length) return null
  entries.sort((a, b) => a.smape - b.smape)
  return entries[0]
}

export default function KpiCards({ forecastResult }) {
  const history = forecastResult?.history
  const ensemble = forecastResult?.ensemble
  const metricsByModel = forecastResult?.metrics || forecastResult?.smape || {}

  const lastActual = useMemo(() => {
    const ys = history?.y || []
    return ys.length ? Number(ys[ys.length - 1]) : null
  }, [history])

  const lastForecast = useMemo(() => {
    const ys = ensemble?.yhat || []
    return ys.length ? Number(ys[ys.length - 1]) : null
  }, [ensemble])

  const growthPct = useMemo(() => {
    if (!Number.isFinite(lastActual) || !Number.isFinite(lastForecast)) return null
    if (lastActual === 0) return null
    return ((lastForecast - lastActual) / Math.abs(lastActual)) * 100
  }, [lastActual, lastForecast])

  const peak = useMemo(() => {
    const dates = ensemble?.dates || []
    const ys = ensemble?.yhat || []
    if (!dates.length || !ys.length) return null
    let bestIdx = 0
    let bestVal = Number(ys[0])
    for (let i = 1; i < Math.min(dates.length, ys.length); i += 1) {
      const v = Number(ys[i])
      if (v > bestVal) {
        bestVal = v
        bestIdx = i
      }
    }
    return { date: dates[bestIdx], value: bestVal }
  }, [ensemble])

  const totalProjected = useMemo(() => {
    const ys = ensemble?.yhat || []
    if (!ys.length) return null
    return ys.reduce((acc, v) => acc + Number(v || 0), 0)
  }, [ensemble])

  const accuracy = useMemo(() => {
    const best = getBestModelBySmape(metricsByModel)
    if (!best) return null
    const accuratePct = Math.max(0, Math.min(100, 100 - best.smape))
    return { model: best.model, accuratePct }
  }, [metricsByModel])

  if (!forecastResult) return null

  const cardStyle = {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 14,
    padding: 14,
    minWidth: 0,
  }

  const labelStyle = { fontSize: 12, opacity: 0.65, marginBottom: 6 }
  const valueStyle = { fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div style={cardStyle}>
        <div style={labelStyle}>Forecasted growth</div>
        <div style={valueStyle}>{formatPercentSigned(growthPct, 1)}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          From last actual → last forecast
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Peak predicted month</div>
        <div style={valueStyle}>{formatMonth(peak?.date)}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          Peak value: {formatNumber(peak?.value, 2)}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Ensemble accuracy</div>
        <div style={valueStyle}>
          {accuracy ? `${formatNumber(accuracy.accuratePct, 1)}% accurate` : '—'}
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          Best SMAPE model: {accuracy?.model || '—'}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Total projected value</div>
        <div style={valueStyle}>{totalProjected == null ? '—' : formatInteger(totalProjected)}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
          Sum of forecast \(yhat\)
        </div>
      </div>
    </div>
  )
}

