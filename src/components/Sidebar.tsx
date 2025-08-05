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
  
  const [activeMenu, setActiveMenu] = useState<Id<"conversations"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuthActions();
  const deleteConversation = useMutation(api.conversations.remove);

  // Helper function to clean conversation titles for display
  const cleanTitleForDisplay = (title: string) => {
    // Remove search tags like [Search: query] and extract just the query
    const searchMatch = title.match(/^\[Search:\s*(.+?)\]$/);
    if (searchMatch) {
      const query = searchMatch[1];
      // Truncate to first 3 words for concise display
      const words = query.trim().split(/\s+/);
      return words.slice(0, 3).join(' ');
    }
    
    return title; // Return original title if no search tag found
  };

  const handleDelete = async (conversationId: Id<"conversations">) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation({ conversationId });
      setActiveMenu(null);
    }
  };

  const toggleMenu = (conversationId: Id<"conversations">, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === conversationId ? null : conversationId);
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

  const handleConversationClick = (conversationId: Id<"conversations">) => {
    onSelectConversation(conversationId);
    if (isMobile && onClose) {
      onClose(); // Close sidebar on mobile after selection
    }
  };

  const handleNewChatClick = () => {
    onNewChat();
    if (isMobile && onClose) {
      onClose(); // Close sidebar on mobile after creating new chat
    }
  };

  return (
    <div className={`h-full flex flex-col ${isMobile ? 'w-full' : ''} ${
      isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'p-4' : 'p-6'} border-b ${
        isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
      }`}>
        <div className="flex items-center gap-3">
          <img 
            src="/yari-logo.png" 
            alt="Yari AI Logo" 
            className="w-8 h-8 object-contain"
          />
          <h1 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Yari AI
          </h1>
        </div>
        
        {/* Mobile close button */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-neutral-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-neutral-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <button
          onClick={handleNewChatClick}
          className={`w-full flex items-center gap-3 ${isMobile ? 'px-3 py-3' : 'px-4 py-3'} rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' 
              : 'bg-neutral-100 hover:bg-neutral-200 text-gray-900 border-neutral-200'
          } border`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className={`${isMobile ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'} pl-10 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-neutral-800 border-neutral-700 text-white placeholder-gray-400 focus:border-neutral-600' 
                : 'bg-neutral-50 border-neutral-200 text-gray-900 placeholder-gray-500 focus:border-neutral-300'
            } focus:outline-none focus:ring-1 focus:ring-primary/20`}
          />
          <svg className={`absolute left-3 ${isMobile ? 'top-2' : 'top-2.5'} w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredConversations.length === 0 ? (
          <div className={`p-4 text-center ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className={`${isMobile ? 'p-2' : 'p-1'}`}>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => handleConversationClick(conversation._id)}
                className={`group relative ${isMobile ? 'px-3 py-3' : 'px-3 py-2.5'} rounded-lg cursor-pointer transition-colors mb-0.5 ${
                  isDarkMode ? 'hover:bg-neutral-900' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      {conversation.type === "agent_builder" && (
                        <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                        </svg>
                      )}
                      <h3 className={`font-normal ${isDarkMode ? 'text-neutral-200' : 'text-neutral-900'} truncate ${isMobile ? 'text-base' : 'text-sm'} leading-5`}>
                        {cleanTitleForDisplay(conversation.title)}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Ellipsis Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => toggleMenu(conversation._id, e)}
                      className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-neutral-800' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-neutral-100'
                      }`}
                    >
                      <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeMenu === conversation._id && (
                      <div className={`absolute right-0 top-8 ${isMobile ? 'w-40' : 'w-32'} rounded-md shadow-lg border z-10 ${
                        isDarkMode 
                          ? 'bg-neutral-800 border-neutral-700' 
                          : 'bg-white border-neutral-200'
                      }`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conversation._id);
                          }}
                          className={`w-full text-left ${isMobile ? 'px-4 py-3' : 'px-3 py-2'} text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className={`border-t ${isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'} ${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={toggleTheme}
            className={`${isMobile ? 'p-2.5' : 'p-2'} rounded-md transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-neutral-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-neutral-100'
            }`}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => signOut()}
            className={`${isMobile ? 'p-2.5' : 'p-2'} rounded-md transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-neutral-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-neutral-100'
            }`}
            title="Sign out"
          >
            <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
