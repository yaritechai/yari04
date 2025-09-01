'use client';

import { Brain, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface AgenticProgressProps {
  isActive: boolean;
  currentStep: number;
  phase: string;
  data?: any;
}

export function AgenticProgress({ isActive, currentStep, phase, data }: AgenticProgressProps) {
  if (!isActive && phase !== 'complete') {
    return null;
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'planning':
        return <Brain className="h-4 w-4" />;
      case 'research':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'analysis':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'synthesis':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'complete':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800';
    }
  };

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'planning':
        return 'Planning approach...';
      case 'research':
        return 'Researching information...';
      case 'analysis':
        return 'Analyzing data...';
      case 'synthesis':
        return 'Synthesizing results...';
      case 'complete':
        return 'Task completed';
      case 'error':
        return 'Error occurred';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className={`border-b border-border p-3 ${getPhaseColor(phase)}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Status */}
          <div className="flex items-center gap-3">
            {getPhaseIcon(phase)}
            <div>
              <div className="font-medium text-sm">
                Agent Active {currentStep > 0 && `- Step ${currentStep}`}
              </div>
              <div className="text-xs opacity-80">
                {getPhaseText(phase)}
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {isActive && currentStep > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono">
                {currentStep}/10
              </div>
              <div className="w-20 h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Real-time updates from data parts */}
        {data && data.length > 0 && (
          <div className="mt-2 text-xs opacity-70">
            Latest: {data[data.length - 1]?.action || 'Processing...'}
          </div>
        )}
      </div>
    </div>
  );
}
