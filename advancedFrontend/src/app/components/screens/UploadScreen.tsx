import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Upload, Settings, BarChart3, ChevronRight, Sun, Moon, LogOut } from 'lucide-react';
import { FileUploader } from '@/app/components/ui/FileUploader';
import { DataTable } from '@/app/components/ui/DataTable';
import { Dropdown } from '@/app/components/ui/Dropdown';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useTheme } from '@/app/contexts/ThemeContext';

interface UploadScreenProps {
  onRunForecast: () => void;
  onLogout: () => void;
}

const mockDataPreview = {
  headers: ['Date', 'Sales', 'Revenue', 'Customers'],
  rows: [
    ['2024-01-01', '1250', '$45,000', '320'],
    ['2024-01-02', '1180', '$42,500', '298'],
    ['2024-01-03', '1320', '$48,200', '345'],
    ['2024-01-04', '1410', '$51,000', '367'],
    ['2024-01-05', '1290', '$46,800', '329']
  ]
};

export function UploadScreen({ onRunForecast, onLogout }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dateColumn, setDateColumn] = useState('');
  const [metricColumn, setMetricColumn] = useState('');
  const [groupColumn, setGroupColumn] = useState('');
  const { theme, toggleTheme } = useTheme();

  const steps = [
    { icon: Upload, label: 'Upload', active: true },
    { icon: Settings, label: 'Configure', active: false },
    { icon: BarChart3, label: 'Results', active: false }
  ];

  const columnOptions = mockDataPreview.headers.map(h => ({ value: h.toLowerCase(), label: h }));

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
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Upload Dataset
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Upload your CSV file to begin time-series forecasting
          </p>

          <Card className="mb-6">
            <FileUploader onFileSelect={setFile} />
          </Card>

          {file && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card title="Data Preview">
                <DataTable
                  headers={mockDataPreview.headers}
                  rows={mockDataPreview.rows}
                  className="mb-4"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing 5 of 1,234 rows
                </p>
              </Card>

              <Card title="Auto-Detected Fields">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Dropdown
                    label="Date Column"
                    value={dateColumn}
                    onChange={setDateColumn}
                    options={columnOptions}
                    placeholder="Select date column"
                  />
                  <Dropdown
                    label="Metric Column"
                    value={metricColumn}
                    onChange={setMetricColumn}
                    options={columnOptions}
                    placeholder="Select metric column"
                  />
                  <Dropdown
                    label="Group Column (Optional)"
                    value={groupColumn}
                    onChange={setGroupColumn}
                    options={[{ value: 'none', label: 'None' }, ...columnOptions]}
                    placeholder="Select group column"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Suggested Forecast Horizon
                    </label>
                    <div className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
                      12 months
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onRunForecast}
                  variant="primary"
                  size="lg"
                  disabled={!dateColumn || !metricColumn}
                  className="w-full md:w-auto"
                >
                  Run Forecast
                </Button>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
