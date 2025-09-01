import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../contexts/ThemeContext";
import { MessageBubble } from "./MessageBubble";
import { MessageInputModern } from "./MessageInputModern";
// AI Elements (Vercel AI Elements)
// Optional: lazy imports can be applied later if needed
import { Conversation, ConversationContent, ConversationScrollButton } from "./ai-elements/conversation";
import { Message as AIMessage, MessageContent as AIMessageContent } from "./ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "./ai-elements/prompt-input";
import { Loader } from "./ai-elements/loader";
import { Response as AIResponse } from "./ai-elements/response";
import { Tool as AITool, ToolContent as AIToolContent, ToolHeader as AIToolHeader, ToolInput as AIToolInput, ToolOutput as AIToolOutput } from "./ai-elements/tool";

interface AgentBuilderInterfaceProps {
  conversationId?: Id<"conversations"> | null;
  onTitleUpdate?: (title: string) => void;
  isBuilderMode?: boolean;
  previewConversationId?: Id<"conversations"> | null;
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

export function AgentBuilderInterface({ conversationId, onTitleUpdate, isBuilderMode, previewConversationId }: AgentBuilderInterfaceProps) {
  const { isDarkMode } = useTheme();
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [selectedServerDetails, setSelectedServerDetails] = useState<any>(null);
  const [builderConversationId, setBuilderConversationId] = useState<Id<"conversations"> | null>(null as any);
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  
  const effectiveConversationId = conversationId || builderConversationId;
  const messages = useQuery(api.messages.list, effectiveConversationId ? { conversationId: effectiveConversationId as any } : "skip") || [];
  const conversation = useQuery(api.conversations.get, effectiveConversationId ? { conversationId: effectiveConversationId as any } : "skip");
  const createMCPConnection = useMutation(api.simpleAgentBuilder.createMCPConnection);
  const createBuilderConversation = useMutation(api.simpleAgentBuilder.createAgentBuilderConversation);
  const [pipedreamAccounts, setPipedreamAccounts] = useState<any[]>([]);
  const listConnectAccountsAction = useAction(api.pipedream.listConnectAccounts);

  useEffect(() => {
    if (!conversationId && !builderConversationId) {
      (async () => {
        try {
          const cid = await createBuilderConversation({});
          setBuilderConversationId(cid as any);
        } catch (e) {
          console.error('Failed to create builder conversation', e);
        }
      })();
    }
  }, [conversationId, builderConversationId, createBuilderConversation]);

  // Listen for workflow creation in messages
  useEffect(() => {
    if (isBuilderMode && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        // Check if the message contains workflow creation info
        const workflowMatch = lastMessage.content.match(/✅\s*\*\*Agent workflow created!\*\*[\s\S]*?Name:\s*(.+?)[\s\S]*?ID:\s*(.+?)[\s\S]*?Trigger:\s*(.+?)[\s\S]*?Actions:\s*(\d+)/);
        if (workflowMatch) {
          setCurrentWorkflow({
            name: workflowMatch[1].trim(),
            id: workflowMatch[2].trim(),
            trigger: workflowMatch[3].trim(),
            steps: Array(parseInt(workflowMatch[4])).fill({}).map((_, i) => ({ type: `Action ${i + 1}` }))
          });
        }
        
        // Check for connected apps
        const connectedMatch = lastMessage.content.match(/✅\s*Connected to (.+?)!/);
        if (connectedMatch) {
          setConnectedApps(prev => [...new Set([...prev, connectedMatch[1].trim()])]);
        }
      }
    }
  }, [messages, isBuilderMode]);

  // Load Pipedream accounts when in builder mode
  useEffect(() => {
    if (isBuilderMode) {
      (async () => {
        try {
          const accounts = await listConnectAccountsAction({});
          setPipedreamAccounts(accounts || []);
        } catch (e) {
          console.error("Failed to load Pipedream accounts:", e);
        }
      })();
    }
  }, [isBuilderMode, listConnectAccountsAction]);

  // Adapter: convert our message shape to AI Elements UI parts
  const aiElementsMessages = useMemo(() => {
    return messages.map((m: any) => ({
      id: String(m._id),
      role: m.role,
      // fallback to text part; tool parts can be wired later when server provides them
      parts: [{ type: 'text', text: m.content }],
    }));
  }, [messages]);

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
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
      {/* Workflow Visualization Panel - only in builder mode */}
      {isBuilderMode && currentWorkflow && (
        <div className={`px-4 py-3 border-b ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Workflow</h4>
            <button
              onClick={() => setCurrentWorkflow(null)}
              className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Hide
            </button>
          </div>
          <div className={`${isDarkMode ? 'bg-black border-neutral-700' : 'bg-white border-gray-300'} border rounded-lg p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-100 border-green-300'} border flex items-center justify-center`}>
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentWorkflow.name || 'Untitled Workflow'}
              </span>
            </div>
            {currentWorkflow.steps && (
              <div className="ml-4 space-y-2">
                {currentWorkflow.steps.map((step: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-purple-400' : 'bg-purple-600'}`} />
                    <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {step.action || step.type || 'Step ' + (index + 1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Connected Apps Status - only in builder mode */}
      {isBuilderMode && pipedreamAccounts && pipedreamAccounts.length > 0 && (
        <div className={`px-4 py-2 border-b ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connected Apps: {pipedreamAccounts.map((acc: any) => acc.name).join(', ')}
            </span>
          </div>
        </div>
      )}
      
      {/* Messages (AI Elements conversation) */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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
              I'm here to help you create powerful AI agents with Pipedream integrations. I can connect to 2000+ apps 
              like Slack, GitHub, Gmail, Discord, and more. Tell me what you'd like to automate, and I'll build 
              the perfect workflow with the right triggers, actions, and AI capabilities.
            </p>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 max-w-2xl mx-auto`}>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Great starting questions:
              </h3>
              <ul className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} space-y-1 text-left`}>
                <li>• "Create a Slack bot that notifies me when someone stars my GitHub repo"</li>
                <li>• "Build a workflow that saves Gmail attachments to Google Drive automatically"</li>
                <li>• "Set up an agent that posts to Discord when I get new Stripe payments"</li>
                <li>• "Help me sync data between Airtable and Google Sheets every hour"</li>
                <li>• "Create an AI assistant that responds to customer emails in Gmail"</li>
              </ul>
            </div>
          </div>
        ) : (
          <Conversation>
            <ConversationContent>
              {aiElementsMessages.map((m: any) => (
                <AIMessage from={m.role} key={m.id}>
                  <AIMessageContent>
                    {m.parts.map((part: any, i: number) => {
                      if (part.type === 'text') return <AIResponse key={`${m.id}-${i}`}>{part.text}</AIResponse>;
                      return null;
                    })}
                  </AIMessageContent>
                </AIMessage>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      {/* Input (AI Elements prompt input wrapper around existing send) */}
      <div className={`${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'} border-t px-4 py-4`}>
        <MessageInputModern
          conversationId={effectiveConversationId || null}
          isGenerating={false}
          onTitleUpdate={onTitleUpdate || (() => {})}
          defaultWebSearch={false}
          onOpenFragment={() => {}}
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
