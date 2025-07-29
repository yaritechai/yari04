import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
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

// Search MCP servers from Smithery registry
export const searchMCPServers = action({
  args: {
    query: v.optional(v.string()),
    profile: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SmitherySearchResponse> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const searchParams = new URLSearchParams();
      
      if (args.query) searchParams.append('q', args.query);
      if (args.profile) searchParams.append('profile', args.profile);
      if (args.page) searchParams.append('page', String(args.page));
      if (args.pageSize) searchParams.append('pageSize', String(args.pageSize));

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Convex-AI-Agent/1.0',
      };

      if (process.env.SMITHERY_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.SMITHERY_API_KEY}`;
      }

      const response = await fetch(`https://registry.smithery.ai/servers?${searchParams}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status}`);
      }

      const data: any = await response.json();
      
      // Transform the response to match expected format
      const transformedServers = (data.servers || []).map(transformSmitheryServer);
      
      return {
        servers: transformedServers,
        pagination: data.pagination || {
          currentPage: 1,
          pageSize: args.pageSize || 10,
          totalPages: 1,
          totalCount: transformedServers.length,
        },
      };
    } catch (error) {
      console.error("Smithery search error:", error);
      throw new Error("Failed to search MCP servers");
    }
  },
});

// Get popular MCP servers
export const getPopularMCPServers = action({
  args: {
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SmitherySearchResponse> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const searchParams = new URLSearchParams();
      searchParams.append('pageSize', String(args.pageSize || 10));

      const response = await fetch(`https://registry.smithery.ai/servers?${searchParams}`, {
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
      
      // Transform the response to match expected format
      const transformedServers = (data.servers || []).map(transformSmitheryServer);
      
      return {
        servers: transformedServers,
        pagination: data.pagination || {
          currentPage: 1,
          pageSize: args.pageSize || 10,
          totalPages: 1,
          totalCount: transformedServers.length,
        },
      };
    } catch (error) {
      console.error("Smithery popular servers error:", error);
      throw new Error("Failed to get popular MCP servers");
    }
  },
});

// Get detailed information about a specific MCP server
export const getMCPServerDetails = action({
  args: {
    qualifiedName: v.string(),
  },
  handler: async (ctx, args): Promise<SmitheryServer | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const response = await fetch(`https://registry.smithery.ai/servers?q=${args.qualifiedName}&pageSize=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Convex-AI-Agent/1.0',
          ...(process.env.SMITHERY_API_KEY && { 'Authorization': `Bearer ${process.env.SMITHERY_API_KEY}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status}`);
      }

      const data: SmitherySearchResponse = await response.json();
      const server = data.servers.find(s => s.qualifiedName === args.qualifiedName);
      return server ? transformSmitheryServer(server) : null;
    } catch (error) {
      console.error("Smithery server details error:", error);
      throw new Error("Failed to get MCP server details");
    }
  },
});

// Get tools available for a specific MCP server
export const getMCPServerTools = action({
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
export const createMCPConnection = mutation({
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
export const testMCPConnection = action({
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
  args: {},
  handler: async (ctx) => {
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
