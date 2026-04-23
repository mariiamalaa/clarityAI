import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import client from '../api/client'

function formatDateLabel(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return String(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
}

function buildSeriesMap(dates = [], values = []) {
  const out = new Map()
  for (let i = 0; i < Math.min(dates.length, values.length); i += 1) {
    out.set(dates[i], values[i])
  }
  return out
}

function ForecastTooltip({ active, payload, label, anomalies = [], changepoints = [] }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const range =
    row?.ensembleLower != null && row?.ensembleUpper != null
      ? `${row.ensembleLower.toFixed(2)} – ${row.ensembleUpper.toFixed(2)}`
      : null

  // Find anomaly for this date
  const anomaly = anomalies.find(a => a.date === label)
  // Find changepoint for this date
  const changepoint = changepoints.find(cp => cp.date === label)

  return (
    <div
      style={{
        background: 'rgba(10, 13, 20, 0.92)',
        color: '#fff',
        padding: 12,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.10)',
        maxWidth: 260,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{formatDateLabel(label)}</div>
      {row?.actual != null && (
        <div style={{ opacity: 0.9 }}>
          <span style={{ opacity: 0.7 }}>Actual: </span>
          <span>{Number(row.actual).toFixed(2)}</span>
        </div>
      )}
      {row?.ensemble != null && (
        <div style={{ opacity: 0.9 }}>
          <span style={{ opacity: 0.7 }}>Forecast: </span>
          <span>{Number(row.ensemble).toFixed(2)}</span>
        </div>
      )}
      {range && (
        <div style={{ opacity: 0.9 }}>
          <span style={{ opacity: 0.7 }}>Range: </span>
          <span>{range}</span>
        </div>
      )}
      {anomaly && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontWeight: 600, color: anomaly.severity === 'high' ? '#EF4444' : anomaly.severity === 'medium' ? '#F59E0B' : '#10B981', marginBottom: 4 }}>
            ⚠️ Anomaly Detected
          </div>
          <div style={{ opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>Expected: </span>
            <span>{anomaly.expected.toFixed(2)}</span>
          </div>
          <div style={{ opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>Z-score: </span>
            <span>{anomaly.zscore.toFixed(2)}</span>
          </div>
          <div style={{ opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>Detectors: </span>
            <span>{anomaly.detectors.join(', ')}</span>
          </div>
        </div>
      )}
      {changepoint && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontWeight: 600, color: '#8B5CF6', marginBottom: 4 }}>
            📈 Changepoint Detected
          </div>
          <div style={{ opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>Before: </span>
            <span>{changepoint.mean_before.toFixed(2)}</span>
          </div>
          <div style={{ opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>After: </span>
            <span>{changepoint.mean_after.toFixed(2)}</span>
          </div>
          <div style={{ opacity: 0.9 }}>
            <span style={{ opacity: 0.7 }}>Shift: </span>
            <span>{changepoint.shift_pct > 0 ? '+' : ''}{changepoint.shift_pct.toFixed(1)}%</span>
          </div>
        </div>
      )}
      {Object.keys(row || {})
        .filter((k) => k.startsWith('model_'))
        .map((k) => {
          const modelName = k.replace('model_', '')
          const v = row[k]
          if (v == null) return null
          return (
            <div key={k} style={{ opacity: 0.9 }}>
              <span style={{ opacity: 0.7 }}>{modelName}: </span>
              <span>{Number(v).toFixed(2)}</span>
            </div>
          )
        })}
    </div>
  )
}

function severityColor(severity) {
  if (severity === 'high') return '#DC2626'
  if (severity === 'medium') return '#F59E0B'
  return '#EAB308'
}

export default function ForecastChart({ forecastResult, forecastJobId }) {
  const history = forecastResult?.history
  const forecasts = forecastResult?.forecasts || {}
  const ensemble = forecastResult?.ensemble
  const changePoints = forecastResult?.changepoints || forecastResult?.changePoints || []
  const [anomalies, setAnomalies] = useState(forecastResult?.anomalies || [])
  const [showAnomalies, setShowAnomalies] = useState(true)
  const [showChangepoints, setShowChangepoints] = useState(true)

  useEffect(() => {
    setAnomalies(forecastResult?.anomalies || [])
  }, [forecastResult])

  useEffect(() => {
    if (!forecastJobId) return
    let cancelled = false
    client
      .get(`/anomalies/${forecastJobId}`)
      .then((res) => {
        if (cancelled) return
        const payload = res?.data?.anomalies
        if (Array.isArray(payload)) {
          setAnomalies(payload)
        }
      })
      .catch(() => {
        // Non-blocking enhancement: chart still renders without anomaly overlay.
      })
    return () => {
      cancelled = true
    }
  }, [forecastJobId])

  const modelNames = useMemo(() => Object.keys(forecasts || {}).sort(), [forecasts])
  const [visibleModels, setVisibleModels] = useState(() => {
    const init = {}
    modelNames.forEach((m) => {
      init[m] = false
    })
    return init
  })

  // New state for anomalies and changepoints
  const [showAnomalies, setShowAnomalies] = useState(true)
  const [showChangepoints, setShowChangepoints] = useState(true)
  const [anomalies, setAnomalies] = useState([])
  const [changepoints, setChangepoints] = useState([])

  useEffect(() => {
    setVisibleModels((prev) => {
      const next = { ...prev }
      modelNames.forEach((m) => {
        if (next[m] === undefined) next[m] = false
      })
      Object.keys(next).forEach((k) => {
        if (!modelNames.includes(k)) delete next[k]
      })
      return next
    })
  }, [modelNames])

  // Fetch anomalies and changepoints when jobId is available
  useEffect(() => {
    if (!jobId) return

    const fetchAnomalies = async () => {
      try {
        const response = await axios.get(`/api/anomalies/${jobId}`)
        setAnomalies(response.data.anomalies || [])
      } catch (error) {
        console.warn('Failed to fetch anomalies:', error)
        setAnomalies([])
      }
    }

    const fetchChangepoints = async () => {
      try {
        const response = await axios.get(`/api/changepoints/${jobId}`)
        setChangepoints(response.data.changepoints || [])
      } catch (error) {
        console.warn('Failed to fetch changepoints:', error)
        setChangepoints([])
      }
    }

    fetchAnomalies()
    fetchChangepoints()
  }, [jobId])

  const chartData = useMemo(() => {
    const actualMap = buildSeriesMap(history?.dates, history?.y)

    const ensembleDateMap = buildSeriesMap(ensemble?.dates, ensemble?.yhat)
    const ensembleLowerMap = buildSeriesMap(ensemble?.dates, ensemble?.yhat_lower)
    const ensembleUpperMap = buildSeriesMap(ensemble?.dates, ensemble?.yhat_upper)

    const modelMaps = {}
    for (const modelName of modelNames) {
      modelMaps[modelName] = buildSeriesMap(forecasts[modelName]?.dates, forecasts[modelName]?.yhat)
    }

    const anomalyByDate = new Map()
    for (const a of anomalies || []) {
      if (!a?.date) continue
      anomalyByDate.set(a.date, a)
    }

    const allDates = new Set()
    ;(history?.dates || []).forEach((d) => allDates.add(d))
    ;(ensemble?.dates || []).forEach((d) => allDates.add(d))
    for (const modelName of modelNames) {
      ;(forecasts[modelName]?.dates || []).forEach((d) => allDates.add(d))
    }

    const sortedDates = Array.from(allDates).sort()

    return sortedDates.map((date) => {
      const row = {
        date,
        actual: actualMap.get(date) ?? null,
        ensemble: ensembleDateMap.get(date) ?? null,
        ensembleLower: ensembleLowerMap.get(date) ?? null,
        ensembleUpper: ensembleUpperMap.get(date) ?? null,
        anomaly: anomalyByDate.get(date) ?? null,
      }
      for (const modelName of modelNames) {
        row[`model_${modelName}`] = modelMaps[modelName].get(date) ?? null
      }
      return row
    })
  }, [anomalies, ensemble, forecasts, history, modelNames])

  const forecastStartDate = useMemo(() => {
    const dates = ensemble?.dates || modelNames.flatMap((m) => forecasts[m]?.dates || [])
    return dates?.[0] || null
  }, [ensemble, forecasts, modelNames])

  const showBand = Boolean(ensemble?.yhat_lower?.length && ensemble?.yhat_upper?.length)
  const changePointBands = useMemo(() => {
    const sorted = (changePoints || [])
      .map((cp) => cp?.date)
      .filter(Boolean)
      .sort()
    if (!sorted.length || !chartData.length) return []
    const allDates = chartData.map((d) => d.date).filter(Boolean).sort()
    if (!allDates.length) return []
    const lastDate = allDates[allDates.length - 1]
    return sorted.map((startDate, idx) => ({
      x1: startDate,
      x2: sorted[idx + 1] || lastDate,
    }))
  }, [changePoints, chartData])

  if (!forecastResult) {
    return null
  }

  return (
    <div style={{ width: '100%', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 600 }}>Model toggles</div>
        <button
          type="button"
          onClick={() => setShowAnomalies((v) => !v)}
          style={{
            borderRadius: 999,
            padding: '6px 10px',
            border: '1px solid rgba(220,38,38,0.35)',
            background: showAnomalies ? 'rgba(220,38,38,0.14)' : '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
          aria-pressed={showAnomalies ? 'true' : 'false'}
        >
          Show anomalies
        </button>
        <button
          type="button"
          onClick={() => setShowChangepoints((v) => !v)}
          style={{
            borderRadius: 999,
            padding: '6px 10px',
            border: '1px solid rgba(249,115,22,0.35)',
            background: showChangepoints ? 'rgba(249,115,22,0.14)' : '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
          aria-pressed={showChangepoints ? 'true' : 'false'}
        >
          Show changepoints
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAnomalies(true)
            setShowChangepoints(true)
          }}
          style={{
            borderRadius: 999,
            padding: '6px 10px',
            border: '1px solid rgba(0,0,0,0.12)',
            background: showAnomalies && showChangepoints ? 'rgba(20,184,166,0.14)' : '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Show both
        </button>
        {modelNames.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setVisibleModels((prev) => ({ ...prev, [m]: !prev[m] }))}
            style={{
              borderRadius: 999,
              padding: '6px 10px',
              border: '1px solid rgba(0,0,0,0.12)',
              background: visibleModels[m] ? 'rgba(20, 184, 166, 0.14)' : '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
            aria-pressed={visibleModels[m] ? 'true' : 'false'}
          >
            {m}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)', margin: '0 8px' }} />
        <div style={{ fontWeight: 600 }}>Overlays</div>
        <button
          type="button"
          onClick={() => setShowAnomalies(!showAnomalies)}
          style={{
            borderRadius: 999,
            padding: '6px 10px',
            border: '1px solid rgba(0,0,0,0.12)',
            background: showAnomalies ? 'rgba(239, 68, 68, 0.14)' : '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
          aria-pressed={showAnomalies ? 'true' : 'false'}
        >
          Anomalies ({anomalies.length})
        </button>
        <button
          type="button"
          onClick={() => setShowChangepoints(!showChangepoints)}
          style={{
            borderRadius: 999,
            padding: '6px 10px',
            border: '1px solid rgba(0,0,0,0.12)',
            background: showChangepoints ? 'rgba(139, 92, 246, 0.14)' : '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
          aria-pressed={showChangepoints ? 'true' : 'false'}
        >
          Changepoints ({changepoints.length})
        </button>
      </div>

      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 24, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              minTickGap={18}
              axisLine={{ stroke: 'rgba(0,0,0,0.20)' }}
              tick={{ fill: 'rgba(0,0,0,0.65)', fontSize: 12 }}
            />
            <YAxis
              axisLine={{ stroke: 'rgba(0,0,0,0.20)' }}
              tick={{ fill: 'rgba(0,0,0,0.65)', fontSize: 12 }}
              width={44}
            />
            <Tooltip content={<ForecastTooltip anomalies={anomalies} changepoints={changePoints} />} />
            {showChangepoints &&
              changePointBands.map((band) => (
                <ReferenceArea
                  key={`${band.x1}:${band.x2}`}
                  x1={band.x1}
                  x2={band.x2}
                  fill="rgba(249, 115, 22, 0.12)"
                  strokeOpacity={0}
                  ifOverflow="extendDomain"
                />
              ))}

            {forecastStartDate && (
              <ReferenceLine
                x={forecastStartDate}
                stroke="rgba(0,0,0,0.45)"
                strokeDasharray="6 6"
                ifOverflow="extendDomain"
              />
            )}

            {/* Changepoint bands */}
            {showChangepoints && changepoints.map((cp, idx) => {
              // Find the next changepoint to create a band
              const nextCp = changepoints[idx + 1]
              const endDate = nextCp ? nextCp.date : null
              return (
                <ReferenceArea
                  key={`changepoint-${idx}`}
                  x1={cp.date}
                  x2={endDate}
                  fill="rgba(139, 92, 246, 0.08)"
                  fillOpacity={0.3}
                  stroke="rgba(139, 92, 246, 0.4)"
                  strokeDasharray="2 2"
                />
              )
            })}

            {showBand && (
              <Area
                type="monotone"
                dataKey="ensembleUpper"
                stroke="none"
                fill="rgba(20, 184, 166, 0.18)"
                baseLine={chartData.map((d) => d.ensembleLower)}
                isAnimationActive={false}
              />
            )}

            <Line
              type="monotone"
              dataKey="actual"
              stroke="rgba(107, 114, 128, 0.95)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {showAnomalies &&
              chartData
                .filter((d) => d?.anomaly && d?.actual != null)
                .map((d) => (
                  <ReferenceDot
                    key={`anomaly:${d.date}`}
                    x={d.date}
                    y={d.actual}
                    r={5}
                    fill={severityColor(d.anomaly.severity)}
                    stroke="#fff"
                    strokeWidth={1}
                    ifOverflow="extendDomain"
                  />
                ))}

            <Line
              type="monotone"
              dataKey="ensemble"
              stroke="rgba(20, 184, 166, 0.95)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Anomaly dots */}
            {showAnomalies && anomalies.map((anomaly, idx) => (
              <ReferenceDot
                key={`anomaly-${idx}`}
                x={anomaly.date}
                y={anomaly.actual}
                r={6}
                fill={anomaly.severity === 'high' ? '#EF4444' : anomaly.severity === 'medium' ? '#F59E0B' : '#10B981'}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}

            {modelNames.map((m, idx) => {
              if (!visibleModels[m]) return null
              const palette = ['#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9']
              const stroke = palette[idx % palette.length]
              return (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={`model_${m}`}
                  stroke={stroke}
                  strokeWidth={1.8}
                  dot={false}
                  strokeDasharray="4 3"
                  isAnimationActive={false}
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

