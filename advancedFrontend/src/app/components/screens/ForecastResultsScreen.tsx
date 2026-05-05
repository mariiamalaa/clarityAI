import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Upload,
  Settings,
  BarChart3,
  ChevronRight,
  Download,
  Sun,
  Moon,
  LogOut,
  FileJson
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';
import { PlotlyChart } from '@/app/components/ui/PlotlyChart';
import { useTheme } from '@/app/contexts/ThemeContext';

interface ForecastResultsScreenProps {
  onViewAnomalies: () => void;
  onLogout: () => void;
}

// Mock data for forecast chart
const generateForecastData = () => {
  const dates = [];
  const historical = [];
  const forecast = [];
  const lower = [];
  const upper = [];

  const startDate = new Date('2024-01-01');
  
  // Historical data (12 months)
  for (let i = 0; i < 12; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);
    const value = 1000 + Math.sin(i / 2) * 200 + Math.random() * 100;
    historical.push(value);
  }
  
  // Forecast data (12 months)
  for (let i = 12; i < 24; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    dates.push(date.toISOString().split('T')[0]);
    const value = 1100 + Math.sin(i / 2) * 220 + i * 10;
    forecast.push(value);
    lower.push(value - 150);
    upper.push(value + 150);
  }

  return { dates, historical, forecast, lower, upper };
};

const mockBacktestData = {
  headers: ['Fold', 'Actual', 'Predicted', 'SMAPE'],
  rows: [
    ['1', '1245', '1198', '3.8%'],
    ['2', '1180', '1215', '2.9%'],
    ['3', '1320', '1298', '1.7%'],
    ['4', '1410', '1445', '2.5%'],
    ['5', '1290', '1312', '1.7%']
  ]
};

export function ForecastResultsScreen({ onViewAnomalies, onLogout }: ForecastResultsScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const { dates, historical, forecast, lower, upper } = generateForecastData();

  const steps = [
    { icon: Upload, label: 'Upload', active: false },
    { icon: Settings, label: 'Configure', active: false },
    { icon: BarChart3, label: 'Results', active: true }
  ];

  // Prepare chart data
  const chartData = [
    {
      x: dates.slice(0, 12),
      y: historical,
      name: 'Historical',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#8b5cf6', width: 2 },
    },
    {
      x: dates.slice(12),
      y: forecast,
      name: 'Forecast',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#3b82f6', width: 2, dash: 'dash' },
    },
    {
      x: [...dates.slice(12), ...dates.slice(12).reverse()],
      y: [...upper, ...lower.reverse()],
      fill: 'toself',
      fillcolor: 'rgba(59, 130, 246, 0.2)',
      line: { color: 'transparent' },
      name: 'Confidence Interval',
      type: 'scatter',
      mode: 'lines',
    },
  ];

  const chartLayout = {
    title: 'Time Series Forecast',
    xaxis: { title: 'Date' },
    yaxis: { title: 'Value' },
    hovermode: 'x unified',
    height: 400,
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">ClarityAI</h1>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                step.active
                  ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <step.icon className="w-5 h-5" />
              <span className="flex-1 font-medium">{step.label}</span>
              {step.active && <ChevronRight className="w-4 h-4" />}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6 space-y-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-600 dark:text-gray-400"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span className="font-medium">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Forecast Results
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Analysis complete with 12-month forecast
              </p>
            </div>
            <Button onClick={onViewAnomalies} variant="outline">
              View Anomalies
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Forecast Plot */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Forecast Plot
                </h3>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
              </div>
              <PlotlyChart data={chartData} layout={chartLayout} />
            </Card>

            {/* Model Summary Card */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Model Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Best Model</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    Prophet
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">SMAPE Score</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-500">
                    2.54%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Backtest Summary
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    5-fold cross-validation
                    <br />
                    Avg. accuracy: 97.46%
                  </p>
                </div>
                <Button variant="primary" className="w-full mt-4">
                  <FileJson className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </Card>
          </div>

          {/* Backtest Table */}
          <Card title="Backtest Results">
            <DataTable headers={mockBacktestData.headers} rows={mockBacktestData.rows} />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Rolling-origin validation with 5 folds
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
