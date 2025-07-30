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
  const [activeMenu, setActiveMenu] = useState<Id<"conversations"> | null>(null);
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

  return (
    <div className={`h-full ${isDarkMode ? 'bg-black border-r border-neutral-800' : 'bg-white'} flex flex-col w-full min-w-[280px]`}>
      {/* Header */}
      <div className={`p-3 space-y-3`}>
        {/* Close Button - Always show when onClose is available */}
        {onClose && (
          <div className="flex justify-between items-center">
            <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              Chat History
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'} rounded-md transition-colors`}
              title="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 ${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'} rounded-lg transition-colors text-sm font-medium`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 ${isDarkMode ? 'bg-neutral-800 text-white placeholder-neutral-500' : 'bg-neutral-100 text-neutral-900 placeholder-neutral-500'} rounded-lg focus:outline-none text-sm`}
          />
          <svg className={`w-4 h-4 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'} absolute left-3 top-1/2 transform -translate-y-1/2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="p-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
                className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5 ${
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
                      <h3 className={`font-normal ${isDarkMode ? 'text-neutral-200' : 'text-neutral-900'} truncate text-sm leading-5`}>
                        {cleanTitleForDisplay(conversation.title)}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Ellipsis Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => toggleMenu(conversation._id, e)}
                      className={`opacity-0 group-hover:opacity-100 p-1 ${isDarkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-500'} rounded transition-all`}
                      title="More options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeMenu === conversation._id && (
                      <div className={`absolute right-0 top-full mt-1 ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'} border rounded-lg shadow-lg z-10 min-w-[120px]`}>
                        <button
                          onClick={() => handleDelete(conversation._id)}
                          className={`w-full text-left px-3 py-2 text-sm ${isDarkMode ? 'text-red-400 hover:bg-neutral-700' : 'text-red-600 hover:bg-neutral-50'} transition-colors rounded-lg flex items-center gap-2`}
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

      {/* Click outside to close menu */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActiveMenu(null)}
        />
      )}

      {/* Bottom Actions */}
      <div className={`p-3 space-y-1`}>
        {/* MCP Integration */}
        {onOpenMCP && (
          <button
            onClick={onOpenMCP}
            className={`w-full flex items-center gap-3 px-3 py-2 ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'} rounded-lg transition-colors`}
            title="MCP Integration"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm">MCP Integration</span>
          </button>
        )}
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'} rounded-lg transition-colors`}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span className="text-sm">{isDarkMode ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={() => void signOut()}
          className={`w-full flex items-center gap-3 px-3 py-2 ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'} rounded-lg transition-colors`}
          title="Sign out"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );
}
