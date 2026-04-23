import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ModelContributionPanel({ forecastResult }) {
  const modelWeights = forecastResult?.modelWeights || forecastResult?.model_weights || {}

  const data = Object.entries(modelWeights)
    .map(([model, weight]) => ({
      model,
      weight: Number(weight),
      percentage: `${Math.round(Number(weight))}%`,
      label: `${model} ${Math.round(Number(weight))}%`
    }))
    .sort((a, b) => b.weight - a.weight)

  if (!data.length) return null

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { model, weight } = payload[0].payload
      return (
        <div style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '14px'
        }}>
          {model} contributed {Math.round(weight)}% of ensemble for this dataset
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Model contribution</div>
      <div style={{ height: 300, width: '100%' }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="weight" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
        Weights learned from backtesting — higher = better fit for your data
      </div>
    </div>
  )
}