import React from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '@/app/contexts/ThemeContext';

interface PlotlyChartProps {
  data: any[];
  layout?: Partial<any>;
  config?: Partial<any>;
  className?: string;
}

export function PlotlyChart({ data, layout = {}, config = {}, className = '' }: PlotlyChartProps) {
  const { theme } = useTheme();

  const defaultLayout = {
    autosize: true,
    paper_bgcolor: theme === 'dark' ? '#1f2937' : '#ffffff',
    plot_bgcolor: theme === 'dark' ? '#111827' : '#f9fafb',
    font: {
      color: theme === 'dark' ? '#e5e7eb' : '#374151',
    },
    xaxis: {
      gridcolor: theme === 'dark' ? '#374151' : '#e5e7eb',
    },
    yaxis: {
      gridcolor: theme === 'dark' ? '#374151' : '#e5e7eb',
    },
    ...layout,
  };

  const defaultConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...config,
  };

  return (
    <div className={className}>
      <Plot
        data={data}
        layout={defaultLayout}
        config={defaultConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </div>
  );
}
