import React, { useState } from 'react';
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { UploadScreen } from '@/app/components/screens/UploadScreen';
import { ProcessingScreen } from '@/app/components/screens/ProcessingScreen';
import { ForecastResultsScreen } from '@/app/components/screens/ForecastResultsScreen';
import { AnomalyDetectionScreen } from '@/app/components/screens/AnomalyDetectionScreen';

type Screen = 'upload' | 'processing' | 'results' | 'anomalies';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('upload');
  
  // Global App State
  const [fileId, setFileId] = useState<string>('');
  const [payload, setPayload] = useState<any>(null);
  const [jobId, setJobId] = useState<string>('');
  const [forecastResult, setForecastResult] = useState<any>(null);

  const handleRunForecast = (newPayload: any) => {
    setPayload(newPayload);
    setCurrentScreen('processing');
  };

  const handleProcessingComplete = (result: any) => {
    setForecastResult(result);
    setCurrentScreen('results');
  };

  const handleViewAnomalies = () => {
    setCurrentScreen('anomalies');
  };

  const handleBackToResults = () => {
    setCurrentScreen('results');
  };

  const handleReset = () => {
    setFileId('');
    setPayload(null);
    setJobId('');
    setForecastResult(null);
    setCurrentScreen('upload');
  };

  return (
    <ThemeProvider>
      {currentScreen === 'upload' && (
        <UploadScreen
          fileId={fileId}
          setFileId={setFileId}
          onRunForecast={handleRunForecast}
        />
      )}

      {currentScreen === 'processing' && (
        <ProcessingScreen 
          fileId={fileId}
          payload={payload}
          setJobId={setJobId}
          onComplete={handleProcessingComplete} 
        />
      )}

      {currentScreen === 'results' && forecastResult && (
        <ForecastResultsScreen
          forecastResult={forecastResult}
          onViewAnomalies={handleViewAnomalies}
          onReset={handleReset}
        />
      )}

      {currentScreen === 'anomalies' && forecastResult && (
        <AnomalyDetectionScreen
          jobId={jobId}
          results={forecastResult}
          onBack={handleBackToResults}
        />
      )}
    </ThemeProvider>
  );
}
