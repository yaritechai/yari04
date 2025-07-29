import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../contexts/ThemeContext";

interface SidebarProps {
  conversations: Array<{
    _id: Id<"conversations">;
    title: string;
    lastMessageAt?: number;
    _creationTime: number;
    starred?: boolean;
    archived?: boolean;
    isArchived?: boolean;
    type?: string;
  }>;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewChat: () => void;
  onOpenMCP?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation, 
  onNewChat,
  onOpenMCP,
  isMobile = false,
  onClose
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuthActions();
  const deleteConversation = useMutation(api.conversations.remove);
  const starConversation = useMutation(api.conversations.star);
  const duplicateConversation = useMutation(api.conversations.duplicate);

  const handleDelete = async (conversationId: Id<"conversations">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation({ conversationId });
    }
  };

  const handleStar = async (conversationId: Id<"conversations">, e: React.MouseEvent) => {
    e.stopPropagation();
    await starConversation({ conversationId });
  };

  const handleDuplicate = async (conversationId: Id<"conversations">, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = await duplicateConversation({ conversationId });
    onSelectConversation(newId);
  };

  // Filter out archived conversations and apply search filter
  const filteredConversations = conversations
    .filter(conv => !conv.archived)
    .filter(conv => conv.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className={`h-full ${isDarkMode ? 'bg-neutral-900 border-gray-800' : 'bg-white border-gray-200'} ${isMobile ? 'border-r shadow-xl' : 'border-r'} flex flex-col w-full min-w-[280px]`}>
      {/* Header */}
      <div className={`p-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-b space-y-3`}>
        {/* Mobile Close Button */}
        {isMobile && onClose && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className={`p-2 ${isDarkMode ? 'hover:bg-neutral-900 text-gray-400' : 'hover:bg-gray-100 text-gray-600'} rounded-lg transition-colors`}
              title="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={onNewChat}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>



        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border ${isDarkMode ? 'border-gray-700 bg-gray-900 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'} rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm`}
          />
          <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} absolute left-3 top-1/2 transform -translate-y-1/2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredConversations.length === 0 ? (
          <div className={`p-4 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                  selectedConversationId === conversation._id
                    ? isDarkMode ? 'bg-primary-900/20 border border-primary-700/50' : 'bg-primary-50 border border-primary-200'
                    : isDarkMode ? 'hover:bg-neutral-900' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {conversation.type === "agent_builder" && (
                        <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                        </svg>
                      )}
                      {conversation.starred && (
                        <svg className="w-3 h-3 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      )}
                      <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} truncate text-sm`}>
                        {conversation.title}
                      </h3>
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      {formatDate(conversation.lastMessageAt || conversation._creationTime)}
                    </p>
                  </div>
                  
                  {/* Action Menu */}
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleStar(conversation._id, e)}
                      className={`flex items-center gap-2 px-2 py-1 text-xs rounded transition-all ${
                        isDarkMode 
                          ? 'text-gray-500 hover:text-gray-400 hover:bg-neutral-900' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title={conversation.starred ? "Unstar" : "Star"}
                    >
                      <svg className={`w-3 h-3 ${conversation.starred ? 'text-primary' : 'currentColor'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>{conversation.starred ? "Unstar" : "Star"}</span>
                    </button>
                    
                    <button
                      onClick={(e) => handleDuplicate(conversation._id, e)}
                      className={`flex items-center gap-2 px-2 py-1 text-xs rounded transition-all ${
                        isDarkMode 
                          ? 'text-gray-500 hover:text-gray-400 hover:bg-neutral-900' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Duplicate"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Duplicate</span>
                    </button>
                    
                    <button
                      onClick={(e) => handleDelete(conversation._id, e)}
                      className={`flex items-center gap-2 px-2 py-1 text-xs rounded transition-all ${
                        isDarkMode 
                          ? 'text-gray-500 hover:text-gray-400 hover:bg-neutral-900' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions - These are now part of the collapsing sidebar */}
      <div className={`p-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} border-t space-y-2`}>
        {/* MCP Integration */}
        {onOpenMCP && (
          <button
            onClick={onOpenMCP}
            className={`w-full flex items-center gap-3 px-3 py-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-neutral-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} rounded-lg transition-colors`}
            title="MCP Integration"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm">MCP Integration</span>
          </button>
        )}
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-neutral-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} rounded-lg transition-colors`}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span className="text-sm">{isDarkMode ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={() => void signOut()}
          className={`w-full flex items-center gap-3 px-3 py-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-neutral-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} rounded-lg transition-colors`}
          title="Sign out"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );
}
