import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Smithery Registry API types
interface SmitheryServer {
  qualifiedName: string;
  displayName: string | null;
  description: string | null;
  useCount: number;
  remote: boolean;
  createdAt: string;
  homepage: string;
  // Add missing properties that the UI expects
  id?: string;
  name?: string;
  version?: string;
  usage_count?: number;
  tags?: string[];
  tools?: any[];
  category?: string;
}

interface SmitherySearchResponse {
  servers: SmitheryServer[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

// Transform Smithery server data to match UI expectations
function transformSmitheryServer(server: any): SmitheryServer {
  return {
    qualifiedName: server.qualifiedName || server.name || "",
    displayName: server.displayName || server.name || "",
    description: server.description || "",
    useCount: server.useCount || server.usage_count || 0,
    remote: server.remote || true,
    createdAt: server.createdAt || new Date().toISOString(),
    homepage: server.homepage || "",
    // Add UI-expected properties
    id: server.qualifiedName || server.name || "",
    name: server.displayName || server.name || server.qualifiedName || "",
    version: server.version || "1.0.0",
    usage_count: server.useCount || server.usage_count || 0,
    tags: server.tags || [],
    tools: server.tools || [],
    category: server.category || "general",
  };
}

// Update the searchMCPServers function to include quality filters
export const searchMCPServers = internalAction({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      // Enhanced query with quality filters for verified, deployed, and secure servers
      const qualityQuery = `${args.query} is:verified is:deployed`;
      
      const response = await fetch(
        `https://registry.smithery.ai/servers?q=${encodeURIComponent(qualityQuery)}&pageSize=${args.limit || 10}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter and sort by quality indicators
      const qualityServers = data.servers
        .filter((server: any) => {
          // Only include servers that meet our quality standards
          return (
            server.isDeployed === true &&
            server.useCount > 0 && // Must have some usage history
            server.qualifiedName && // Must have proper qualified name
            server.displayName && // Must have proper display name
            server.description // Must have description
          );
        })
        .sort((a: any, b: any) => {
          // Sort by quality score: use count + deployment status
          const scoreA = (a.useCount || 0) + (a.isDeployed ? 100 : 0);
          const scoreB = (b.useCount || 0) + (b.isDeployed ? 100 : 0);
          return scoreB - scoreA;
        })
        .map((server: any) => ({
          qualifiedName: server.qualifiedName,
          displayName: server.displayName,
          description: server.description,
          homepage: server.homepage,
          iconUrl: server.iconUrl,
          useCount: server.useCount,
          isDeployed: server.isDeployed,
          isVerified: true, // Since we filtered for is:verified
          createdAt: server.createdAt,
          qualityScore: (server.useCount || 0) + (server.isDeployed ? 100 : 0)
        }));

      return {
        servers: qualityServers,
        totalFound: qualityServers.length,
        qualityFiltersApplied: ['verified', 'deployed', 'minimum_usage'],
        searchQuery: qualityQuery
      };
    } catch (error) {
      console.error('Error searching MCP servers:', error);
      throw new Error(`Failed to search MCP servers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Add a new function to get popular verified servers
export const getPopularMCPServers = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      // Get popular verified servers with quality filters
      const qualityQuery = "is:verified is:deployed";
      
      const response = await fetch(
        `https://registry.smithery.ai/servers?q=${encodeURIComponent(qualityQuery)}&pageSize=${args.limit || 20}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Get detailed info for top servers to check security status
      const topServers = data.servers
        .filter((server: any) => server.isDeployed && server.useCount > 5) // Only well-used servers
        .sort((a: any, b: any) => (b.useCount || 0) - (a.useCount || 0))
        .slice(0, args.limit || 20);

      // Get detailed security info for each server
      const serversWithSecurity = await Promise.all(
        topServers.map(async (server: any) => {
          try {
            const detailResponse = await fetch(
              `https://registry.smithery.ai/servers/${server.qualifiedName}`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (detailResponse.ok) {
              const detail = await detailResponse.json();
              return {
                ...server,
                security: detail.security,
                tools: detail.tools,
                isSecure: detail.security?.scanPassed === true
              };
            }
            return server;
          } catch (error) {
            console.warn(`Failed to get security info for ${server.qualifiedName}:`, error);
            return server;
          }
        })
      );

