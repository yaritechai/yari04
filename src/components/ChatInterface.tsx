import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MessageBubble } from "./MessageBubble";
import { MessageInputModern } from "./MessageInputModern";
import { ConversationSettings } from "./ConversationSettings";
import { ConversationHistory } from "./ConversationHistory";
import { FragmentType } from "./RightPanel";
import { useTheme } from "../contexts/ThemeContext";

interface ChatInterfaceProps {
  conversationId: Id<"conversations">;
  onTitleUpdate: (title: string) => void;
  onOpenFragment?: (fragment: FragmentType, data?: any) => void;
}

export function ChatInterface({ conversationId, onTitleUpdate, onOpenFragment }: ChatInterfaceProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  const messages = useQuery(api.messages.list, conversationId ? { conversationId } : "skip") || [];
  const conversation = useQuery(api.conversations.get, conversationId ? { conversationId } : "skip");
  const preferences = useQuery(api.preferences.get, {}) || {};

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isGenerating = messages.some(m => m.isStreaming);
  const isFirstMessage = messages.length === 0;

  // Handle opening fragments based on message content
  const handleMessageFragment = (type: FragmentType, data: any) => {
    onOpenFragment?.(type, data);
  };

  return (
    <div className="flex flex-col h-full relative min-w-0">
      {/* Settings Panel */}
      {showSettings && conversation && (
        <ConversationSettings
          conversation={conversation}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* History Panel */}
      {showHistory && (
        <ConversationHistory
          conversationId={conversationId}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Header - Fully transparent with blur */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end p-3 sm:p-4 backdrop-blur-md bg-transparent border-b border-white/10">
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 ${isDarkMode ? 'hover:bg-gray-800/50 text-gray-300/80 hover:text-white' : 'hover:bg-gray-100/50 text-gray-600/80 hover:text-gray-900'} rounded-lg transition-colors backdrop-blur-sm`}
            title="Conversation Settings"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages - Add top padding to account for header */}
      <div className={`flex-1 overflow-y-auto scrollbar-thin ${isDarkMode ? 'bg-black' : 'bg-gray-50'} pt-16`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[50vh] sm:min-h-[60vh]">
            <div className="text-center max-w-md px-4">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 ${isDarkMode ? 'bg-primary-900/20 border-gray-700' : 'bg-primary-50 border-primary-200'} rounded-full flex items-center justify-center mx-auto mb-4 border`}>
                <svg className={`w-6 h-6 sm:w-8 sm:h-8 ${isDarkMode ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>How can I help you today?</h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-base`}>Start a conversation and I'll generate a smart title for our chat!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              showTokenCount={(preferences as any).showTokenCount}
              onOpenFragment={handleMessageFragment}
            />
          ))
        )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInputModern
          conversationId={conversationId}
          isGenerating={isGenerating}
          onTitleUpdate={onTitleUpdate}
          defaultWebSearch={(preferences as any).enableWebSearch}
          isFirstMessage={isFirstMessage}
        />
      </div>
    </div>
  );
}
