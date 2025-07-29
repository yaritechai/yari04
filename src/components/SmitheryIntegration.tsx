import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../contexts/ThemeContext";
import { Id } from "../../convex/_generated/dataModel";

interface SmitheryServer {
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

export function SmitheryIntegration() {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServer, setSelectedServer] = useState<SmitheryServer | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SmitheryServer[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");

  const userConnections = useQuery(api.smithery.getUserMCPConnections) || [];
  const [popularServers, setPopularServers] = useState<SmitheryServer[]>([]);
  
  const searchServers = useAction(api.smithery.searchMCPServers);
  const getPopularServers = useAction(api.smithery.getPopularMCPServers);
  const createConnection = useMutation(api.smithery.createMCPConnection);
  const testConnection = useAction(api.smithery.testMCPConnection);
  const deleteConnection = useMutation(api.smithery.deleteMCPConnection);
  const initializeOAuth = useAction(api.smithery.initializeOAuthFlow);
  const listTools = useAction(api.mcpTools.listConnectionTools);
  const getConnectionInfo = useAction(api.mcpTools.getConnectionInfo);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchServers({
        query: searchQuery,
        pageSize: 10
      });
      setSearchResults(results.servers);
    } catch (error) {
      console.error("Search failed:", error);
      setConnectionStatus("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedServer) return;

    setIsConnecting(true);
    setConnectionStatus("Creating connection...");

    try {
      // Generate the proper Smithery server URL
      const smitheryUrl = `https://server.smithery.ai/${selectedServer.qualifiedName}/mcp`;
      
      const connectionId = await createConnection({
        serverId: selectedServer.qualifiedName,
        serverName: selectedServer.displayName || selectedServer.name || selectedServer.qualifiedName,
        connectionUrl: connectionUrl || smitheryUrl,
        apiKey: apiKey || undefined,
        enabledTools: selectedTools,
      });

      setConnectionStatus("Testing connection...");

      // Test the connection
      const testResult = await testConnection({ connectionId });
      
      if (testResult.isConnected) {
        setConnectionStatus("Connection successful!");
        setShowConnectionForm(false);
        setSelectedServer(null);
        setConnectionUrl("");
        setApiKey("");
        setSelectedTools([]);
      } else {
        setConnectionStatus(`Connection failed: ${testResult.message}`);
      }
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionStatus("Connection failed. Please check your settings and try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!selectedServer) return;

    try {
      setConnectionStatus("Initializing OAuth flow...");
      
      const oauthResult = await initializeOAuth({
        serverId: selectedServer.qualifiedName,
        redirectUrl: `${window.location.origin}/oauth/callback`,
      });

      // Redirect to Smithery OAuth page
      window.location.href = oauthResult.authUrl;
    } catch (error) {
      console.error("OAuth initialization failed:", error);
      setConnectionStatus("OAuth initialization failed. Please try again.");
    }
  };

  const handleDeleteConnection = async (connectionId: Id<"mcpConnections">) => {
    try {
      await deleteConnection({ connectionId });
      setConnectionStatus("Connection removed successfully.");
    } catch (error) {
      console.error("Delete failed:", error);
      setConnectionStatus("Failed to remove connection.");
    }
  };

  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName) 
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    );
  };

  useEffect(() => {
    if (selectedServer) {
      const tools = selectedServer.tools || [];
      setSelectedTools(tools.map(t => typeof t === 'string' ? t : t.name || t));
      // Set default connection URL
      setConnectionUrl(`https://server.smithery.ai/${selectedServer.qualifiedName}/mcp`);
    }
  }, [selectedServer]);

