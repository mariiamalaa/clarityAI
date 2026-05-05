import React from 'react';
import { motion } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';

interface ProgressStep {
  label: string;
  status: 'pending' | 'loading' | 'complete';
}

interface ProgressBarProps {
  steps: ProgressStep[];
}

export function ProgressBar({ steps }: ProgressBarProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {step.status === 'complete' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            ) : step.status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={`font-medium ${
                step.status === 'complete'
                  ? 'text-green-600 dark:text-green-500'
                  : step.status === 'loading'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.label}
              </span>
              {step.status === 'loading' && (
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  Processing...
                </span>
              )}
            </div>
            {step.status === 'loading' && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-1 bg-purple-500 rounded-full mt-2"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
