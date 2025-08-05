import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { ChatInterface } from "./components/ChatInterface";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { useRightPanel } from "./hooks/useRightPanel";
import { useTheme } from "./contexts/ThemeContext";

export function Agent() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { isDarkMode } = useTheme();

  const conversations = useQuery(api.conversations.list, {}) || [];
  const createConversation = useMutation(api.conversations.create);
  const preferences = useQuery(api.preferences.get, {}) || {};

  const rightPanel = useRightPanel();

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Auto-close sidebar on mobile
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNewChat = async () => {
    const conversationId = await createConversation({
      title: "New Chat",
      model: (preferences as any).defaultModel,
      temperature: (preferences as any).defaultTemperature,
    });
    setSelectedConversationId(conversationId);
    
    // Close sidebar on mobile after creating new chat
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleSelectConversation = (id: Id<"conversations">) => {
    setSelectedConversationId(id);
    
    // Close sidebar on mobile after selecting conversation
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c._id === selectedConversationId)
    : null;

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-50'} relative`}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        isMobile 
          ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : `${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`
      } ${isMobile ? 'w-80' : ''}`}>
        <Sidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ 
          marginRight: rightPanel.isOpen ? `${rightPanel.width + 16}px` : '0px',
          transition: 'margin-right 0.3s ease'
        }}
      >
        {/* Header */}
        <header className="px-4 py-3 flex items-center justify-between backdrop-blur-md bg-opacity-80 border-b border-opacity-20 transition-all duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 ${isDarkMode ? 'hover:bg-gray-700/50 text-gray-300 hover:text-white' : 'hover:bg-gray-100/50 text-gray-600 hover:text-gray-900'} rounded-lg transition-all duration-200`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={rightPanel.togglePanel}
              className={`p-2 ${isDarkMode ? 'hover:bg-gray-700/50 text-gray-300 hover:text-white' : 'hover:bg-gray-100/50 text-gray-600 hover:text-gray-900'} rounded-lg transition-all duration-200 ${
                rightPanel.isOpen ? 'bg-blue-900/30 text-blue-400' : ''
              } hidden sm:flex`}
              title="Toggle fragment panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {selectedConversationId ? (
            <ChatInterface
              conversationId={selectedConversationId}
              onTitleUpdate={(title) => {
                // The title will be updated automatically through the mutation
              }}
              onOpenFragment={rightPanel.openFragment}
            />
          ) : (
            <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-50'} p-4`}>
              <div className="text-center max-w-md">
                <div className="flex items-center justify-center mx-auto mb-6">
                  <img 
                    src="/yari-logo.png" 
                    alt="Yari AI Logo" 
                    className="w-20 h-20 object-contain"
                  />
                </div>
                <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Welcome to Agent</h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-8 leading-relaxed text-sm sm:text-base`}>
                  Your intelligent AI assistant is ready to help. Connect your apps via integrations 
                  to give me context about your data, then start a conversation to explore ideas, 
                  get answers, or work on projects together.
                </p>
                <button
                  onClick={handleNewChat}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Hidden on mobile */}
      <div className="hidden sm:block">
        <RightPanel
          isOpen={rightPanel.isOpen}
          onToggle={rightPanel.togglePanel}
          width={rightPanel.width}
          onWidthChange={rightPanel.setWidth}
          activeFragment={rightPanel.activeFragment}
          onFragmentChange={rightPanel.setActiveFragment}
          fragmentData={rightPanel.fragmentData}
        />
      </div>
    </div>
  );
}
