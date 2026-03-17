import { useMemo } from 'react'

function formatNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(decimals)
}

function pickWinner(rows) {
  const valid = rows.filter((r) => Number.isFinite(r.smape))
  if (!valid.length) return null
  valid.sort((a, b) => a.smape - b.smape)
  return valid[0].model
}

export default function ModelAccuracyTable({ forecastResult }) {
  const metricsByModel = forecastResult?.metrics || forecastResult?.smape || {}

  const rows = useMemo(() => {
    return Object.entries(metricsByModel)
      .map(([model, m]) => ({
        model,
        smape: Number(m?.smape),
        mae: Number(m?.mae),
      }))
      .sort((a, b) => a.model.localeCompare(b.model))
  }, [metricsByModel])

  const winner = useMemo(() => pickWinner(rows), [rows])

  if (!forecastResult) return null

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Model accuracy</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Winner = lowest SMAPE</div>
      </div>

      <div style={{ marginTop: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {['Model', 'SMAPE', 'MAE'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    fontSize: 12,
                    letterSpacing: '0.02em',
                    opacity: 0.65,
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(0,0,0,0.10)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 12, opacity: 0.7 }}>
                  No accuracy metrics available.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isWinner = winner && r.model === winner
                return (
                  <tr
                    key={r.model}
                    style={{
                      background: isWinner ? 'rgba(34, 197, 94, 0.10)' : 'transparent',
                    }}
                    title={isWinner ? 'Why this won: it has the lowest SMAPE on the backtest window.' : undefined}
                  >
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ fontWeight: isWinner ? 700 : 600 }}>{r.model}</span>
                      {isWinner && (
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'rgba(34, 197, 94, 0.16)',
                            color: 'rgb(21, 128, 61)',
                            border: '1px solid rgba(34, 197, 94, 0.25)',
                          }}
                        >
                          Winner
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      {Number.isFinite(r.smape) ? formatNumber(r.smape, 2) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      {Number.isFinite(r.mae) ? formatNumber(r.mae, 2) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

