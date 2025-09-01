'use client';

import { AgenticUIMessage } from '@/lib/types';
import { ToolInvocation } from './tool-invocation';
import { FinalAnswerDisplay } from './final-answer-display';
import { MessageContent } from './message-content';
import { MessageMetadata } from './message-metadata';
import { ScrollArea } from './ui/scroll-area';
import { AlertCircle } from 'lucide-react';

interface ChatMessagesProps {
  messages: AgenticUIMessage[];
  isLoading: boolean;
  error?: Error;
}

export function ChatMessages({ messages, isLoading, error }: ChatMessagesProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Welcome to Yari AI</h3>
          <p className="text-muted-foreground">
            I'm your agentic AI assistant. I can research, analyze data, generate images, create plans, and provide comprehensive answers to complex questions.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Try asking me to:</p>
            <ul className="mt-2 space-y-1">
              <li>• Research a topic and provide insights</li>
              <li>• Generate an image from a description</li>
              <li>• Analyze data from uploaded files</li>
              <li>• Create a project plan</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {messages.map((message) => (
          <div key={message.id} className="message-container">
            {/* Message Role Indicator */}
            <div className="flex items-start gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground'
              }`}>
                {message.role === 'user' ? 'U' : '🤖'}
              </div>
              <div className="flex-1 min-w-0">
                {/* Render message parts with full type safety */}
                <div className="space-y-3">
                  {message.parts.map((part, index) => {
                    switch (part.type) {
                      // **TOOL INVOCATIONS** - Fully typed based on our tool definitions
                      case 'tool-webSearch':
                        return (
                          <ToolInvocation
                            key={index}
                            icon="🔍"
                            name="Web Search"
                            part={part}
                            color="blue"
                          />
                        );
                      
                      case 'tool-generateImage':
                        return (
                          <ToolInvocation
                            key={index}
                            icon="🎨"
                            name="Image Generation"
                            part={part}
                            color="purple"
                          />
                        );
                      
                      case 'tool-analyzeData':
                        return (
                          <ToolInvocation
                            key={index}
                            icon="📊"
                            name="Data Analysis"
                            part={part}
                            color="green"
                          />
                        );
                      
                      case 'tool-createPlan':
                        return (
                          <ToolInvocation
                            key={index}
                            icon="📋"
                            name="Plan Creation"
                            part={part}
                            color="orange"
                          />
                        );
                      
                      case 'tool-finalAnswer':
                        return (
                          <FinalAnswerDisplay
                            key={index}
                            part={part}
                          />
                        );
                      
                      // **TEXT CONTENT**
                      case 'text':
                        return (
                          <MessageContent
                            key={index}
                            content={part.text}
                            role={message.role}
                          />
                        );
                      
                      default:
                        // Handle any unknown part types gracefully
                        return (
                          <div key={index} className="text-sm text-muted-foreground italic">
                            Unknown message part: {(part as any).type}
                          </div>
                        );
                    }
                  })}
                </div>
                
                {/* Message metadata */}
                {message.metadata && (
                  <MessageMetadata
                    agentStep={message.metadata.agentStep}
                    toolsUsed={message.metadata.toolsUsed}
                    confidence={message.metadata.confidence}
                    processingTime={message.metadata.processingTime}
                    sources={message.metadata.sources}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              🤖
            </div>
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Agent is thinking...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
