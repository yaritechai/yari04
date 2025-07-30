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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(600);
  const [minChatWidth] = useState(400);

  const {
    isRightPanelOpen,
    toggleRightPanel,
    activeFragment,
    fragmentData,
    isTransitioning,
    openFragment: originalOpenFragment,
    closeFragment
  } = useRightPanel();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-close sidebar on mobile when screen gets too small
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isSidebarOpen]);

  // Wrapper for openFragment that handles mobile behavior
  const openFragment = (fragment: FragmentType, data?: any) => {
    // Only close sidebar when opening a NEW fragment, not when panel is already open
    const isNewFragment = !isRightPanelOpen || activeFragment !== fragment;
    
    originalOpenFragment(fragment, data);
    
    // On mobile, always close sidebar when opening right panel
    // On desktop, only close sidebar when opening a new fragment
    if (isMobile || isNewFragment) {
      setIsSidebarOpen(false);
    }
  };

  const conversations = useQuery(api.conversations.list, { archived: false }) || [];

  const createConversation = useMutation(api.conversations.create);

  const handleNewChat = async () => {
    try {
      const conversationId = await createConversation({
        title: "New Conversation",
        folderId: undefined,
        type: "chat"
      });
      
      setSelectedConversationId(conversationId);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleTitleUpdate = () => {
    // Title updates are handled by the ChatInterface component
  };

  const handleOpenFragment = (fragment: FragmentType, data?: any) => {
    openFragment(fragment, data);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={`h-screen flex ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-50'} relative overflow-hidden`}>
      {/* Sidebar */}
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'} flex-shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : isMobile ? '-translate-x-full' : 'w-0'
      } transition-all duration-300 ease-in-out`}
      style={{ 
        width: isMobile ? '100vw' : (isSidebarOpen ? `${sidebarWidth}px` : '0px'),
        maxWidth: isMobile ? '400px' : undefined
      }}>
        {isSidebarOpen && (
          <div className={`h-full ${isMobile ? 'w-full max-w-sm' : ''} ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          } ${isMobile ? 'border-r shadow-xl' : 'border-r'}`}>
            <Sidebar
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              onNewChat={handleNewChat}
              isMobile={isMobile}
              onClose={handleSidebarClose}
            />
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 relative"
        style={{ 
          minWidth: isMobile ? 'auto' : `${minChatWidth}px`,
          maxWidth: (!isMobile && isRightPanelOpen) ? `calc(100vw - ${isSidebarOpen ? sidebarWidth : 0}px - ${rightPanelWidth}px - 2rem)` : undefined
        }}
      >
        {/* Sidebar Toggle Button - Always show on mobile, only when sidebar closed on desktop */}
        {(isMobile || !isSidebarOpen) && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`absolute top-4 left-4 z-30 p-2 ${
              isDarkMode 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-gray-600 hover:text-gray-900'
            } rounded-lg transition-colors shadow-sm`}
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
              <div className="w-full max-w-3xl px-4">
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
          // On mobile, close sidebar when right panel opens
          if (isMobile && newRightPanelState && isSidebarOpen) {
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
