import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Upload,
  Settings,
  BarChart3,
  Download,
  Sun,
  Moon,
  Zap,
  Sparkles,
  ArrowLeft,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Target,
  BarChart
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';
import { PlotlyChart } from '@/app/components/ui/PlotlyChart';
import { useTheme } from '@/app/contexts/ThemeContext';

interface ForecastResultsScreenProps {
  forecastResult: any;
  onViewAnomalies: () => void;
  onReset: () => void;
}

export function ForecastResultsScreen({ forecastResult, onViewAnomalies, onReset }: ForecastResultsScreenProps) {
  const { theme, toggleTheme } = useTheme();

  const isGrouped = forecastResult.grouped === true;
  const groups = isGrouped ? Object.keys(forecastResult.groups || {}) : [];
  const [selectedGroup, setSelectedGroup] = useState(groups.length > 0 ? groups[0] : '');

  const steps = [
    { icon: Upload, label: 'Prepare Data', active: false },
    { icon: Settings, label: 'Analyzing Data', active: false },
    { icon: BarChart3, label: 'Insights Dashboard', active: true }
  ];

  const targetData = isGrouped 
    ? (forecastResult.groups[selectedGroup] || {}) 
    : forecastResult;
  
  if (!targetData || (!targetData.ensemble && !targetData.forecasts)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-8">
        <Card className="max-w-md p-12 text-center border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
          <CardHeader>
             <CardTitle className="text-2xl font-bold">Analysis Incomplete</CardTitle>
             <CardDescription className="text-slate-500 mt-2">
                We couldn't generate a reliable forecast with the provided data segment.
             </CardDescription>
          </CardHeader>
          <CardFooter className="pt-8">
             <Button onClick={onReset} className="w-full h-14 rounded-2xl font-bold">Back to Analysis</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const history = targetData.history || { dates: [], y: [] };
  const ensemble = targetData.ensemble || { dates: [], yhat: [], yhat_lower: [], yhat_upper: [] };
  const smape = targetData.smape || {};
  const insights = targetData.insights || forecastResult.insights || [];

  const chartData = [
    {
      x: history.dates,
      y: history.y,
      name: 'Historical Actuals',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#6366f1', width: 3 },
    },
    {
      x: ensemble.dates,
      y: ensemble.yhat,
      name: 'Forecast Baseline',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#a855f7', width: 3, dash: 'dash' },
    },
    {
      x: [...ensemble.dates, ...[...ensemble.dates].reverse()],
      y: [...ensemble.yhat_upper, ...[...ensemble.yhat_lower].reverse()],
      fill: 'toself',
      fillcolor: theme === 'dark' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.05)',
      line: { color: 'transparent' },
      name: 'Confidence Range',
      type: 'scatter',
      mode: 'lines',
    },
  ];

  const chartLayout = {
    xaxis: { 
      gridcolor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
      zeroline: false
    },
    yaxis: { 
      gridcolor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
      zeroline: false
    },
    hovermode: 'x unified',
    height: 480,
    margin: { l: 40, r: 20, t: 20, b: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      color: theme === 'dark' ? '#94a3b8' : '#64748b',
      family: 'Inter, sans-serif'
    },
    showlegend: true,
    legend: { orientation: 'h', y: -0.15 }
  };

  let bestSmape = 0;
  if (Object.keys(smape).length > 0) {
    const sortedModels = Object.entries(smape).sort((a: any, b: any) => a[1].smape - b[1].smape);
    bestSmape = sortedModels[0][1].smape;
  }

  const backtestHeaders = ['Model', 'Accuracy (SMAPE ↓)', 'Avg Error'];
  const backtestRows = Object.entries(smape).map(([model, metrics]: any) => [
    model,
    `${metrics.smape.toFixed(1)}%`,
    metrics.mae.toLocaleString(undefined, { maximumFractionDigits: 0 })
  ]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900/40 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 flex flex-col shadow-sm">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">ClarityAI</h1>
        </div>

        <nav className="space-y-3 flex-1">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                step.active
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50'
                  : 'text-slate-400 dark:text-slate-600 opacity-60 font-semibold'
              }`}
            >
              <step.icon className="w-5 h-5" />
              <span className="text-sm">{step.label}</span>
            </div>
          ))}

          {isGrouped && (
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
               <div className="flex items-center gap-2 text-slate-400 px-2">
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Breakdown</span>
               </div>
               <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {groups.map(group => (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                        selectedGroup === group 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
               </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button
            onClick={onReset}
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Start New Analysis
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-slate-400 font-semibold text-xs"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>Mode Toggle</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto space-y-12"
        >
          <header className="flex items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3">
                <Sparkles className="w-5 h-5 fill-indigo-600 dark:fill-indigo-400 opacity-30" />
                <span className="text-sm font-bold tracking-tight">Here’s what your data is telling you.</span>
              </div>
              <h2 className="text-5xl font-black tracking-tight mb-2">
                {isGrouped ? `${selectedGroup}` : 'Analysis Overview'} <span className="text-slate-300 dark:text-slate-700 font-light mx-2">/</span> <span className="text-slate-400 font-light">Insights Dashboard</span>
              </h2>
            </div>
            <div className="flex gap-4 mb-1">
              <Button onClick={() => window.print()} variant="outline" className="h-14 px-8 rounded-2xl font-bold border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800">
                <Download className="w-4 h-4 mr-2" /> Export Report
              </Button>
              <Button onClick={onViewAnomalies} variant="primary" className="h-14 px-8 rounded-2xl font-bold shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                <Zap className="w-4 h-4 mr-2" /> Data Quality Check
              </Button>
            </div>
          </header>

          <div className="flex flex-col lg:flex-row gap-12">
             {/* Decision-First Layout: Insights & Validation First */}
             
             {/* Left Column (Primary Evidence) */}
             <div className="lg:w-[68%] space-y-12">
                
                {/* 1. Forecast visualization (Hero) */}
                <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
                  <CardHeader className="px-10 pt-10">
                     <CardTitle className="text-3xl font-bold tracking-tight">Forecast Trend</CardTitle>
                     <CardDescription className="text-slate-500 mt-1">Based on historical trends</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 pt-2">
                    <PlotlyChart data={chartData as any} layout={chartLayout} />
                  </CardContent>
                  <CardFooter className="px-10 py-6 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                     <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Data is aggregated monthly for consistency. Shaded area represents prediction uncertainty.
                     </p>
                  </CardFooter>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {/* 2. Model Accuracy (Validation) */}
                   <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                      <CardHeader className="px-10 pt-10">
                        <CardTitle className="text-2xl font-bold tracking-tight">Model Accuracy</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">Backtested model performance</CardDescription>
                      </CardHeader>
                      <CardContent className="px-10 pb-10 pt-4">
                        <DataTable headers={backtestHeaders} rows={backtestRows} className="border-none shadow-none" />
                      </CardContent>
                   </Card>

                   {/* 3. Model Contribution (Explanation) */}
                   <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                      <CardHeader className="px-10 pt-10">
                        <CardTitle className="text-2xl font-bold tracking-tight">Model Contribution</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">Best fit for this data pattern</CardDescription>
                      </CardHeader>
                      <CardContent className="px-10 pb-12 pt-6 space-y-8">
                        {Object.entries(targetData.modelWeights || {}).sort((a: any, b: any) => b[1] - a[1]).map(([m, w]: any) => (
                          <div key={m} className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                              <span className="text-slate-500 dark:text-slate-400">{m}</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-black">{w}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${w}%` }}
                                  transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                                  className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]" 
                               />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                   </Card>
                </div>
             </div>

             {/* Right Column: Decision Hub (Key Insights) */}
             <div className="lg:w-[32%]">
                <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 ring-1 ring-slate-800 text-white h-full flex flex-col">
                  <CardHeader className="px-10 pt-12 pb-10 border-b border-white/5">
                     <CardTitle className="text-3xl font-black tracking-tight flex items-center gap-4">
                        <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                        Key Insights
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="px-10 pt-12 flex-1 space-y-16">
                    <div className="p-10 rounded-[32px] bg-white/5 border border-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-3">Model Confidence</p>
                      <p className="text-7xl font-black text-white tracking-tighter">
                        {(100 - bestSmape).toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-400 mt-5 font-medium italic leading-relaxed opacity-70">Overall confidence in projected trends</p>
                    </div>

                    <div className="space-y-10">
                       {insights.map((insight: string, i: number) => (
                         <motion.div 
                           key={i} 
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: 0.15 * i, ease: "easeOut" }}
                           className="flex gap-6 group"
                         >
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)] group-hover:scale-150 transition-transform duration-300" />
                            <p className="text-[15px] font-medium text-slate-200 leading-relaxed group-hover:text-white transition-colors duration-300" dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>') }} />
                         </motion.div>
                       ))}
                    </div>
                  </CardContent>
                  <CardFooter className="px-10 py-12 mt-auto border-t border-white/5">
                     <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-[11px] text-indigo-300/80 font-medium italic leading-relaxed">
                           ClarityAI combines multiple models to improve forecast reliability.
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-center">
                           Powered by Adaptive Ensembles
                        </p>
                     </div>
                  </CardFooter>
                </Card>
             </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
