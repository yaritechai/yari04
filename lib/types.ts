import type { UIMessage } from 'ai';

// **CUSTOM UI MESSAGE TYPE** - Fully typed for our agentic system
export type AgenticUIMessage = UIMessage<
  // Custom metadata
  {
    agentStep?: number;
    toolsUsed?: string[];
    confidence?: number;
    processingTime?: number;
    sources?: string[];
  },
  // Data parts for streaming updates  
  {
    'data-progress': {
      step: number;
      action: string;
      status: 'thinking' | 'executing' | 'complete' | 'error';
      toolName?: string;
    };
    'data-tool-result': {
      toolName: string;
      result: any;
      timestamp: string;
      success: boolean;
    };
    'data-agent-status': {
      currentStep: number;
      totalSteps: number;
      phase: 'planning' | 'research' | 'analysis' | 'synthesis' | 'complete';
    };
  },
  // Tools (inferred from our tool definitions)
  {
    webSearch: {
      input: {
        query: string;
        maxResults?: number;
      };
      output: Array<{
        title: string;
        url: string;
        snippet: string;
        relevanceScore?: number;
      }>;
    };
    generateImage: {
      input: {
        prompt: string;
        size?: '1024x1024' | '1792x1024' | '1024x1792';
        style?: 'natural' | 'artistic' | 'photographic';
      };
      output: {
        url: string;
        prompt: string;
        size: string;
      };
    };
    analyzeData: {
      input: {
        fileId: string;
        analysisType?: 'summary' | 'trends' | 'insights' | 'full';
        focusAreas?: string[];
      };
      output: {
        summary: string;
        insights: string[];
        statistics?: {
          rowCount: number;
          columnCount: number;
          dataTypes: Record<string, string>;
        };
        recommendations?: string[];
      };
    };
    createPlan: {
      input: {
        objective: string;
        complexity?: 'simple' | 'moderate' | 'complex';
        timeframe?: string;
        constraints?: string[];
      };
      output: {
        title: string;
        overview: string;
        steps: Array<{
          title: string;
          description: string;
          estimatedTime?: string;
          dependencies?: string[];
        }>;
        timeline?: string;
        resources?: string[];
      };
    };
    finalAnswer: {
      input: {
        answer: string;
        sources?: string[];
        confidence: number;
        followUp?: string[];
      };
      output: {
        answer: string;
        sources: string[];
        confidence: number;
        followUp: string[];
      };
    };
  }
>;

// Tool execution states
export type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

// Chat interface props
export interface ChatProps {
  chatId?: string;
  initialMessages?: AgenticUIMessage[];
}
