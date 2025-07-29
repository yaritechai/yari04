import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

interface MCPServer {
  qualifiedName: string;
  displayName: string | null;
  description: string | null;
  useCount: number;
  remote: boolean;
  createdAt: string;
  homepage: string;
  id?: string;
  name?: string;
  version?: string;
  usage_count?: number;
  tags?: string[];
  tools?: any[];
  category?: string;
}

interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  required_permissions?: string[];
}

interface AgentConfig {
  name: string;
  description: string;
  personality: string;
  systemPrompt: string;
  avatar?: string;
  color?: string;
  capabilities: string[];
  mcpConnections: string[];
  workflows: string[];
  scheduledTasks: string[];
  isActive: boolean;
}

export function AgentBuilder() {
  const { isDarkMode } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [agentConfig, setAgentConfig] = useState<Partial<AgentConfig>>({
    name: "My AI Agent",
    description: "A helpful AI assistant",
    personality: "friendly and professional",
    capabilities: ["web_search", "file_management"],
    mcpConnections: [],
    workflows: [],
    scheduledTasks: [],
    isActive: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMCPServers, setSelectedMCPServers] = useState<MCPServer[]>([]);
  const [mcpConnections, setMcpConnections] = useState<any[]>([]);

  // Queries and mutations
  const currentAgent = useQuery(api.agentBuilder.getCurrentAgentConfig);
  const availableCapabilities = useQuery(api.agentBuilder.getAvailableCapabilities);
  const userMCPConnections = useQuery(api.smithery.getUserMCPConnections);
  const workflows = useQuery(api.agentBuilder.getWorkflows);
  const scheduledTriggers = useQuery(api.agentBuilder.getScheduledTriggers);

  const updateAgent = useMutation(api.agentBuilder.updateAgent);
  const searchMCPServers = useAction(api.smithery.searchMCPServers);
  const getPopularMCPServers = useAction(api.smithery.getPopularMCPServers);
  const createMCPConnection = useMutation(api.smithery.createMCPConnection);
  const testMCPConnection = useAction(api.smithery.testMCPConnection);

  // Load current agent config
  useEffect(() => {
    if (currentAgent) {
      setAgentConfig(currentAgent);
    }
  }, [currentAgent]);

  const steps = [
    { title: "Basic Info", description: "Name, description, and personality" },
    { title: "Capabilities", description: "Core AI capabilities" },
    { title: "Integrations", description: "External service connections" },
    { title: "Workflows", description: "Automated processes" },
    { title: "Scheduling", description: "Automated triggers" },
    { title: "Review", description: "Final configuration" },
  ];

  const handleUpdateAgent = async () => {
    try {
      await updateAgent(agentConfig);
    } catch (error) {
      console.error("Failed to update agent:", error);
    }
  };

  const handleSearchMCP = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await searchMCPServers({
        query: searchQuery,
        pageSize: 5,
      });
      setSelectedMCPServers(results.servers);
    } catch (error) {
      console.error("Failed to search MCP servers:", error);
    }
  };

  const handleLoadPopularMCP = async () => {
    try {
      const results = await getPopularMCPServers({
        pageSize: 10,
      });
      setSelectedMCPServers(results.servers);
    } catch (error) {
      console.error("Failed to load popular MCP servers:", error);
    }
  };

  const handleCreateMCPConnection = async (server: MCPServer) => {
    try {
      const connectionId = await createMCPConnection({
        serverId: server.qualifiedName,
        serverName: server.displayName || server.name || server.qualifiedName,
        connectionUrl: `https://server.smithery.ai/${server.qualifiedName}/mcp`,
        enabledTools: server.tools?.map(tool => typeof tool === 'string' ? tool : tool.name || tool) || [],
      });

      // Test the connection
      const testResult = await testMCPConnection({ connectionId });
      
      if (testResult.isConnected) {
        // Add to agent config
        setAgentConfig(prev => ({
          ...prev,
          mcpConnections: [...(prev.mcpConnections || []), connectionId],
        }));
      }
    } catch (error) {
      console.error("Failed to create MCP connection:", error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Agent Name
              </label>
              <input
                type="text"
                value={agentConfig.name || ""}
                onChange={(e) => setAgentConfig(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="My AI Agent"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Description
              </label>
              <textarea
                value={agentConfig.description || ""}
                onChange={(e) => setAgentConfig(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                rows={3}
                placeholder="A helpful AI assistant that can..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Personality
              </label>
              <input
                type="text"
                value={agentConfig.personality || ""}
                onChange={(e) => setAgentConfig(prev => ({ ...prev, personality: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="friendly and professional"
              />
            </div>
          </div>
        );

      case 1: // Capabilities
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Select Core Capabilities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableCapabilities?.map((capability) => (
                  <div
                    key={capability.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      agentConfig.capabilities?.includes(capability.id)
                        ? isDarkMode
                          ? 'bg-blue-900/30 border-blue-500'
                          : 'bg-blue-50 border-blue-500'
                        : isDarkMode
                        ? 'bg-gray-800 border-gray-600 hover:border-gray-500'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => {
                      const capabilities = agentConfig.capabilities || [];
                      const isSelected = capabilities.includes(capability.id);
                      setAgentConfig(prev => ({
                        ...prev,
                        capabilities: isSelected
                          ? capabilities.filter(id => id !== capability.id)
                          : [...capabilities, capability.id]
                      }));
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {capability.name}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {capability.description}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        agentConfig.capabilities?.includes(capability.id)
                          ? 'bg-blue-500 border-blue-500'
                          : isDarkMode
                          ? 'border-gray-500'
                          : 'border-gray-300'
                      }`}>
                        {agentConfig.capabilities?.includes(capability.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Integrations
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                MCP Server Integrations
              </h3>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Search for integrations (e.g., Gmail, Slack, GitHub)"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchMCP()}
                />
                <button
                  onClick={handleSearchMCP}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
                <button
                  onClick={handleLoadPopularMCP}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Popular
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {selectedMCPServers.map((server) => (
                  <div
                    key={server.qualifiedName}
                    className={`p-4 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {server.displayName || server.name || server.qualifiedName}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            v{server.version || '1.0.0'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode
                              ? 'bg-blue-900 text-blue-300'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {server.useCount || server.usage_count || 0} users
                          </span>
                        </div>
                        <p className={`text-sm mb-2 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {server.description || 'No description available'}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(server.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className={`text-xs px-2 py-1 rounded ${
                                isDarkMode
                                  ? 'bg-gray-700 text-gray-300'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className={`text-xs ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {server.tools?.length || 0} tools available
                        </div>
                      </div>
                      <button
                        onClick={() => handleCreateMCPConnection(server)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Connections */}
            {userMCPConnections && userMCPConnections.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Current Connections
                </h4>
                <div className="space-y-2">
                  {userMCPConnections.map((connection) => (
                    <div
                      key={connection._id}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <div>
                        <span className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {connection.serverName}
                        </span>
                        <div className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {connection.enabledTools.length} tools enabled
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        connection.isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3: // Workflows
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Automated Workflows
              </h3>
              <p className={`text-sm mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Create multi-step automated processes that your agent can execute.
              </p>
              
              {workflows && workflows.length > 0 ? (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow._id}
                      className={`p-4 rounded-lg border ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {workflow.name}
                          </h4>
                          <p className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {workflow.description}
                          </p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          workflow.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <p>No workflows created yet.</p>
                  <p className="text-sm mt-2">Workflows will be created based on your agent's needs.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 4: // Scheduling
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Scheduled Tasks
              </h3>
              <p className={`text-sm mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Set up automatic triggers for your agent to run tasks on a schedule.
              </p>
              
              {scheduledTriggers && scheduledTriggers.length > 0 ? (
                <div className="space-y-3">
                  {scheduledTriggers.map((trigger) => (
                    <div
                      key={trigger._id}
                      className={`p-4 rounded-lg border ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {trigger.name}
                          </h4>
                          <p className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {trigger.description}
                          </p>
                          <p className={`text-xs mt-1 font-mono ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {trigger.cronExpression}
                          </p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          trigger.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <p>No scheduled tasks created yet.</p>
                  <p className="text-sm mt-2">Scheduled tasks will be created based on your agent's needs.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 5: // Review
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Agent Configuration Review
              </h3>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Basic Information
                  </h4>
                  <p><strong>Name:</strong> {agentConfig.name}</p>
                  <p><strong>Description:</strong> {agentConfig.description}</p>
                  <p><strong>Personality:</strong> {agentConfig.personality}</p>
                </div>

                <div className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Capabilities ({agentConfig.capabilities?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {agentConfig.capabilities?.map((capability) => (
                      <span
                        key={capability}
                        className={`px-2 py-1 text-xs rounded ${
                          isDarkMode
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    MCP Connections ({agentConfig.mcpConnections?.length || 0})
                  </h4>
                  {agentConfig.mcpConnections?.length ? (
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {agentConfig.mcpConnections.length} external service connections configured
                    </p>
                  ) : (
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      No external connections configured
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            AI Agent Builder
          </h1>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Create and configure your personalized AI agent
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep
                    ? 'bg-primary text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-2 ${
                    index < currentStep
                      ? 'bg-primary'
                      : isDarkMode
                      ? 'bg-gray-700'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className={`text-sm font-medium ${
                  index <= currentStep
                    ? isDarkMode ? 'text-white' : 'text-gray-900'
                    : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className={`bg-${isDarkMode ? 'gray-800' : 'white'} rounded-lg shadow-lg p-6 mb-8`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`px-6 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDarkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleUpdateAgent}
                className="btn-primary"
              >
                Save Agent
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                className="btn-primary"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
