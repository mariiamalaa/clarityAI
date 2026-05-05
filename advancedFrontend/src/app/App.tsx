import React, { useState } from 'react';
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { LoginScreen } from '@/app/components/screens/LoginScreen';
import { SignupScreen } from '@/app/components/screens/SignupScreen';
import { UploadScreen } from '@/app/components/screens/UploadScreen';
import { ProcessingScreen } from '@/app/components/screens/ProcessingScreen';
import { ForecastResultsScreen } from '@/app/components/screens/ForecastResultsScreen';
import { AnomalyDetectionScreen } from '@/app/components/screens/AnomalyDetectionScreen';

type Screen =
  | 'login'
  | 'signup'
  | 'upload'
  | 'processing'
  | 'results'
  | 'anomalies';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen('upload');
  };

  const handleSignup = () => {
    setIsAuthenticated(true);
    setCurrentScreen('upload');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen('login');
  };

  const handleRunForecast = () => {
    setCurrentScreen('processing');
  };

  const handleProcessingComplete = () => {
    setCurrentScreen('results');
  };

  const handleViewAnomalies = () => {
    setCurrentScreen('anomalies');
  };

  const handleBackToResults = () => {
    setCurrentScreen('results');
  };

  return (
    <ThemeProvider>
      {currentScreen === 'login' && (
        <LoginScreen
          onLogin={handleLogin}
          onSwitchToSignup={() => setCurrentScreen('signup')}
        />
      )}

      {currentScreen === 'signup' && (
        <SignupScreen
          onSignup={handleSignup}
          onSwitchToLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'upload' && (
        <UploadScreen
          onRunForecast={handleRunForecast}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'processing' && (
        <ProcessingScreen onComplete={handleProcessingComplete} />
      )}

      {currentScreen === 'results' && (
        <ForecastResultsScreen
          onViewAnomalies={handleViewAnomalies}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'anomalies' && (
        <AnomalyDetectionScreen
          onBack={handleBackToResults}
          onLogout={handleLogout}
        />
      )}
    </ThemeProvider>
  );
}
