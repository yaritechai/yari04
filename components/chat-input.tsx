'use client';

import { FormEvent, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  input, 
  handleInputChange, 
  handleSubmit, 
  isLoading, 
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-[60px] max-h-[200px] resize-none pr-12 text-base"
              rows={1}
            />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[60px] w-12 flex-shrink-0"
          >
            {isLoading ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Helpful hints */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          <span>Press Enter to send, Shift + Enter for new line</span>
          {isLoading && (
            <span className="ml-2">• Agent is working on your request...</span>
          )}
        </div>
      </form>
    </div>
  );
}
