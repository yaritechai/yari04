import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../contexts/ThemeContext";
import { MessageBubble } from "./MessageBubble";
import { MessageInputModern } from "./MessageInputModern";

interface AgentBuilderInterfaceProps {
  conversationId?: Id<"conversations"> | null;
  onTitleUpdate?: (title: string) => void;
}

interface MCPCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverDetails: any;
  onSubmit: (credentials: any) => void;
}

function MCPCredentialModal({ isOpen, onClose, serverDetails, onSubmit }: MCPCredentialModalProps) {
  const { isDarkMode } = useTheme();
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  if (!isOpen || !serverDetails) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(credentials);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 w-full max-w-md mx-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Configure {serverDetails.name}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'} rounded-lg transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          {serverDetails.description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {serverDetails.requiredCredentials?.map((cred: any) => (
            <div key={cred.name}>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                {cred.description}
                {cred.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type={cred.type === 'password' ? 'password' : 'text'}
                required={cred.required}
                value={credentials[cred.name] || ''}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  [cred.name]: e.target.value
                }))}
                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder={`Enter your ${cred.description.toLowerCase()}`}
              />
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AgentBuilderInterface({ conversationId, onTitleUpdate }: AgentBuilderInterfaceProps) {
  const { isDarkMode } = useTheme();
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [selectedServerDetails, setSelectedServerDetails] = useState<any>(null);
  
  const messages = useQuery(api.messages.list, conversationId ? { conversationId } : "skip") || [];
  const conversation = useQuery(api.conversations.get, conversationId ? { conversationId } : "skip");
  const createMCPConnection = useMutation(api.simpleAgentBuilder.createMCPConnection);

  const handleMCPCredentialSubmit = async (credentials: any) => {
    if (!selectedServerDetails) return;

    try {
      const connectionId = await createMCPConnection({
        serverId: selectedServerDetails.id,
        serverName: selectedServerDetails.name,
        credentials,
      });

      // You could add a success message here
      console.log("MCP connection created successfully");
    } catch (error) {
      console.error("Failed to create MCP connection:", error);
    }
  };

  // Function to handle MCP credential requests from the AI
  const handleMCPCredentialRequest = (serverDetails: any) => {
    setSelectedServerDetails(serverDetails);
    setIsCredentialModalOpen(true);
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-purple-900/50 border-gray-700' : 'bg-purple-100 border-gray-300'} rounded-full flex items-center justify-center mx-auto mb-6 border`}>
              <svg className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Welcome to Agent Builder! 🚀
            </h2>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
              I'm here to help you create an amazing AI agent that will transform how you work. 
              Tell me what you'd like your agent to help you with, and I'll guide you through 
              building the perfect solution with the right capabilities and integrations.
            </p>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 max-w-2xl mx-auto`}>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Great starting questions:
              </h3>
              <ul className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-1 text-left`}>
                <li>• "I want to automate my email responses and scheduling"</li>
                <li>• "Help me create a research agent that can gather market data"</li>
                <li>• "I need an agent to manage my GitHub repositories"</li>
                <li>• "Build me a content creation assistant for social media"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              onMCPCredentialRequest={handleMCPCredentialRequest}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-6 py-4`}>
        <MessageInputModern
          conversationId={conversationId || null}
          isGenerating={false}
          onTitleUpdate={onTitleUpdate || (() => {})}
          defaultWebSearch={false}
        />
      </div>

      {/* MCP Credential Modal */}
      <MCPCredentialModal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        serverDetails={selectedServerDetails}
        onSubmit={handleMCPCredentialSubmit}
      />
    </div>
  );
}
