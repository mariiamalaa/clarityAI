import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Database,
  Cpu,
  LineChart,
  ShieldCheck
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/app/components/ui/Card';
import { ProgressBar } from '@/app/components/ui/ProgressBar';
import client from '@/app/api/client';

interface ProcessingScreenProps {
  fileId: string;
  payload: any;
  setJobId: (id: string) => void;
  onComplete: (result: any) => void;
}

export function ProcessingScreen({ fileId, payload, setJobId, onComplete }: ProcessingScreenProps) {
  const [statusMsg, setStatusMsg] = useState('Initializing analysis engine...');
  const [errorMsg, setErrorMsg] = useState('');
  const [progressSteps, setProgressSteps] = useState([
    { label: 'Cleansing Data', status: 'loading' as const, icon: Database },
    { label: 'Learning Patterns', status: 'pending' as const, icon: Cpu },
    { icon: LineChart, label: 'Building Forecast', status: 'pending' as const },
    { icon: ShieldCheck, label: 'Verifying Results', status: 'pending' as const },
  ]);
  
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    let pollingInterval: any;

    const startForecast = async () => {
      try {
        const res = await client.post('/forecast', payload);
        const newJobId = res.data.jobId;
        setJobId(newJobId);

        pollingInterval = setInterval(async () => {
          try {
            const statusRes = await client.get(`/status/${newJobId}`);
            const job = statusRes.data;

            if (job.progress) {
              setStatusMsg(job.progress);
              
              const msgLower = job.progress.toLowerCase();
              setProgressSteps(prev => prev.map((step, i) => {
                if (i === 0) {
                   const isDone = msgLower.includes('running forecast') || msgLower.includes('running models') || msgLower.includes('anomalies') || job.status === 'done';
                   return { ...step, status: isDone ? 'complete' : 'loading' };
                }
                if (i === 1) {
                   const isActive = msgLower.includes('running') || msgLower.includes('model');
                   const isDone = msgLower.includes('anomalies') || msgLower.includes('changepoint') || job.status === 'done';
                   return { ...step, status: isDone ? 'complete' : isActive ? 'loading' : 'pending' };
                }
                if (i === 2) {
                   const isActive = msgLower.includes('ensemble') || msgLower.includes('analysis');
                   const isDone = job.status === 'done';
                   return { ...step, status: isDone ? 'complete' : isActive ? 'loading' : 'pending' };
                }
                if (i === 3) {
                   const isActive = msgLower.includes('anomalies') || msgLower.includes('audit');
                   const isDone = job.status === 'done';
                   return { ...step, status: isDone ? 'complete' : isActive ? 'loading' : 'pending' };
                }
                return step;
              }));
            }

            if (job.status === 'done') {
              clearInterval(pollingInterval);
              setTimeout(() => {
                onComplete(job.result);
              }, 800);
            } else if (job.status === 'error') {
              clearInterval(pollingInterval);
              setErrorMsg(job.error || 'The analysis engine encountered an unexpected error.');
            }
          } catch (pollErr: any) {
            console.error('Polling error', pollErr);
          }
        }, 1500);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to initialize the analysis engine.');
      }
    };

    startForecast();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [payload, setJobId, onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl z-10"
      >
        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
          <CardHeader className="text-center pb-8 border-b border-slate-50 dark:border-slate-800">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
              <TrendingUp className="w-10 h-10 text-white animate-pulse" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Analyzing Your Data
            </CardTitle>
            <CardDescription className="text-lg font-medium text-slate-500 mt-2">
              Our intelligent engine is learning your business patterns.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-12 pb-12 px-12">
            <div className="space-y-10">
               <div className="grid grid-cols-4 gap-4">
                  {progressSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-3">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                         step.status === 'complete' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                         step.status === 'loading' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20 animate-pulse' :
                         'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400'
                       }`}>
                          {step.status === 'complete' ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                       </div>
                       <span className={`text-[10px] font-black uppercase tracking-wider text-center transition-colors ${
                         step.status === 'pending' ? 'text-slate-400' : 'text-slate-900 dark:text-white'
                       }`}>
                          {step.label}
                       </span>
                    </div>
                  ))}
               </div>

               <div className="relative">
                  <ProgressBar steps={progressSteps.map(s => ({ label: s.label, status: s.status }))} />
               </div>

               <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300 italic">
                    &ldquo;{statusMsg}&rdquo;
                  </p>
               </div>
            </div>
          </CardContent>

          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-rose-500 px-12 py-6 text-white flex items-center gap-4"
              >
                <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <p className="font-black uppercase tracking-widest text-[10px] opacity-80 mb-1">Analysis Halted</p>
                  <p className="font-bold">{errorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
