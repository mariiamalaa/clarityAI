import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  ArrowLeft, 
  Search,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from '@/app/components/ui/Card';
import { DataTable } from '@/app/components/ui/DataTable';

interface AnomalyDetectionScreenProps {
  jobId: string;
  results: any;
  onBack: () => void;
}

export function AnomalyDetectionScreen({ jobId, results, onBack }: AnomalyDetectionScreenProps) {
  const anomalies = results?.anomalies || [];
  const changepoints = results?.changepoints || [];
  const history = results?.history || { y: [] };

  const hasAnomalies = anomalies.length > 0;

  const headers = ['Timeline', 'Actual Value', 'Expected Range', 'Deviation', 'Risk Level'];
  const rows = anomalies.map((a: any) => [
    new Date(a.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
    a.actual.toLocaleString(),
    a.expected.toLocaleString(),
    `${a.shift_pct > 0 ? '+' : ''}${a.shift_pct.toFixed(1)}%`,
    <div key={a.date} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${
      a.severity === 'high' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
      a.severity === 'medium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
      'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }`}>
      {a.severity}
    </div>
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-12 overflow-auto font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-10">
          <div className="flex items-center gap-8">
            <button 
              onClick={onBack}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-indigo-600 group"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                <Search className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Diagnostic Audit</span>
              </div>
              <h2 className="text-5xl font-black tracking-tight italic">Data Quality Check</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Audit Status</span>
                <span className={`text-sm font-bold flex items-center gap-2 ${hasAnomalies ? 'text-amber-500' : 'text-emerald-500'}`}>
                   {hasAnomalies ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                   {hasAnomalies ? 'Action Required' : 'All checks passed'}
                </span>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 flex flex-col">
              <CardHeader className="px-10 pt-10 pb-8 border-b border-slate-50 dark:border-slate-800">
                 <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tight">
                    <ShieldAlert className="w-6 h-6 text-indigo-600" />
                    Integrity Overview
                 </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pt-10 pb-10 flex-1 space-y-12">
                 <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Critical deviations</span>
                       <span className="text-2xl font-black">{anomalies.filter(a => a.severity === 'high').length}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Structural patterns</span>
                       <span className="text-2xl font-black">{changepoints.length}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-4">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deviations Audited</span>
                       <span className="text-2xl font-black">{anomalies.length}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Insight</p>
                    <div className="p-8 rounded-[32px] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                       <p className="text-lg font-bold mb-2">
                          {hasAnomalies ? 'Deviations detected.' : 'No anomalies detected.'}
                       </p>
                       <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                          {hasAnomalies 
                            ? 'Our engine identified several statistically significant deviations that differ from historical patterns.'
                            : 'Data shows stable statistical behavior across the observed period.'
                          }
                       </p>
                    </div>
                 </div>

                 <div className="pt-4 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Outcome</p>
                    <div className={`flex items-center gap-3 font-bold text-sm ${hasAnomalies ? 'text-rose-500' : 'text-emerald-500'}`}>
                       {hasAnomalies ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                       {hasAnomalies ? 'Review flagged records for potential data errors.' : 'No corrective action required.'}
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="px-10 py-8 mt-auto border-t border-slate-50 dark:border-slate-800">
                 <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium italic">
                    <Info className="w-4 h-4 text-indigo-400/50" />
                    Anomalies represent statistically significant deviations from expected patterns.
                 </div>
              </CardFooter>
           </Card>

           <Card className="lg:col-span-2 border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden flex flex-col">
              <CardHeader className="px-10 pt-10 pb-8">
                 <CardTitle className="text-3xl font-black tracking-tight">Audit Trail</CardTitle>
                 <CardDescription className="text-slate-500 mt-1">Detailed chronology of detected deviations</CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex-1">
                 <div className="px-10">
                    {hasAnomalies ? (
                       <DataTable headers={headers} rows={rows} className="border-none shadow-none" />
                    ) : (
                       <motion.div 
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="py-32 flex flex-col items-center justify-center text-center px-10"
                       >
                          <div className="w-20 h-20 rounded-[32px] bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-8">
                             <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                          </div>
                          <p className="text-2xl font-black tracking-tight mb-3">Clean dataset</p>
                          <p className="text-sm text-slate-500 max-w-md font-medium">No significant deviations detected in this dataset.</p>
                       </motion.div>
                    )}
                 </div>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 px-10 py-6">
                 <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium italic">
                    <Info className="w-4 h-4 text-indigo-400/50" />
                    Verified by Adaptive Intelligence Engine
                 </div>
              </CardFooter>
           </Card>
        </div>
      </div>
    </div>
  );
}
