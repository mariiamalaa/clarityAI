import { useMemo } from 'react'

function getInsightIcon(index) {
  const icons = ['📈', '🎯', '⚠️', '🔄', '🏆', '📊']
  return icons[index % icons.length]
}

export default function InsightsPanel({ forecastResult }) {
  const insights = useMemo(() => {
    if (!forecastResult?.insights) return []

    return forecastResult.insights
  }, [forecastResult])

  if (!insights.length) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>AI Insights</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {insights.map((insight, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: 10,
              background: 'rgba(20, 184, 166, 0.06)',
              border: '1px solid rgba(20, 184, 166, 0.15)',
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{getInsightIcon(index)}</span>
            <span>{insight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}