  useEffect(() => {
    const loadPopularServers = async () => {
      try {
        const servers = await getPopularServers({ pageSize: 6 });
        setPopularServers(servers.servers);
      } catch (error) {
        console.error("Failed to load popular servers:", error);
      }
    };
    
    loadPopularServers();
  }, [getPopularServers]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code) {
      setConnectionStatus("OAuth authentication successful!");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setConnectionStatus(`OAuth failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Smithery MCP Integration
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connect to MCP servers hosted on Smithery for enhanced AI capabilities.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search MCP servers (e.g., Gmail, Slack, GitHub)..."
            className={`flex-1 px-3 py-2 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-gray-500`}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-gray-600 hover:bg-neutral-900 text-white disabled:bg-gray-600'
                : 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-300'
            } disabled:cursor-not-allowed`}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Status Message */}
        {connectionStatus && (
          <div className={`mb-4 p-3 rounded-lg ${
            connectionStatus.includes('successful') || connectionStatus.includes('Success')
              ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
              : isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* User Connections */}
        {userConnections.length > 0 && (
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Your Connections
            </h3>
            <div className="grid gap-4">
              {userConnections.map((connection) => (
                <div
                  key={connection._id}
                  className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {connection.serverName}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        connection.isConnected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {connection.isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                      <button
                        onClick={() => handleDeleteConnection(connection._id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    {connection.enabledTools.length} tools enabled
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {connection.enabledTools.slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className={`px-2 py-1 rounded text-xs ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tool}
                      </span>
                    ))}
                    {connection.enabledTools.length > 3 && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        +{connection.enabledTools.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Search Results
            </h3>
            <div className="grid gap-4">
              {searchResults.map((server) => (
                <ServerCard
                  key={server.qualifiedName}
                  server={server}
                  isDarkMode={isDarkMode}
                  onConnect={() => {
                    setSelectedServer(server);
                    setShowConnectionForm(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Popular Servers */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Popular MCP Servers
          </h3>
          <div className="grid gap-4">
            {popularServers.length === 0 ? (
              <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading popular servers...
              </div>
            ) : (
              popularServers.map((server) => (
                <ServerCard
                  key={server.qualifiedName}
                  server={server}
                  isDarkMode={isDarkMode}
                  onConnect={() => {
                    setSelectedServer(server);
                    setShowConnectionForm(true);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Connection Form Modal */}
      {showConnectionForm && selectedServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-lg p-6 max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Connect to {selectedServer.displayName || selectedServer.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Connection URL
                </label>
                <input
                  type="url"
                  value={connectionUrl}
                  onChange={(e) => setConnectionUrl(e.target.value)}
                  placeholder="https://server.smithery.ai/..."
                  className={`w-full px-3 py-2 rounded ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-white border border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-gray-500`}
                  readOnly
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  This is the Smithery server URL for {selectedServer.qualifiedName}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  API Key (if required)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key if the server requires one"
                  className={`w-full px-3 py-2 rounded ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-white border border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-gray-500`}
                />
              </div>

              {selectedServer.tools && selectedServer.tools.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Available Tools ({selectedServer.tools.length})
                  </label>
                  <div className={`max-h-32 overflow-y-auto space-y-2 rounded p-2 ${isDarkMode ? 'bg-gray-700' : 'border'}`}>
                    {selectedServer.tools.map((tool, index) => {
                      const toolName = typeof tool === 'string' ? tool : tool.name || `tool-${index}`;
                      return (
                        <label key={toolName} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTools.includes(toolName)}
                            onChange={() => handleToolToggle(toolName)}
                            className="mr-2"
                          />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {toolName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Connection Options */}
              <div className={`p-3 rounded ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50 border border-gray-200'
              }`}>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Connection Method
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                  Some servers may require OAuth authentication through Smithery.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !connectionUrl}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                      isDarkMode
                        ? 'bg-gray-600 hover:bg-neutral-900 text-white disabled:bg-gray-600'
                        : 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-300'
                    } disabled:cursor-not-allowed`}
                  >
                    {isConnecting ? 'Connecting...' : 'Direct Connect'}
                  </button>
                  <button
                    onClick={handleOAuthConnect}
                    disabled={isConnecting}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                      isDarkMode
                        ? 'bg-green-600 hover:bg-neutral-900 text-white disabled:bg-gray-600'
                        : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
                    } disabled:cursor-not-allowed`}
                  >
                    OAuth Connect
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowConnectionForm(false);
                  setConnectionStatus("");
                }}
                className={`flex-1 px-4 py-2 rounded font-medium ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-neutral-900 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServerCard({ 
  server, 
  isDarkMode, 
  onConnect 
}: { 
  server: SmitheryServer; 
  isDarkMode: boolean; 
  onConnect: () => void;
}) {
  return (
    <div className={`p-4 rounded-lg ${
      isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {server.displayName || server.name || server.qualifiedName}
          </h4>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            {server.description || 'No description available'}
          </p>
        </div>
        <button
          onClick={onConnect}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isDarkMode
              ? 'bg-gray-600 hover:bg-neutral-900 text-white'
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
        >
          Connect
        </button>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span>{server.useCount || server.usage_count || 0} users</span>
        <span>{server.tools?.length || 0} tools</span>
        {server.category && <span>{server.category}</span>}
      </div>
      
      {server.tags && server.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {server.tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className={`px-2 py-1 rounded text-xs ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tag}
            </span>
          ))}
          {server.tags.length > 4 && (
            <span className={`px-2 py-1 rounded text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              +{server.tags.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
