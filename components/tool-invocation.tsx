'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ToolState } from '@/lib/types';

interface ToolInvocationProps {
  icon: string;
  name: string;
  part: any; // Tool part from AgenticUIMessage
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'border-blue-200 bg-blue-50 text-blue-900',
  purple: 'border-purple-200 bg-purple-50 text-purple-900',
  green: 'border-green-200 bg-green-50 text-green-900',
  orange: 'border-orange-200 bg-orange-50 text-orange-900',
  red: 'border-red-200 bg-red-50 text-red-900',
};

const darkColorClasses = {
  blue: 'dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
  purple: 'dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100',
  green: 'dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  orange: 'dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100',
  red: 'dark:border-red-800 dark:bg-red-950 dark:text-red-100',
};

export function ToolInvocation({ icon, name, part, color }: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(part.state === 'output-error');

  const getStateIcon = (state: ToolState) => {
    switch (state) {
      case 'input-streaming':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'input-available':
        return <Clock className="h-4 w-4" />;
      case 'output-available':
        return <CheckCircle className="h-4 w-4" />;
      case 'output-error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStateText = (state: ToolState) => {
    switch (state) {
      case 'input-streaming':
        return 'Preparing...';
      case 'input-available':
        return 'Executing...';
      case 'output-available':
        return 'Completed';
      case 'output-error':
        return 'Error';
      default:
        return 'Processing...';
    }
  };

  const getStateColor = (state: ToolState) => {
    switch (state) {
      case 'input-streaming':
      case 'input-available':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'output-available':
        return 'text-green-600 dark:text-green-400';
      case 'output-error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`border rounded-lg ${colorClasses[color]} ${darkColorClasses[color]}`}>
      {/* Tool Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="font-medium">{name}</div>
            <div className={`text-sm flex items-center gap-1 ${getStateColor(part.state)}`}>
              {getStateIcon(part.state)}
              {getStateText(part.state)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {part.state === 'input-streaming' && (
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Tool Details */}
      {isExpanded && (
        <div className="border-t border-current/20 p-3 space-y-3">
          {/* **INPUT DISPLAY** - Shows tool parameters */}
          {(part.state === 'input-streaming' || part.state === 'input-available' || part.state === 'output-available' || part.state === 'output-error') && part.input && (
            <div>
              <div className="text-sm font-medium mb-1">Input:</div>
              <div className="text-sm bg-white/50 dark:bg-black/20 rounded p-2">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(part.input, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* **OUTPUT DISPLAY** - Shows tool results */}
          {part.state === 'output-available' && part.output && (
            <div>
              <div className="text-sm font-medium mb-1">Result:</div>
              <div className="text-sm bg-white/50 dark:bg-black/20 rounded p-2">
                {renderToolOutput(part.output, name)}
              </div>
            </div>
          )}

          {/* **ERROR DISPLAY** */}
          {part.state === 'output-error' && (
            <div>
              <div className="text-sm font-medium mb-1 text-red-600 dark:text-red-400">Error:</div>
              <div className="text-sm bg-red-50 dark:bg-red-950/20 rounded p-2 text-red-700 dark:text-red-300">
                {part.errorText || 'An unknown error occurred'}
              </div>
            </div>
          )}

          {/* **STREAMING INPUT** - Shows partial inputs as they arrive */}
          {part.state === 'input-streaming' && (
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Preparing tool parameters...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to render different tool outputs nicely
function renderToolOutput(output: any, toolName: string) {
  switch (toolName) {
    case 'Web Search':
      if (Array.isArray(output)) {
        return (
          <div className="space-y-2">
            {output.map((result, index) => (
              <div key={index} className="border-l-2 border-current/20 pl-2">
                <div className="font-medium text-xs">{result.title}</div>
                <div className="text-xs text-muted-foreground">{result.url}</div>
                <div className="text-xs mt-1">{result.snippet}</div>
                {result.relevanceScore && (
                  <div className="text-xs text-muted-foreground">
                    Relevance: {Math.round(result.relevanceScore * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      break;

    case 'Image Generation':
      if (output.url) {
        return (
          <div className="space-y-2">
            <img 
              src={output.url} 
              alt={output.prompt}
              className="max-w-xs rounded border"
            />
            <div className="text-xs">
              <div><strong>Prompt:</strong> {output.prompt}</div>
              <div><strong>Size:</strong> {output.size}</div>
            </div>
          </div>
        );
      }
      break;

    case 'Data Analysis':
      return (
        <div className="space-y-2">
          <div><strong>Summary:</strong> {output.summary}</div>
          {output.insights && (
            <div>
              <strong>Insights:</strong>
              <ul className="list-disc list-inside text-xs mt-1">
                {output.insights.map((insight: string, index: number) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          )}
          {output.statistics && (
            <div className="text-xs">
              <strong>Statistics:</strong> {output.statistics.rowCount} rows, {output.statistics.columnCount} columns
            </div>
          )}
        </div>
      );

    case 'Plan Creation':
      return (
        <div className="space-y-2">
          <div><strong>{output.title}</strong></div>
          <div className="text-xs">{output.overview}</div>
          {output.steps && (
            <div>
              <strong>Steps:</strong>
              <ol className="list-decimal list-inside text-xs mt-1 space-y-1">
                {output.steps.map((step: any, index: number) => (
                  <li key={index}>
                    <strong>{step.title}</strong>
                    {step.estimatedTime && (
                      <span className="text-muted-foreground"> ({step.estimatedTime})</span>
                    )}
                    <div className="text-xs text-muted-foreground ml-4">{step.description}</div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      );

    default:
      // Generic JSON display for unknown tool outputs
      return (
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }

  // Fallback
  return (
    <pre className="whitespace-pre-wrap text-xs">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}
