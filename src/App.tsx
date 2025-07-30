import { useState, useEffect } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AuthWrapper } from "./components/AuthWrapper";
import { Sidebar } from "./components/Sidebar";
import { ChatInterface } from "./components/ChatInterface";
import { SignInForm } from "./SignInForm";

import { RightPanel, FragmentType } from "./components/RightPanel";
import { useRightPanel } from "./hooks/useRightPanel";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { MessageInputModern } from "./components/MessageInputModern";

function AppContent() {
  const { isDarkMode } = useTheme();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start collapsed by default
  const [isMobile, setIsMobile] = useState(false);
  
  const {
    isOpen: isRightPanelOpen,
    width: rightPanelWidth,
    activeFragment,
    fragmentData,
    isTransitioning,
    togglePanel: toggleRightPanel,
    setWidth: setRightPanelWidth,
    openFragment: originalOpenFragment,
    closePanel: closeFragment
  } = useRightPanel();

  // Wrapper for openFragment that closes sidebar when right panel opens
  const openFragment = (fragment: FragmentType, data?: any) => {
    originalOpenFragment(fragment, data);
    setIsSidebarOpen(false); // Close sidebar when right panel opens
  };

  // Debug: Check authentication state
  const currentUser = useQuery(api.auth.loggedInUser, {});
  console.log("🔍 App Debug - Current user:", currentUser);

  const conversations = useQuery(api.conversations.list, {}) || [];
  console.log("🔍 App Debug - Conversations query result:", conversations);
  
  const selectedConversation = useQuery(
    api.conversations.get, 
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );


  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      
      // Keep sidebar collapsed by default on both mobile and desktop
      // Only open it when user explicitly clicks the toggle
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNewChat = async () => {
    // Close sidebar on mobile after creating new chat
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    setSelectedConversationId(null);
  };



  const handleSelectConversation = (id: Id<"conversations">) => {
    setSelectedConversationId(id);
    // Close sidebar on mobile after selecting conversation
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleTitleUpdate = (title: string) => {
    // Title update logic handled in ChatInterface
  };

  const handleOpenFragment = (fragment: FragmentType, data?: any) => {
    openFragment(fragment, data);
  };



  const handleOpenMCP = () => {
    openFragment("mcp");
  };

  // Calculate chat area constraints
  const sidebarWidth = isMobile ? 0 : (isSidebarOpen ? 280 : 0);
  const rightPanelWidthActual = isRightPanelOpen ? rightPanelWidth : 0;
  const minChatWidth = Math.max(320, sidebarWidth); // Ensure chat is never smaller than sidebar
  const availableWidth = window.innerWidth - sidebarWidth - rightPanelWidthActual - 32; // 32px for margins
  const chatWidth = Math.max(minChatWidth, availableWidth);

  return (
    <div className={`h-screen flex ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-50'} overflow-hidden`}>
      {/* Debug Panel - Show auth state */}
      <div className="fixed top-0 right-0 z-50 bg-red-500 text-white p-2 text-xs">
        User: {currentUser ? '✅ Authenticated' : '❌ Not authenticated'} | 
        Conversations: {conversations.length}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - The entire sidebar including bottom actions collapses */}
      <div className={`
        ${isMobile 
          ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : `relative transition-all duration-300 ${
              isSidebarOpen ? 'w-80' : 'w-0'
            }`
        }
      `}>
        {/* Only render sidebar content when it should be visible */}
        {(isSidebarOpen || (!isMobile && isSidebarOpen)) && (
          <div className={`h-full ${isMobile ? 'w-80' : 'w-full'} overflow-hidden`}>
            <Sidebar
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onOpenMCP={handleOpenMCP}
              isMobile={isMobile}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 relative"
        style={{ 
          minWidth: `${minChatWidth}px`,
          maxWidth: isRightPanelOpen ? `calc(100vw - ${sidebarWidth}px - ${rightPanelWidth}px - 2rem)` : undefined
        }}
      >
        {/* Sidebar Toggle Button - Only show when sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => {
              const newSidebarState = !isSidebarOpen;
              setIsSidebarOpen(newSidebarState);
              // Close right panel when sidebar opens
              if (newSidebarState && isRightPanelOpen) {
                closeFragment();
              }
            }}
            className={`absolute top-4 left-4 z-50 p-2 ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-gray-600 hover:text-gray-900'
            } rounded-lg transition-colors`}
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {selectedConversationId ? (
          <ChatInterface
            conversationId={selectedConversationId}
            onTitleUpdate={handleTitleUpdate}
            onOpenFragment={handleOpenFragment}
          />
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-50'} px-4`}>
            <div className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[60vh]">
              {/* Welcome Message */}
              <div className="text-center mb-8">
                <div className={`w-16 h-16 ${isDarkMode ? 'bg-primary-900/20 border-gray-700' : 'bg-primary-50 border-primary-200'} rounded-full flex items-center justify-center mx-auto mb-6 border shadow-sm`}>
                  <svg className={`w-8 h-8 ${isDarkMode ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Welcome to Yari AI
                </h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
                  Start a conversation below
                </p>
              </div>

              {/* Chat Input */}
              <div className="w-full max-w-3xl">
                <MessageInputModern
                  conversationId={null}
                  isGenerating={false}
                  onTitleUpdate={handleTitleUpdate}
                  defaultWebSearch={false}
                  isFirstMessage={true}
                  onConversationCreated={setSelectedConversationId}
                  onOpenFragment={handleOpenFragment}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <RightPanel
        isOpen={isRightPanelOpen}
        onToggle={() => {
          const newRightPanelState = !isRightPanelOpen;
          toggleRightPanel();
          // Close sidebar when right panel opens
          if (newRightPanelState && isSidebarOpen) {
            setIsSidebarOpen(false);
          }
        }}
        width={rightPanelWidth}
        onWidthChange={setRightPanelWidth}
        activeFragment={activeFragment}
        onFragmentChange={openFragment}
        fragmentData={fragmentData}
        isTransitioning={isTransitioning}
      />

      {/* Floating Document Button removed as requested */}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Authenticated>
        <AppContent />
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </ThemeProvider>
  );
}
