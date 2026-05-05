import { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Upload, CheckCircle2, Loader2, Download, Sparkles, TrendingUp, Database, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// Mock data for charts
const generateMockData = () => {
  const data = [];
  const baseValue = 100;
  const startDate = new Date('2024-01-01');

  // Historical data (90 days)
  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const value = baseValue + Math.sin(i / 10) * 20 + Math.random() * 10;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      historical: Math.round(value * 10) / 10,
      forecast: null,
      lower: null,
      upper: null,
    });
  }

  // Forecast data (30 days)
  for (let i = 90; i < 120; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const forecastValue = baseValue + Math.sin(i / 10) * 20 + 5;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      historical: null,
      forecast: Math.round(forecastValue * 10) / 10,
      lower: Math.round((forecastValue - 15) * 10) / 10,
      upper: Math.round((forecastValue + 15) * 10) / 10,
    });
  }

  return data;
};

const generateAnomalyData = () => {
  const data = [];
  const baseValue = 100;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const value = baseValue + Math.sin(i / 10) * 20 + Math.random() * 10;
    
    // Mark some points as anomalies
    const isAnomaly = Math.random() > 0.92;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value * 10) / 10,
      anomaly: isAnomaly ? Math.round(value * 10) / 10 : null,
    });
  }

  return data;
};

