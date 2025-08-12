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
    isOpen: isRightPanelOpen,
    togglePanel: toggleRightPanel,
    activeFragment,
    fragmentData,
    isTransitioning,
    openFragment: originalOpenFragment,
    closePanel: closeFragment
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

  // Wrapper for openFragment that handles mobile behavior and suppresses chat-driven reopen
  const openFragment = (fragment: FragmentType, data?: any) => {
    // Only close sidebar when opening a NEW fragment, not when panel is already open
    const isNewFragment = !isRightPanelOpen || activeFragment !== fragment;
    // If user explicitly closes the panel, require a user-initiated flag to reopen
    const userInitiated = Boolean(data && (data.userInitiated === true));
    if (!userInitiated && !isNewFragment && !isRightPanelOpen) {
      return;
    }
    
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

  // Close right panel when switching conversations or leaving chat
  useEffect(() => {
    closeFragment();
  }, [selectedConversationId]);

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
        {/* Mobile Header */}
        {isMobile && (
          <div className={`sticky top-0 z-20 flex items-center justify-between border-b mobile-container-padding px-3 py-3 ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-gray-700 hover:text-gray-900'
              }`}
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Yari AI</div>
            <div className="w-9" />
          </div>
        )}

        {/* Sidebar Toggle Button - Desktop only when sidebar is closed */}
        {(!isMobile && !isSidebarOpen) && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`absolute top-4 left-4 z-30 p-2 ${
              isDarkMode 
                ? 'bg-neutral-800/80 hover:bg-neutral-700 text-gray-300 hover:text-white' 
                : 'bg-white/80 hover:bg-neutral-100 text-gray-700 hover:text-gray-900'
            } rounded-lg transition-colors shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur`}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
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
                <div className="flex items-center justify-center mx-auto mb-6">
                  <img 
                    src="/yari-logo.png" 
                    alt="Yari AI Logo" 
                    className="w-16 h-16 object-contain"
                  />
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
                onOpenFragment={(fragment: string, data?: any) =>
                  handleOpenFragment(fragment as FragmentType, { ...(data || {}), userInitiated: true })
                }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <RightPanel
        isOpen={isRightPanelOpen}
        onToggle={(e?: any) => {
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
        onFragmentChange={(fragment: FragmentType | null, data?: any) => {
          if (fragment === null) {
            // User explicitly closed; toggle the panel off immediately and do not reopen
            if (isRightPanelOpen) {
              toggleRightPanel();
            }
            return;
          }
          openFragment(fragment, { ...(data || {}), userInitiated: true });
        }}
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
