import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// List tools for a connection
export const listConnectionTools = action({
  args: { connectionId: v.id("mcpConnections") },
  handler: async (ctx, args): Promise<any[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");
    
    const connection: any = await ctx.runQuery(internal.smithery.getMCPConnection, {
      connectionId: args.connectionId, 
      userId,
    });
    
    if (!connection) throw new Error("Connection not found");
    
    try {
      const response: Response = await fetch(`${connection.connectionUrl}/call`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Convex-AI-Agent/1.0',
          ...(connection.apiKey && { 'Authorization': `Bearer ${connection.apiKey}` }),
        },
        body: JSON.stringify({ 
          method: 'tools/list', 
          params: {} 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }
      
      const result: any = await response.json();
      return result.result?.tools || [];
    } catch (error) {
      console.error("Failed to list tools:", error);
      return [];
    }
  },
});

// Get connection status and info
export const getConnectionInfo = action({
  args: { connectionId: v.id("mcpConnections") },
  handler: async (ctx, args): Promise<{
    isConnected: boolean;
    error: string | null;
    serverInfo: any;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");
    
    const connection: any = await ctx.runQuery(internal.smithery.getMCPConnection, {
      connectionId: args.connectionId, 
      userId,
    });
    
    if (!connection) throw new Error("Connection not found");
    
    try {
      const response: Response = await fetch(`${connection.connectionUrl}/call`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Convex-AI-Agent/1.0',
          ...(connection.apiKey && { 'Authorization': `Bearer ${connection.apiKey}` }),
        },
        body: JSON.stringify({ 
          method: 'initialize', 
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "Convex-AI-Agent",
              version: "1.0.0"
            }
          }
        }),
      });
      
      if (!response.ok) {
        return { 
          isConnected: false, 
          error: `Connection failed: ${response.status}`,
          serverInfo: null 
        };
      }
      
      const result: any = await response.json();
      return { 
        isConnected: true, 
        error: null,
        serverInfo: result.result 
      };
    } catch (error) {
      return { 
        isConnected: false, 
        error: error instanceof Error ? error.message : String(error),
        serverInfo: null 
      };
    }
  },
});
