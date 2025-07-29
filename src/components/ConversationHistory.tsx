import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ConversationHistoryProps {
  conversationId: Id<"conversations">;
  onClose: () => void;
}

export function ConversationHistory({ conversationId, onClose }: ConversationHistoryProps) {
  const history = useQuery(api.conversations.getHistory, { 
    conversationId,
    includeMessages: true 
  });

  if (!history) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (start: number, end: number) => {
    const diffInMinutes = Math.round((end - start) / (1000 * 60));
    if (diffInMinutes < 1) return "< 1 min";
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const userMessages = history.messages.filter(m => m.role === "user");
  const assistantMessages = history.messages.filter(m => m.role === "assistant");
  const totalTokens = history.messages.reduce((sum, m) => sum + (m.tokens || 0), 0);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Conversation History</h2>
            <p className="text-sm text-gray-600 mt-1">{history.conversation.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-full">
          {/* Stats Sidebar */}
          <div className="w-80 border-r border-gray-200 p-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-4">Statistics</h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{history.messageCount}</div>
                <div className="text-sm text-gray-600">Total Messages</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-green-600">{userMessages.length}</div>
                <div className="text-sm text-gray-600">Your Messages</div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">{assistantMessages.length}</div>
                <div className="text-sm text-gray-600">AI Responses</div>
              </div>

              {totalTokens > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-orange-600">{totalTokens.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Tokens</div>
                </div>
              )}

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">Timeline</div>
                <div className="text-xs text-gray-600">
                  <div>Created: {formatDate(history.conversation._creationTime)}</div>
                  <div>Last Active: {formatDate(history.conversation.lastMessageAt || history.conversation._creationTime)}</div>
                  <div>Duration: {formatDuration(history.conversation._creationTime, history.conversation.lastMessageAt || history.conversation._creationTime)}</div>
                </div>
              </div>

              {history.conversation.model && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-1">Model</div>
                  <div className="text-sm text-gray-600">{history.conversation.model}</div>
                </div>
              )}

              {history.conversation.temperature && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-1">Temperature</div>
                  <div className="text-sm text-gray-600">{history.conversation.temperature}</div>
                </div>
              )}
            </div>
          </div>

          {/* Message Timeline */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Message Timeline</h3>
            
            {history.messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages in this conversation yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.messages.map((message, index) => (
                  <div key={message._id} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === "user" 
                          ? "bg-blue-100 text-blue-600" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {message.role === "user" ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 capitalize">
                          {message.role === "user" ? "You" : "Assistant"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(message._creationTime)}
                        </span>
                        {message.tokens && (
                          <span className="text-xs text-gray-500">
                            {message.tokens} tokens
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                        <div className="whitespace-pre-wrap break-words">
                          {message.content.length > 200 
                            ? message.content.substring(0, 200) + "..."
                            : message.content
                          }
                        </div>
                        
                        {message.hasWebSearch && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Used web search
                          </div>
                        )}
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {message.attachments.length} attachment(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
