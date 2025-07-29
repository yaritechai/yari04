"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Import MCP client and session store
import { MCPOAuthClient } from "./lib/mcpOAuthClient";
import { mcpSessionStore } from "./lib/mcpSessionStore";

// Placeholder MCP OAuth functions
export const initializeMCPConnection = action({
  args: {
    serverUrl: v.string(),
    callbackUrl: v.string(),
    serverId: v.optional(v.string()),
    credentials: v.optional(v.object({
      apiKey: v.optional(v.string()),
      authHeaders: v.optional(v.any()),
      tokens: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args): Promise<{
    success?: boolean;
    requiresAuth?: boolean;
    authUrl?: string;
    sessionId?: string;
    error?: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const sessionId = mcpSessionStore.generateSessionId();
      let authUrl: string | null = null;

      // Prepare credentials - use Smithery API key for Smithery servers
      let credentials = args.credentials;
      if (args.serverId && args.serverUrl.includes('smithery.ai')) {
        credentials = {
          ...credentials,
          apiKey: process.env.SMITHERY_API_KEY || credentials?.apiKey,
        };
      }

      const client = new MCPOAuthClient(
        args.serverUrl,
        args.callbackUrl,
        credentials,
        (redirectUrl: string) => {
          authUrl = redirectUrl;
        }
      );

      const result = await client.connect();

      if (result.requiresAuth) {
        // Store client for later use during OAuth flow
        mcpSessionStore.setClient(sessionId, client);
        
        // Store session info in database for persistence
        await ctx.runMutation(internal.mcpOAuthInternal.storeMCPSession, {
          sessionId,
          userId,
          serverUrl: args.serverUrl,
          callbackUrl: args.callbackUrl,
          status: "pending_auth",
          credentials,
        });

        return {
          requiresAuth: true,
          authUrl: authUrl || undefined,
          sessionId,
        };
      } else {
        // Direct connection successful
        mcpSessionStore.setClient(sessionId, client);
        
        await ctx.runMutation(internal.mcpOAuthInternal.storeMCPSession, {
          sessionId,
          userId,
          serverUrl: args.serverUrl,
          callbackUrl: args.callbackUrl,
          status: "connected",
          credentials,
        });

        return {
          success: true,
          sessionId,
        };
      }
    } catch (error) {
      console.error("MCP connection initialization failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Complete OAuth flow
export const completeMCPOAuth = action({
  args: {
    authCode: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const client = mcpSessionStore.getClient(args.sessionId);
      if (!client) {
        return { success: false, error: "No active OAuth session found" };
      }

      await client.finishAuth(args.authCode);

      // Update session status in database
      await ctx.runMutation(internal.mcpOAuthInternal.updateMCPSessionStatus, {
        sessionId: args.sessionId,
        status: "connected",
        tokens: client.getTokens(),
      });

      return { success: true };
    } catch (error) {
      console.error("OAuth completion failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// List available tools
export const listMCPTools = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const client = mcpSessionStore.getClient(args.sessionId);
    if (!client) {
      throw new Error("No active MCP session found");
    }

    try {
      const result = await client.listTools();
      return { tools: result.tools || [] };
    } catch (error) {
      console.error("Failed to list MCP tools:", error);
      throw new Error("Failed to list tools");
    }
  },
});

// Call MCP tool
export const callMCPTool = action({
  args: {
    sessionId: v.string(),
    toolName: v.string(),
    toolArgs: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const client = mcpSessionStore.getClient(args.sessionId);
    if (!client) {
      throw new Error("No active MCP session found");
    }

    try {
      const result = await client.callTool(args.toolName, args.toolArgs || {});
      
      // Log tool usage for analytics
      await ctx.runMutation(internal.mcpOAuthInternal.logMCPToolUsage, {
        sessionId: args.sessionId,
        userId,
        toolName: args.toolName,
        success: true,
      });

      return { result };
    } catch (error) {
      console.error("MCP tool call failed:", error);
      
      await ctx.runMutation(internal.mcpOAuthInternal.logMCPToolUsage, {
        sessionId: args.sessionId,
        userId,
        toolName: args.toolName,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error("Tool call failed");
    }
  },
});

// Disconnect MCP session
export const disconnectMCPSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      mcpSessionStore.removeClient(args.sessionId);
      
      await ctx.runMutation(internal.mcpOAuthInternal.updateMCPSessionStatus, {
        sessionId: args.sessionId,
        status: "disconnected",
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to disconnect MCP session:", error);
      return { success: false, error: "Failed to disconnect" };
    }
  },
});

// Get MCP session status
export const getMCPSessionStatus = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    isConnected: boolean;
    session: any;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const client = mcpSessionStore.getClient(args.sessionId);
    const isConnected = client?.getConnectionStatus() || false;

    const session: any = await ctx.runQuery(internal.mcpOAuthInternal.getMCPSession, {
      sessionId: args.sessionId,
      userId,
    });

    return {
      isConnected,
      session,
    };
  },
});

// Smithery-specific MCP connection
export const initializeSmitheryConnection = action({
  args: {
    serverId: v.string(),
    callbackUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const serverUrl = `https://server.smithery.ai/${args.serverId}/mcp`;
    const credentials = { apiKey: process.env.SMITHERY_API_KEY };

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const sessionId = mcpSessionStore.generateSessionId();
    const client = new MCPOAuthClient(serverUrl, args.callbackUrl, credentials);

    try {
      const result = await client.connect();
      mcpSessionStore.setClient(sessionId, client);
      
      await ctx.runMutation(internal.mcpOAuthInternal.storeMCPSession, {
        sessionId, userId, serverUrl,
        callbackUrl: args.callbackUrl,
        status: result.requiresAuth ? "pending_auth" : "connected",
        credentials,
      });

      return result.requiresAuth 
        ? { requiresAuth: true, sessionId }
        : { success: true, sessionId };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Restore MCP session from database
export const restoreMCPSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; status: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const session = await ctx.runQuery(internal.mcpOAuthInternal.getMCPSession, {
      sessionId: args.sessionId,
      userId,
    });

    if (!session) throw new Error("Session not found");

    const client = new MCPOAuthClient(
      session.serverUrl,
      session.callbackUrl,
      session.credentials
    );

    mcpSessionStore.setClient(args.sessionId, client, session);
    return { success: true, status: session.status };
  },
});
