'use client';

import { useChat } from 'ai/react';
import { ChatMessages } from '@/components/chat-messages';
import { ChatInput } from '@/components/chat-input';
import { AgenticProgress } from '@/components/agentic-progress';
import { AgenticUIMessage } from '@/lib/types';
import { useState } from 'react';

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const [agentStatus, setAgentStatus] = useState<{
    isActive: boolean;
    currentStep: number;
    phase: string;
  }>({
    isActive: false,
    currentStep: 0,
    phase: 'idle',
  });

  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading,
    data, // For streaming data parts
    error,
  } = useChat<AgenticUIMessage>({
    api: '/api/chat',
    id: params.id,
    
    // Handle streaming data parts from agentic system
    onData: ({ data, type }) => {
      console.log('📡 Received data part:', { type, data });
      
      if (type === 'data-agent-status') {
        setAgentStatus({
          isActive: true,
          currentStep: data.currentStep,
          phase: data.phase,
        });
      }
      
      if (type === 'data-progress') {
        console.log(`🤖 Agent ${data.status}: ${data.action} (Step ${data.step})`);
      }
      
      if (type === 'data-tool-result') {
        console.log(`🔧 Tool ${data.toolName} ${data.success ? 'succeeded' : 'failed'}`);
      }
    },

    onFinish: () => {
      // Reset agent status when conversation completes
      setAgentStatus({
        isActive: false,
        currentStep: 0,
        phase: 'complete',
      });
    },

    onError: (error) => {
      console.error('Chat error:', error);
      setAgentStatus({
        isActive: false,
        currentStep: 0,
        phase: 'error',
      });
    },
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Yari AI - Agentic Chat</h1>
          {agentStatus.isActive && (
            <div className="text-sm text-muted-foreground">
              Agent Active - Step {agentStatus.currentStep} ({agentStatus.phase})
            </div>
          )}
        </div>
      </div>

      {/* Agentic Progress Indicator */}
      {(isLoading || agentStatus.isActive) && (
        <AgenticProgress 
          isActive={agentStatus.isActive}
          currentStep={agentStatus.currentStep}
          phase={agentStatus.phase}
          data={data}
        />
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages 
          messages={messages} 
          isLoading={isLoading}
          error={error}
        />
      </div>
      
      {/* Input */}
      <div className="border-t border-border">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask me anything - I'll research, analyze, and provide comprehensive answers..."
        />
      </div>
    </div>
  );
}
