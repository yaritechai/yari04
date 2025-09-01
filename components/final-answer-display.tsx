'use client';

import { CheckCircle, ExternalLink, MessageSquare } from 'lucide-react';

interface FinalAnswerDisplayProps {
  part: any; // finalAnswer tool part
}

export function FinalAnswerDisplay({ part }: FinalAnswerDisplayProps) {
  if (part.state !== 'output-available' || !part.output) {
    return null;
  }

  const { answer, sources, confidence, followUp } = part.output;

  return (
    <div className="border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <div className="font-semibold text-green-900 dark:text-green-100">Final Answer</div>
        <div className="ml-auto text-sm text-green-700 dark:text-green-300">
          {confidence}% confidence
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="w-full bg-green-200 dark:bg-green-900 rounded-full h-2">
          <div 
            className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Answer Content */}
      <div className="prose prose-sm max-w-none text-green-900 dark:text-green-100 mb-4">
        <div className="whitespace-pre-wrap">{answer}</div>
      </div>

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div className="mb-4">
          <div className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-1">
            <ExternalLink className="h-4 w-4" />
            Sources
          </div>
          <div className="space-y-1">
            {sources.map((source, index) => (
              <div key={index} className="text-sm">
                {source.startsWith('http') ? (
                  <a 
                    href={source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {source}
                  </a>
                ) : (
                  <div className="text-green-700 dark:text-green-300">• {source}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Questions */}
      {followUp && followUp.length > 0 && (
        <div>
          <div className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Follow-up Questions
          </div>
          <div className="space-y-1">
            {followUp.map((question, index) => (
              <div key={index} className="text-sm text-green-700 dark:text-green-300">
                • {question}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
