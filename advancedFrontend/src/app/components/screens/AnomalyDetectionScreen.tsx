import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
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

interface AnomalyDetectionScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

// Generate mock residuals data
const generateResidualsData = () => {
  const dates = [];
  const residuals = [];
  const anomalies = [];
  const anomalyDates = [];
  
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < 24; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
    
    // Generate residual with occasional anomalies
    let residual = (Math.random() - 0.5) * 50;
    
    if (i === 5 || i === 12 || i === 18) {
      residual = (Math.random() > 0.5 ? 1 : -1) * (150 + Math.random() * 50);
      anomalies.push(residual);
      anomalyDates.push(dateStr);
    } else {
      residuals.push(residual);
    }
  }
  
  return { dates, residuals, anomalies, anomalyDates };
};

const mockAnomaliesTable = {
  headers: ['Date', 'Value', 'Residual', 'Z-Score', 'Flags'],
  rows: [
    ['2024-06-01', '1850', '+187.5', '3.8', '🔴 High'],
    ['2024-12-01', '980', '-172.3', '-3.5', '🔴 Low'],
    ['2025-07-01', '1920', '+195.8', '4.1', '🔴 High']
  ]
};

export function AnomalyDetectionScreen({ onBack, onLogout }: AnomalyDetectionScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const [showContextual, setShowContextual] = useState(true);
  const { dates, residuals, anomalies, anomalyDates } = generateResidualsData();

  // Prepare chart data
  const chartData = [
    {
      x: dates,
      y: dates.map((date, i) => {
        const anomalyIndex = anomalyDates.indexOf(date);
        return anomalyIndex >= 0 ? null : residuals.shift();
      }),
      name: 'Normal Residuals',
      type: 'scatter',
      mode: 'markers',
      marker: {
        size: 6,
        color: '#8b5cf6',
      },
    },
    {
      x: anomalyDates,
      y: anomalies,
      name: 'Anomalies',
      type: 'scatter',
      mode: 'markers',
      marker: {
        size: 12,
        color: '#ef4444',
        symbol: 'x',
      },
    },
  ];

  const chartLayout = {
    title: 'Residuals Plot with Anomalies',
    xaxis: { title: 'Date' },
    yaxis: { title: 'Residual Value' },
    hovermode: 'closest',
    height: 400,
    shapes: [
      {
        type: 'line',
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: 0,
        y1: 0,
        line: {
          color: theme === 'dark' ? '#6b7280' : '#9ca3af',
          width: 2,
          dash: 'dash',
        },
      },
    ],
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
          <button
            onClick={onBack}
            className="flex items-center gap-3 w-full p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="flex-1 font-medium">Anomalies</span>
          </button>
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
              <Button onClick={onBack} variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Results
              </Button>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Anomalies Detected
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                STL decomposition with contextual anomaly detection
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            {/* Stats Cards */}
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Anomalies
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-500">3</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">High Values</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-500">2</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Low Values</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-500">1</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Detection Rate</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  12.5%
                </p>
              </div>
            </Card>
          </div>

          {/* Residuals Plot */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Residuals Plot
              </h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={showContextual}
                    onChange={(e) => setShowContextual(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Show contextual anomalies
                </label>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
              </div>
            </div>
            <PlotlyChart data={chartData} layout={chartLayout} />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Red markers indicate detected anomalies using STL decomposition with z-score threshold of 3.0
            </p>
          </Card>

          {/* Anomalies Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Anomalies Table
              </h3>
              <Button variant="primary" size="sm">
                <FileJson className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            </div>
            <DataTable headers={mockAnomaliesTable.headers} rows={mockAnomaliesTable.rows} />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Anomalies flagged based on residual z-score &gt; 3.0
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