      // Prioritize secure servers
      const secureServers = serversWithSecurity
        .filter(server => {
          // Only include servers that are either confirmed secure or haven't been scanned yet
          return server.security?.scanPassed !== false;
        })
        .sort((a: any, b: any) => {
          // Prioritize: secure > high usage > deployed
          const secureScoreA = (a.isSecure ? 1000 : 0) + (a.useCount || 0);
          const secureScoreB = (b.isSecure ? 1000 : 0) + (b.useCount || 0);
          return secureScoreB - secureScoreA;
        });

      return {
        servers: secureServers.map(server => ({
          qualifiedName: server.qualifiedName,
          displayName: server.displayName,
          description: server.description,
          homepage: server.homepage,
          iconUrl: server.iconUrl,
          useCount: server.useCount,
          isDeployed: server.isDeployed,
          isVerified: true,
          isSecure: server.isSecure,
          securityStatus: server.security?.scanPassed,
          toolCount: server.tools?.length || 0,
          qualityScore: (server.isSecure ? 1000 : 0) + (server.useCount || 0)
        })),
        totalFound: secureServers.length,
        qualityFiltersApplied: ['verified', 'deployed', 'security_scanned', 'minimum_usage']
      };
    } catch (error) {
      console.error('Error getting popular MCP servers:', error);
      throw new Error(`Failed to get popular MCP servers: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Enhanced getMCPServerDetails with security validation
export const getMCPServerDetails = internalAction({
  args: {
    qualifiedName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const response = await fetch(
        `https://registry.smithery.ai/servers/${args.qualifiedName}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Server not found: ${response.status}`);
      }

      const server = await response.json();
      
      // Validate server quality
      const qualityChecks = {
        isDeployed: server.isDeployed === true,
        hasTools: server.tools && server.tools.length > 0,
        isSecure: server.security?.scanPassed === true,
        hasUsage: (server.useCount || 0) > 0,
        hasValidConfig: server.connections && server.connections.length > 0
      };

      const qualityScore = Object.values(qualityChecks).filter(Boolean).length;
      
      // Only recommend servers with high quality scores
      const isRecommended = qualityScore >= 3 && qualityChecks.isDeployed;

      return {
        ...server,
        qualityChecks,
        qualityScore,
        isRecommended,
        securityStatus: server.security?.scanPassed,
        riskLevel: server.security?.scanPassed === false ? 'high' : 
                  server.security?.scanPassed === true ? 'low' : 'unknown'
      };
    } catch (error) {
      console.error('Error getting MCP server details:', error);
      throw new Error(`Failed to get server details: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Get tools available for a specific MCP server
export const getMCPServerTools = internalAction({
  args: {
    serverId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      // For Smithery servers, tools are typically available in the server metadata
      // This is a placeholder - actual implementation would depend on Smithery's API
      const response = await fetch(`https://registry.smithery.ai/servers?q=${args.serverId}&pageSize=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Convex-AI-Agent/1.0',
          ...(process.env.SMITHERY_API_KEY && { 'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status}`);
      }

      const data: any = await response.json();
      const server = data.servers?.[0];
      
      return server?.tools || [];
    } catch (error) {
      console.error("Smithery server tools error:", error);
      throw new Error("Failed to get MCP server tools");
    }
  },
});

