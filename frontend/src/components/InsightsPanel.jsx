import { useMemo } from 'react'

const INSIGHT_ICONS = ['📈', '📅', '🚨', '🧭', '🤖', '⚠️']

export default function InsightsPanel({ forecastResult }) {
  const insights = useMemo(() => {
    const arr = forecastResult?.insights
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()) : []
  }, [forecastResult])

  if (!forecastResult) return null

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        border: '1px solid rgba(0,0,0,0.08)',
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Plain-English insights</div>
      {!insights.length ? (
        <div style={{ opacity: 0.7, fontSize: 14 }}>No insights available.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {insights.map((text, idx) => (
            <div
              key={`${idx}:${text}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 14,
                lineHeight: 1.35,
              }}
            >
              <span aria-hidden>{INSIGHT_ICONS[idx] || '•'}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
