import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { ProgressBar } from '@/app/components/ui/ProgressBar';

interface ProcessingScreenProps {
  onComplete: () => void;
}

export function ProcessingScreen({ onComplete }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Prophet model', status: 'pending' as const },
    { label: 'LightGBM model', status: 'pending' as const },
    { label: 'SARIMA model', status: 'pending' as const },
    { label: 'Rolling-origin backtesting', status: 'pending' as const },
    { label: 'SMAPE evaluation', status: 'pending' as const },
    { label: 'Final model selection', status: 'pending' as const }
  ];

  const [progressSteps, setProgressSteps] = useState(steps);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        
        if (next < steps.length) {
          setProgressSteps((prevSteps) =>
            prevSteps.map((step, index) => {
              if (index < next) return { ...step, status: 'complete' };
              if (index === next) return { ...step, status: 'loading' };
              return step;
            })
          );
          return next;
        } else {
          // Complete all steps
          setProgressSteps((prevSteps) =>
            prevSteps.map((step) => ({ ...step, status: 'complete' }))
          );
          
          // Navigate to results after a short delay
          setTimeout(() => onComplete(), 1500);
          
          clearInterval(interval);
          return prev;
        }
      });
    }, 2000);

    // Start first step
    setProgressSteps((prevSteps) =>
      prevSteps.map((step, index) =>
        index === 0 ? { ...step, status: 'loading' } : step
      )
    );

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
              <TrendingUp className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Forecast Engine Running...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Training and evaluating multiple models
            </p>
          </div>

          <ProgressBar steps={progressSteps} />

          <div className="mt-8 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Summary Card Preview
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best Model</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">—</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">SMAPE Score</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">—</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Horizon</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">—</p>
              </div>
            </div>
          </div>

          {currentStep >= steps.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-center gap-2 text-green-600 dark:text-green-500"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Processing complete!</span>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