export function Dashboard() {
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileUploaded(true);
      setShowResults(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileUploaded(true);
      setShowResults(false);
    }
  };

  const handleGenerateForecast = () => {
    setIsGenerating(true);
    // Simulate processing time
    setTimeout(() => {
      setIsGenerating(false);
      setShowResults(true);
    }, 2500);
  };

  const handleNewSession = () => {
    setFileUploaded(false);
    setShowResults(false);
    setIsGenerating(false);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadReport = () => {
    const report = {
      model: 'ENSEMBLE',
      accuracy: '94.2%',
      dataPoints: 1847,
      rows: 1847,
      columns: 5,
      metric: 'Sales Revenue',
      dateRange: 'Jan 2024 - Mar 2024',
      generatedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clarityai-forecast-report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const forecastData = generateMockData();
  const anomalyData = generateAnomalyData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900">
      {/* Header */}
      <header className="backdrop-blur-md bg-slate-900/90 border-b border-white/10 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">🔮</span>
                <div>
                  <h1 className="text-2xl text-white">ClarityAI</h1>
                  <p className="text-sm text-gray-400">
                    Intelligent Time Series Forecasting & Anomaly Detection
                  </p>
                </div>
              </div>
              <p className="text-gray-300 mt-2 ml-14">Welcome to ClarityAI!</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Button onClick={handleNewSession} variant="outline" className="shadow-md hover:shadow-lg transition-shadow">
                <Sparkles className="mr-2 size-4" />
                New Session
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* File Upload Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="backdrop-blur-md bg-slate-800/90 rounded-2xl shadow-xl border border-white/10 p-8"
        >
          <h2 className="text-2xl mb-6 flex items-center gap-2 text-white">
            <Upload className="size-6 text-indigo-400" />
            Upload Your Data
          </h2>
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              fileUploaded 
                ? 'border-green-400 bg-gradient-to-br from-green-900/40 to-emerald-900/40' 
                : 'border-gray-600 hover:border-indigo-400 bg-gradient-to-br from-slate-700/40 to-slate-800/40 hover:from-indigo-900/30 hover:to-blue-900/30'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            {!fileUploaded ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Upload className="mx-auto size-16 text-gray-500 mb-4" />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-indigo-400 hover:text-indigo-300 text-lg"
                >
                  Click to upload
                </label>
                <span className="text-gray-400 text-lg"> or drag and drop</span>
                <p className="text-sm text-gray-500 mt-3">Choose a CSV or Excel file</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="size-8 text-green-400" />
                <span className="text-green-300 text-lg">✅ File uploaded successfully!</span>
                <span className="text-gray-400 ml-2">({fileName})</span>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Data Summary Section */}
        <AnimatePresence>
          {fileUploaded && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {[
                { icon: Database, label: 'Number of Rows', value: '1,847', color: 'from-blue-500 to-cyan-500' },
                { icon: TrendingUp, label: 'Number of Columns', value: '5', color: 'from-purple-500 to-pink-500' },
                { icon: Sparkles, label: 'Detected Metric', value: 'Sales Revenue', color: 'from-orange-500 to-red-500', small: true },
                { icon: Calendar, label: 'Date Range', value: 'Jan - Mar 2024', color: 'from-green-500 to-emerald-500', small: true },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                >
                  <Card className="p-6 backdrop-blur-md bg-white/70 border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${item.color} mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className="size-6 text-white" />
                    </div>
                    <div className={`${item.small ? 'text-xl' : 'text-3xl'} mb-2`}>{item.value}</div>
                    <div className="text-sm text-gray-600">{item.label}</div>
                  </Card>
                </motion.div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Forecast Action Section */}
        <AnimatePresence>
          {fileUploaded && !showResults && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/20 p-8 text-center"
            >
              <Button
                onClick={handleGenerateForecast}
                disabled={isGenerating}
                className="px-10 py-7 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-6 animate-spin" />
                    🔄 Analyzing your data and generating forecasts…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-6" />
                    🚀 Generate Forecast
                  </>
                )}
              </Button>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Results Summary Section */}
        <AnimatePresence>
          {showResults && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { label: 'Selected Model', value: 'ENSEMBLE', gradient: 'from-blue-500 to-cyan-500' },
                { label: 'Accuracy (SMAPE)', value: '94.2%', gradient: 'from-green-500 to-emerald-500' },
                { label: 'Data Points Used', value: '1,847', gradient: 'from-purple-500 to-pink-500' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className={`p-8 backdrop-blur-md bg-gradient-to-br ${item.gradient} border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group`}>
                    <div className="text-sm text-white/90 mb-3">{item.label}</div>
                    <div className="text-4xl text-white group-hover:scale-105 transition-transform">{item.value}</div>
                  </Card>
                </motion.div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Visualization Section */}
        <AnimatePresence>
          {showResults && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/20 p-8"
            >
              <Tabs defaultValue="forecast" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 h-12 bg-gray-100/50 backdrop-blur-sm">
                  <TabsTrigger value="forecast" className="text-base">📊 Forecast Plot</TabsTrigger>
                  <TabsTrigger value="anomalies" className="text-base">🔍 Anomalies</TabsTrigger>
                </TabsList>

                <TabsContent value="forecast">
                  <div className="h-96 bg-white/50 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          interval={15}
                          stroke="#6b7280"
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backdropFilter: 'blur(10px)',
                          }}
                        />
                        <Legend />
                        {/* Confidence interval */}
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stroke="none"
                          fill="#93c5fd"
                          fillOpacity={0.3}
                          name="Confidence Interval"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stroke="none"
                          fill="#ffffff"
                          fillOpacity={1}
                        />
                        {/* Historical data */}
                        <Area
                          type="monotone"
                          dataKey="historical"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="url(#colorHistorical)"
                          dot={false}
                          name="Historical"
                        />
                        {/* Forecast */}
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Forecast"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="anomalies">
                  <div className="h-96 bg-white/50 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={anomalyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          interval={10}
                          stroke="#6b7280"
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backdropFilter: 'blur(10px)',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Time Series"
                        />
                        <Line
                          type="monotone"
                          dataKey="anomaly"
                          stroke="none"
                          dot={{ fill: '#ef4444', r: 6, strokeWidth: 2, stroke: '#fff' }}
                          name="Anomalies"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Export Section */}
        <AnimatePresence>
          {showResults && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/20 p-8 text-center"
            >
              <Button 
                onClick={handleDownloadReport} 
                className="px-8 py-6 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download className="mr-2 size-5" />
                📄 Download Report (JSON)
              </Button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}