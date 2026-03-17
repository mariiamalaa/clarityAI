import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const range =
    row?.ensembleLower != null && row?.ensembleUpper != null
      ? `${row.ensembleLower.toFixed(2)} – ${row.ensembleUpper.toFixed(2)}`
      : null

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

export default function ForecastChart({ forecastResult }) {
  const history = forecastResult?.history
  const forecasts = forecastResult?.forecasts || {}
  const ensemble = forecastResult?.ensemble

  const modelNames = useMemo(() => Object.keys(forecasts || {}).sort(), [forecasts])
  const [visibleModels, setVisibleModels] = useState(() => {
    const init = {}
    modelNames.forEach((m) => {
      init[m] = false
    })
    return init
  })

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

  const chartData = useMemo(() => {
    const actualMap = buildSeriesMap(history?.dates, history?.y)

    const ensembleDateMap = buildSeriesMap(ensemble?.dates, ensemble?.yhat)
    const ensembleLowerMap = buildSeriesMap(ensemble?.dates, ensemble?.yhat_lower)
    const ensembleUpperMap = buildSeriesMap(ensemble?.dates, ensemble?.yhat_upper)

    const modelMaps = {}
    for (const modelName of modelNames) {
      modelMaps[modelName] = buildSeriesMap(forecasts[modelName]?.dates, forecasts[modelName]?.yhat)
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
      }
      for (const modelName of modelNames) {
        row[`model_${modelName}`] = modelMaps[modelName].get(date) ?? null
      }
      return row
    })
  }, [ensemble, forecasts, history, modelNames])

  const forecastStartDate = useMemo(() => {
    const dates = ensemble?.dates || modelNames.flatMap((m) => forecasts[m]?.dates || [])
    return dates?.[0] || null
  }, [ensemble, forecasts, modelNames])

  const showBand = Boolean(ensemble?.yhat_lower?.length && ensemble?.yhat_upper?.length)

  if (!forecastResult) {
    return null
  }

  return (
    <div style={{ width: '100%', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 600 }}>Model toggles</div>
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
            <Tooltip content={<ForecastTooltip />} />

            {forecastStartDate && (
              <ReferenceLine
                x={forecastStartDate}
                stroke="rgba(0,0,0,0.45)"
                strokeDasharray="6 6"
                ifOverflow="extendDomain"
              />
            )}

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

            <Line
              type="monotone"
              dataKey="ensemble"
              stroke="rgba(20, 184, 166, 0.95)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

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

