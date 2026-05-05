import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Upload, 
  Settings, 
  BarChart3, 
  ChevronRight, 
  Sun, 
  Moon,
  FileText,
  AlertCircle,
  CheckCircle2,
  Database,
  ArrowRight
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
import { Dropdown } from '@/app/components/ui/Dropdown';
import { FileUploader } from '@/app/components/ui/FileUploader';
import { useTheme } from '@/app/contexts/ThemeContext';
import client from '@/app/api/client';

interface UploadScreenProps {
  fileId: string;
  setFileId: (id: string) => void;
  onRunForecast: (payload: any) => void;
}

export function UploadScreen({ fileId, setFileId, onRunForecast }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  
  // Profile data
  const [columns, setColumns] = useState<string[]>([]);
  const [previewHead, setPreviewHead] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  
  // Form state
  const [dateColumn, setDateColumn] = useState('');
  const [metricColumn, setMetricColumn] = useState('');
  const [groupColumn, setGroupColumn] = useState('');
  const [horizon, setHorizon] = useState('12');
  const [modelGroup, setModelGroup] = useState('ensemble');
  
  const [isValidating, setIsValidating] = useState(false);
  
  const { theme, toggleTheme } = useTheme();

  const steps = [
    { icon: Upload, label: 'Prepare Data', active: true },
    { icon: Settings, label: 'Analyzing Data', active: false },
    { icon: BarChart3, label: 'Insights Dashboard', active: false }
  ];

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile);
    if (!selectedFile) {
      setFileId('');
      setPreviewHead([]);
      setPreviewRows([]);
      setColumns([]);
      return;
    }

    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await client.post('/upload', formData);
      const newFileId = res.data.file_id;
      setFileId(newFileId);

      const profRes = await client.get(`/profile/${newFileId}`);
      const prof = profRes.data;
      
      const columnList = prof.columns || (prof.preview?.[0] ? Object.keys(prof.preview[0]) : []);
      setColumns(columnList);
      setRowCount(prof.characteristics?.row_count || 0);
      
      if (prof.preview && prof.preview.length > 0) {
        const headers = Object.keys(prof.preview[0] || {});
        setPreviewHead(headers);
        setPreviewRows(prof.preview.map((row: any) => headers.map(h => String(row[h] ?? ''))));
      }

      if (prof.suggestions?.date_col) setDateColumn(prof.suggestions.date_col);
      if (prof.suggestions?.metric_col) setMetricColumn(prof.suggestions.metric_col);
      if (prof.suggestions?.group_col) setGroupColumn(prof.suggestions.group_col);
      
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload and profile dataset');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRun = async () => {
    setIsValidating(true);
    try {
      await client.post('/validate', {
        file_id: fileId,
        date_col: dateColumn,
        metric_col: metricColumn,
        group_col: groupColumn === 'none' ? null : groupColumn || null
      });
      
      onRunForecast({
        file_id: fileId,
        date_col: dateColumn,
        metric_col: metricColumn,
        group_col: groupColumn === 'none' ? null : groupColumn || null,
        horizon: parseInt(horizon, 10),
        models: modelGroup
      });
    } catch (err: any) {
      setUploadError(`Validation failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const columnOptions = columns.map(c => ({ value: c, label: c }));
  const horizonOptions = [
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
    { value: '12', label: '12 months' },
    { value: '24', label: '24 months' },
  ];
  const modelOptions = [
    { value: 'ensemble', label: 'Adaptive Intelligence (Recommended)' },
    { value: 'classical', label: 'Classical Stats Only' },
    { value: 'ml', label: 'Machine Learning Only' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 flex flex-col shadow-sm">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ClarityAI</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Decision Intelligence</p>
          </div>
        </div>

        <nav className="space-y-3 flex-1">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                step.active
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50'
                  : 'text-slate-400 dark:text-slate-600 opacity-60'
              }`}
            >
              <step.icon className={`w-5 h-5 ${step.active ? 'animate-pulse' : ''}`} />
              <span className="font-semibold text-sm">{step.label}</span>
              {step.active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <span className="font-semibold text-sm">{theme === 'light' ? 'Dark' : 'Light'}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-auto relative">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-6xl mx-auto space-y-10"
        >
          <header>
            <h2 className="text-4xl font-extrabold tracking-tight mb-3">
              Prepare Data
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
              Turn messy datasets into clear decisions. Upload your source file to begin.
            </p>
          </header>

          <section className="grid grid-cols-1 gap-8">
            <Card className="overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Database className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Source Selection</span>
                </div>
                <CardTitle className="text-2xl font-bold">Import Dataset</CardTitle>
                <CardDescription>Upload your historical records (CSV or Excel)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FileUploader 
                  onFileSelect={handleFileSelect} 
                  acceptedFormats=".csv,.xlsx,.xls" 
                />
                
                <AnimatePresence>
                  {isUploading && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3"
                    >
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        Cleaning and profiling your data...
                      </p>
                    </motion.div>
                  )}

                  {uploadError && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center gap-3 text-rose-700 dark:text-rose-400"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">{uploadError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <AnimatePresence>
              {fileId && previewHead.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <Card className="lg:col-span-2 border-none shadow-lg bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        Data Preview
                      </CardTitle>
                      <CardDescription>A snapshot of your records as parsed by ClarityAI</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <DataTable
                          headers={previewHead}
                          rows={previewRows}
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Identified {rowCount.toLocaleString()} records for analysis
                      </p>
                    </CardFooter>
                  </Card>

                  <Card className="border-none shadow-lg bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-400" />
                        Configuration
                      </CardTitle>
                      <CardDescription>Adjust how we analyze your trends</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Dropdown
                        label="Date Axis"
                        value={dateColumn}
                        onChange={setDateColumn}
                        options={columnOptions}
                        placeholder="Select date column"
                      />
                      <Dropdown
                        label="Target Metric"
                        value={metricColumn}
                        onChange={setMetricColumn}
                        options={columnOptions}
                        placeholder="Select metric column"
                      />
                      <Dropdown
                        label="Breakdown (Optional)"
                        value={groupColumn}
                        onChange={setGroupColumn}
                        options={[{ value: 'none', label: 'No grouping' }, ...columnOptions]}
                        placeholder="Select category column"
                      />
                      <Dropdown
                        label="Analysis Horizon"
                        value={horizon}
                        onChange={setHorizon}
                        options={horizonOptions}
                      />
                      <Dropdown
                        label="Intelligence Model"
                        value={modelGroup}
                        onChange={setModelGroup}
                        options={modelOptions}
                      />
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button
                        onClick={handleRun}
                        variant="primary"
                        size="lg"
                        disabled={!dateColumn || !metricColumn || isValidating}
                        className="w-full h-14 text-md font-bold rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
                      >
                        {isValidating ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Validating Data...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <span>Analyze Trends</span>
                             <ArrowRight className="w-5 h-5" />
                          </div>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
