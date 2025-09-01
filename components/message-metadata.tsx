'use client';

import { Clock, Zap, Target, ExternalLink } from 'lucide-react';

interface MessageMetadataProps {
  agentStep?: number;
  toolsUsed?: string[];
  confidence?: number;
  processingTime?: number;
  sources?: string[];
}

export function MessageMetadata({ 
  agentStep, 
  toolsUsed, 
  confidence, 
  processingTime,
  sources 
}: MessageMetadataProps) {
  if (!agentStep && !toolsUsed && !confidence && !processingTime && !sources) {
    return null;
  }

  return (
    <div className="mt-3 pt-2 border-t border-border/50">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {/* Agent Step */}
        {agentStep && (
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Step {agentStep}
          </div>
        )}

        {/* Tools Used */}
        {toolsUsed && toolsUsed.length > 0 && (
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {toolsUsed.join(', ')}
          </div>
        )}

        {/* Processing Time */}
        {processingTime && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {processingTime}ms
          </div>
        )}

        {/* Confidence */}
        {confidence && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border border-current flex items-center justify-center">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                style={{ 
                  opacity: confidence / 100,
                  backgroundColor: confidence > 80 ? 'green' : confidence > 60 ? 'orange' : 'red'
                }}
              />
            </div>
            {confidence}%
          </div>
        )}

        {/* Sources Count */}
        {sources && sources.length > 0 && (
          <div className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {sources.length} sources
          </div>
        )}
      </div>
    </div>
  );
}
