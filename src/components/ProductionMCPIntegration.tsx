import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../contexts/ThemeContext";

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface MCPSession {
  sessionId: string;
  serverUrl: string;
  status: "pending_auth" | "connected" | "disconnected";
  isConnected: boolean;
}

export function ProductionMCPIntegration() {
  const { isDarkMode } = useTheme();
  const [serverUrl, setServerUrl] = useState("https://server.smithery.ai/exa/mcp");
  const [session, setSession] = useState<MCPSession | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [toolArgs, setToolArgs] = useState("{}");
  const [toolResult, setToolResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Actions
  const initializeConnection = useAction(api.mcpOAuth.initializeMCPConnection);
  const initializeSmitheryConnection = useAction(api.mcpOAuth.initializeSmitheryConnection);
  const completeOAuth = useAction(api.mcpOAuth.completeMCPOAuth);
  const listTools = useAction(api.mcpOAuth.listMCPTools);
  const callTool = useAction(api.mcpOAuth.callMCPTool);
  const disconnectSession = useAction(api.mcpOAuth.disconnectMCPSession);
  const getSessionStatus = useAction(api.mcpOAuth.getMCPSessionStatus);

  const generateDefaultArgs = (tool: MCPTool): string => {
    if (!tool.inputSchema?.properties) {
      return "{}";
    }

    const defaultArgs: Record<string, unknown> = {};

    Object.entries(tool.inputSchema.properties).forEach(([key, schema]) => {
      switch (schema.type) {
        case "string":
          defaultArgs[key] = schema.default || "";
          break;
        case "number":
        case "integer":
          defaultArgs[key] = schema.default || 0;
          break;
        case "boolean":
          defaultArgs[key] = schema.default || false;
          break;
        case "array":
          defaultArgs[key] = schema.default || [];
          break;
        case "object":
          defaultArgs[key] = schema.default || {};
          break;
        default:
          defaultArgs[key] = schema.default || null;
      }
    });

    return JSON.stringify(defaultArgs, null, 2);
  };

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setJsonError(null);

    if (toolName) {
      const tool = tools.find((t) => t.name === toolName);
      if (tool) {
        setToolArgs(generateDefaultArgs(tool));
      }
    } else {
      setToolArgs("{}");
    }
  };

  const handleArgsChange = (value: string) => {
    setToolArgs(value);

    try {
      if (value.trim()) {
        JSON.parse(value);
      }
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const getCallbackUrl = () => {
    return `${window.location.origin}/mcp/oauth/callback`;
  };

  const handleConnect = async () => {
    if (!serverUrl) return;

    setLoading(true);
    setError(null);
    setJsonError(null);

    try {
      // Check if this is a Smithery server and use the appropriate connection method
      const isSmitheryServer = serverUrl.includes('smithery.ai');
      let result;
      
      if (isSmitheryServer) {
        // Extract server ID from Smithery URL
        const serverId = serverUrl.match(/server\.smithery\.ai\/([^\/]+)/)?.[1] || 'exa';
        result = await initializeSmitheryConnection({
          serverId,
          callbackUrl: getCallbackUrl(),
        });
      } else {
        result = await initializeConnection({
          serverUrl,
          callbackUrl: getCallbackUrl(),
        });
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.requiresAuth && result.sessionId) {
        // Store session info
        setSession({
          sessionId: result.sessionId,
          serverUrl,
          status: "pending_auth",
          isConnected: false,
        });

        // Open authorization URL in a popup (if available)
        let popup: Window | null = null;
        if ('authUrl' in result && result.authUrl) {
          popup = window.open(
            result.authUrl,
            "mcp-oauth-popup",
            "width=600,height=700,scrollbars=yes,resizable=yes"
          );
        }

        // Listen for messages from the popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === "mcp-oauth-success") {
            popup?.close();

            try {
              const finishResult = await completeOAuth({
                authCode: event.data.code,
                sessionId: result.sessionId!,
              });

              if (finishResult.success) {
                setSession(prev => prev ? { ...prev, status: "connected", isConnected: true } : null);
                await loadTools(result.sessionId!);
              } else {
                setError(`Failed to complete authentication: ${finishResult.error}`);
              }
            } catch (err) {
              setError(`Failed to complete authentication: ${err}`);
            }

            window.removeEventListener("message", messageHandler);
          } else if (event.data.type === "mcp-oauth-error") {
            popup?.close();
            setError(`OAuth failed: ${event.data.error}`);
            window.removeEventListener("message", messageHandler);
          }
        };

        window.addEventListener("message", messageHandler);
      } else if (result.success && result.sessionId) {
        // Direct connection successful
        setSession({
          sessionId: result.sessionId,
          serverUrl,
          status: "connected",
          isConnected: true,
        });
        await loadTools(result.sessionId);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Connection failed: ${err.message}`);
      } else {
        setError(`Connection failed: ${err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async (sessionId: string) => {
    try {
      const result = await listTools({ sessionId });
      setTools(result.tools || []);
    } catch (err) {
      setError(`Failed to load tools: ${err}`);
    }
  };

  const handleCallTool = async () => {
    if (!selectedTool || !session) return;

    setLoading(true);
    setError(null);
    setToolResult(null);

    try {
      let args = {};
      if (toolArgs.trim()) {
        args = JSON.parse(toolArgs);
      }

      const result = await callTool({
        sessionId: session.sessionId,
        toolName: selectedTool,
        toolArgs: args,
      });

      setToolResult(result.result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Tool call failed: ${err.message}`);
      } else {
        setError(`Tool call failed: ${err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!session) return;

    try {
      await disconnectSession({ sessionId: session.sessionId });
    } catch {
      // Ignore disconnect errors
    }

    setSession(null);
    setTools([]);
    setSelectedTool("");
    setToolResult(null);
    setJsonError(null);
  };

  // Handle OAuth callback from popup
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === "mcp-oauth-callback") {
        // Handle the OAuth callback
        if (event.data.code) {
          window.postMessage({ type: "mcp-oauth-success", code: event.data.code }, "*");
        } else if (event.data.error) {
          window.postMessage({ type: "mcp-oauth-error", error: event.data.error }, "*");
        }
      }
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Production MCP Integration
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connect to MCP servers with OAuth authentication support.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
          }`}>
            {error}
          </div>
        )}

        {/* Connection Form */}
        {!session?.isConnected ? (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                MCP Server URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://server.smithery.ai/example/mcp"
                className={`w-full px-3 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-neutral-800 text-white' 
                    : 'bg-white border border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-gray-500 focus:border-transparent`}
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={!serverUrl || loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-neutral-600 hover:bg-neutral-700 text-white disabled:bg-neutral-600'
                  : 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-300'
              } disabled:cursor-not-allowed`}
            >
              {loading ? 'Connecting...' : 'Connect to MCP Server'}
            </button>

            {session?.status === "pending_auth" && (
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
              }`}>
                Waiting for OAuth authorization...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className={`text-green-600 font-medium`}>
                ✅ Connected to {session.serverUrl}
              </div>
              <button
                onClick={handleDisconnect}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-red-500 text-white hover:bg-neutral-900' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Disconnect
              </button>
            </div>

            {/* Tool Interface */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Call Tool
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Select Tool
                  </label>
                  <select
                    value={selectedTool}
                    onChange={(e) => handleToolSelect(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white border border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-gray-500 focus:border-transparent`}
                  >
                    <option value="">Select a tool...</option>
                    {tools.map((tool) => (
                      <option key={tool.name} value={tool.name}>
                        {tool.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTool && (() => {
                  const tool = tools.find((t) => t.name === selectedTool);
                  return tool?.inputSchema?.properties ? (
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}>
                      <h4 className={`text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-800'
                      }`}>
                        Expected Parameters:
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(tool.inputSchema.properties).map(([key, schema]) => (
                          <div key={key} className="text-sm">
                            <span className={`font-medium ${
                              isDarkMode ? 'text-gray-200' : 'text-gray-700'
                            }`}>
                              {key}
                            </span>
                            {tool.inputSchema?.required?.includes(key) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            <span className={`ml-2 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              ({schema.type || "any"})
                            </span>
                            {schema.description && (
                              <div className={`ml-4 text-xs ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                {schema.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Arguments (JSON)
                  </label>
                  <textarea
                    value={toolArgs}
                    onChange={(e) => handleArgsChange(e.target.value)}
                    placeholder="{}"
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg ${
                      jsonError
                        ? 'border border-red-500 focus:ring-red-500'
                        : isDarkMode
                        ? 'bg-gray-800 text-white focus:ring-gray-500'
                        : 'bg-white border border-gray-300 text-gray-900 focus:ring-gray-500'
                    } focus:ring-2 focus:border-transparent`}
                  />
                  {jsonError && (
                    <div className="mt-1 text-sm text-red-500">{jsonError}</div>
                  )}
                </div>

                <button
                  onClick={handleCallTool}
                  disabled={!selectedTool || loading || !!jsonError}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-green-600 hover:bg-neutral-900 text-white disabled:bg-gray-600'
                      : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
                  } disabled:cursor-not-allowed`}
                >
                  {loading ? 'Calling...' : 'Call Tool'}
                </button>
              </div>
            </div>

            {/* Tool Result */}
            {toolResult && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Tool Result
                </h3>
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <pre className={`whitespace-pre-wrap text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {JSON.stringify(toolResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Available Tools */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Available Tools ({tools.length})
              </h3>
              {tools.length > 0 ? (
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className={`p-3 rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-800'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {tool.name}
                      </div>
                      {tool.description && (
                        <div className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {tool.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No tools available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