// Create MCP connection for user
export const createMCPConnection = internalMutation({
  args: {
    serverId: v.string(),
    serverName: v.string(),
    connectionUrl: v.string(),
    apiKey: v.optional(v.string()),
    credentials: v.optional(v.any()),
    enabledTools: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Generate the proper Smithery server URL
    const smitheryUrl = args.connectionUrl.includes('smithery.ai') 
      ? args.connectionUrl 
      : `https://server.smithery.ai/${args.serverId}/mcp`;

    const connectionId = await ctx.db.insert("mcpConnections", {
      userId,
      serverId: args.serverId,
      serverName: args.serverName,
      connectionUrl: smitheryUrl,
      apiKey: args.apiKey,
      credentials: args.credentials,
      enabledTools: args.enabledTools,
      isConnected: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return connectionId;
  },
});

// Test MCP connection
export const testMCPConnection = internalAction({
  args: {
    connectionId: v.id("mcpConnections"),
  },
  handler: async (ctx, args): Promise<{ isConnected: boolean; status: number; message: string; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const connection = await ctx.runQuery(internal.smithery.getMCPConnection, {
      connectionId: args.connectionId,
      userId,
    });

    if (!connection) {
      throw new Error("Connection not found");
    }

    try {
      // For Smithery servers, we'll test by making a simple request to the server URL
      // This is a basic connectivity test - actual MCP connection would require the SDK
      const testResponse = await fetch(connection.connectionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Convex-AI-Agent/1.0',
          ...(connection.apiKey && { 'Authorization': `Bearer ${connection.apiKey}` }),
        },
      });

      const isConnected = testResponse.ok || testResponse.status === 405; // 405 is OK for MCP servers

      // Update connection status
      await ctx.runMutation(internal.smithery.updateMCPConnectionStatus, {
        connectionId: args.connectionId,
        isConnected,
      });

      return {
        isConnected,
        status: testResponse.status,
        message: isConnected ? "Connection successful" : "Connection failed",
      };
    } catch (error) {
      await ctx.runMutation(internal.smithery.updateMCPConnectionStatus, {
        connectionId: args.connectionId,
        isConnected: false,
      });

      return {
        isConnected: false,
        status: 500,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Get user's MCP connections
export const getUserMCPConnections = query({
  args: { conversationId: v.optional(v.id("conversations")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("mcpConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Update MCP connection
export const updateMCPConnection = mutation({
  args: {
    connectionId: v.id("mcpConnections"),
    enabledTools: v.optional(v.array(v.string())),
    apiKey: v.optional(v.string()),
    credentials: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error("Connection not found or access denied");
    }

    await ctx.db.patch(args.connectionId, {
      ...(args.enabledTools && { enabledTools: args.enabledTools }),
      ...(args.apiKey && { apiKey: args.apiKey }),
      ...(args.credentials && { credentials: args.credentials }),
      updatedAt: Date.now(),
    });

    return args.connectionId;
  },
});

// Delete MCP connection
export const deleteMCPConnection = mutation({
  args: {
    connectionId: v.id("mcpConnections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error("Connection not found or access denied");
    }

    await ctx.db.delete(args.connectionId);
    return true;
  },
});

// Internal functions
export const getMCPConnection = internalQuery({
  args: {
    connectionId: v.id("mcpConnections"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== args.userId) {
      return null;
    }
    return connection;
  },
});

export const updateMCPConnectionStatus = internalMutation({
  args: {
    connectionId: v.id("mcpConnections"),
    isConnected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      isConnected: args.isConnected,
      updatedAt: Date.now(),
    });
  },
});

// Execute MCP tool - This would require the MCP SDK for full implementation
export const executeMCPTool = action({
  args: {
    connectionId: v.id("mcpConnections"),
    toolName: v.string(),
    parameters: v.any(),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const connection = await ctx.runQuery(internal.smithery.getMCPConnection, {
      connectionId: args.connectionId,
      userId,
    });

    if (!connection) {
      throw new Error("Connection not found");
    }

    if (!connection.isConnected) {
      throw new Error("Connection is not active");
    }

    if (!connection.enabledTools.includes(args.toolName)) {
      throw new Error("Tool is not enabled for this connection");
    }

    try {
      // Use MCP-compatible API call format
      const response = await fetch(`${connection.connectionUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Convex-AI-Agent/1.0',
          ...(connection.apiKey && { 'Authorization': `Bearer ${connection.apiKey}` }),
        },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: args.toolName,
            arguments: args.parameters,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("MCP tool execution error:", error);
      throw new Error("Failed to execute MCP tool");
    }
  },
});

// Initialize OAuth flow for Smithery server
export const initializeOAuthFlow = action({
  args: {
    serverId: v.string(),
    redirectUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      // Generate the Smithery OAuth URL
      const smitheryUrl = `https://server.smithery.ai/${args.serverId}/mcp`;
      const authUrl = new URL(`https://smithery.ai/oauth/authorize`);
      
      authUrl.searchParams.set('server_url', smitheryUrl);
      authUrl.searchParams.set('redirect_uri', args.redirectUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'read write');
      
      return {
        authUrl: authUrl.toString(),
        serverUrl: smitheryUrl,
      };
    } catch (error) {
      console.error("OAuth initialization error:", error);
      throw new Error("Failed to initialize OAuth flow");
    }
  },
});

// Complete OAuth flow and store tokens
export const completeOAuthFlow = mutation({
  args: {
    connectionId: v.id("mcpConnections"),
    authCode: v.string(),
    tokens: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error("Connection not found or access denied");
    }

    await ctx.db.patch(args.connectionId, {
      credentials: {
        ...connection.credentials,
        tokens: args.tokens,
        authCode: args.authCode,
      },
      isConnected: true,
      updatedAt: Date.now(),
    });

    return args.connectionId;
  },
});

// AI-initiated MCP integration suggestion with tool preview
export const suggestMCPIntegration = action({
  args: {
    query: v.string(), // What the user wants to accomplish
    suggestedServers: v.optional(v.array(v.string())), // Specific server IDs to suggest
  },
  returns: v.object({
    query: v.string(),
    suggestedServers: v.array(v.any()),
    requiresUserConsent: v.boolean(),
    nextStep: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      // Search for relevant verified MCP servers if not provided
      let servers: any[] = [];
      if (args.suggestedServers && args.suggestedServers.length > 0) {
        // Get details for specific suggested servers (already quality-filtered)
        for (const serverId of args.suggestedServers) {
          const server: any = await ctx.runAction(internal.smithery.getMCPServerDetails, {
            qualifiedName: serverId
          });
          if (server && server.isRecommended) {
            servers.push(server);
          }
        }
      } else {
        // Search for verified, secure servers based on the query
        const searchResult: any = await ctx.runAction(internal.smithery.searchMCPServers, {
          query: args.query,
          limit: 3 // Limit to top 3 most relevant verified servers
        });
        servers = searchResult.servers;
      }

      // Get tools for each server
      const serversWithTools: any[] = await Promise.all(
        servers.map(async (server: any) => {
          try {
            const tools = await ctx.runAction(internal.smithery.getMCPServerTools, {
              serverId: server.qualifiedName
            });
            return {
              ...server,
              tools: tools || [],
              toolCount: tools?.length || 0
            };
          } catch (error) {
            console.error(`Failed to get tools for ${server.qualifiedName}:`, error);
            return {
              ...server,
              tools: [],
              toolCount: 0
            };
          }
        })
      );

      return {
        query: args.query,
        suggestedServers: serversWithTools,
        requiresUserConsent: true,
        nextStep: "collect_credentials"
      };
    } catch (error) {
      console.error("MCP integration suggestion error:", error);
      throw new Error("Failed to suggest MCP integration");
    }
  },
});

// Function to create a pending MCP integration that awaits user credentials
export const createPendingMCPIntegration = mutation({
  args: {
    serverId: v.string(),
    serverName: v.string(),
    connectionUrl: v.string(),
    requiredCredentials: v.array(v.object({
      name: v.string(),
      type: v.string(), // "text", "password", "token", "oauth"
      description: v.string(),
      required: v.boolean(),
    })),
    suggestedTools: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Create a pending integration record
    const pendingId = await ctx.db.insert("pendingMCPIntegrations", {
      userId,
      serverId: args.serverId,
      serverName: args.serverName,
      connectionUrl: args.connectionUrl,
      requiredCredentials: args.requiredCredentials,
      suggestedTools: args.suggestedTools,
      status: "awaiting_credentials",
      createdAt: Date.now(),
    });

    return {
      pendingId,
      credentialModalData: {
        serverName: args.serverName,
        description: `Connect to ${args.serverName} to enable these tools: ${args.suggestedTools.join(', ')}`,
        credentials: args.requiredCredentials,
      }
    };
  },
});

// Complete the pending integration with user-provided credentials
// Helper query to get pending MCP integration
export const getPendingMCPIntegration = internalQuery({
  args: {
    pendingId: v.id("pendingMCPIntegrations"),
    userId: v.id("users"),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingId);
    if (!pending || pending.userId !== args.userId) {
      return null;
    }
    return pending;
  },
});

// Helper mutation to delete pending MCP integration
export const deletePendingMCPIntegration = internalMutation({
  args: {
    pendingId: v.id("pendingMCPIntegrations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.pendingId);
    return null;
  },
});

export const completePendingMCPIntegration = action({
  args: {
    pendingId: v.id("pendingMCPIntegrations"),
    credentials: v.any(),
    selectedTools: v.array(v.string()),
  },
  returns: v.object({
    connectionId: v.any(),
    isConnected: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const pending: any = await ctx.runQuery(internal.smithery.getPendingMCPIntegration, {
      pendingId: args.pendingId,
      userId,
    });
    if (!pending) {
      throw new Error("Pending integration not found");
    }

    // Create the actual MCP connection
    const connectionId: any = await ctx.runMutation(internal.smithery.createMCPConnection, {
      serverId: pending.serverId,
      serverName: pending.serverName,
      connectionUrl: pending.connectionUrl,
      credentials: args.credentials,
      enabledTools: args.selectedTools,
    });

    // Clean up the pending record
    await ctx.runMutation(internal.smithery.deletePendingMCPIntegration, {
      pendingId: args.pendingId,
    });

    // Test the connection
    const testResult: any = await ctx.runAction(internal.smithery.testMCPConnection, {
      connectionId,
    });

    return {
      connectionId,
      isConnected: testResult.isConnected,
      message: testResult.message,
    };
  },
});
