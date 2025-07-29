import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// MCP Connection Management
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

    const connectionId = await ctx.db.insert("mcpConnections", {
      userId,
      serverId: args.serverId,
      serverName: args.serverName,
      connectionUrl: args.connectionUrl,
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

export const getMCPConnections = query({
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

export const testMCPConnection = mutation({
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

    // For now, just mark as connected - in a real implementation,
    // this would test the actual connection
    await ctx.db.patch(args.connectionId, {
      isConnected: true,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Connection tested successfully" };
  },
});

export const searchMCPServers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Mock MCP server search results
    const mockServers = [
      {
        id: "gmail-mcp",
        name: "Gmail MCP",
        description: "Connect to Gmail for email management",
        category: "communication",
        usageCount: 1250,
        tools: ["send_email", "read_emails", "search_emails", "create_draft"],
      },
      {
        id: "github-mcp",
        name: "GitHub MCP",
        description: "Integrate with GitHub repositories and issues",
        category: "development",
        usageCount: 980,
        tools: ["create_issue", "list_repos", "create_pr", "get_commits"],
      },
      {
        id: "notion-mcp",
        name: "Notion MCP",
        description: "Manage Notion pages and databases",
        category: "productivity",
        usageCount: 750,
        tools: ["create_page", "update_database", "search_pages", "get_page"],
      },
      {
        id: "slack-mcp",
        name: "Slack MCP",
        description: "Send messages and manage Slack channels",
        category: "communication",
        usageCount: 650,
        tools: ["send_message", "create_channel", "list_channels", "get_users"],
      },
      {
        id: "google-sheets-mcp",
        name: "Google Sheets MCP",
        description: "Read and write Google Sheets data",
        category: "data",
        usageCount: 580,
        tools: ["read_sheet", "write_sheet", "create_sheet", "format_cells"],
      },
    ];

    const filtered = mockServers.filter(server =>
      server.name.toLowerCase().includes(args.query.toLowerCase()) ||
      server.description.toLowerCase().includes(args.query.toLowerCase())
    );

    return filtered.slice(0, args.limit || 5);
  },
});

export const getPopularMCPServers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Mock popular MCP servers
    const popularServers = [
      {
        id: "gmail-mcp",
        name: "Gmail MCP",
        description: "Connect to Gmail for email management",
        category: "communication",
        usageCount: 1250,
        tools: ["send_email", "read_emails", "search_emails", "create_draft"],
      },
      {
        id: "github-mcp",
        name: "GitHub MCP",
        description: "Integrate with GitHub repositories and issues",
        category: "development",
        usageCount: 980,
        tools: ["create_issue", "list_repos", "create_pr", "get_commits"],
      },
      {
        id: "notion-mcp",
        name: "Notion MCP",
        description: "Manage Notion pages and databases",
        category: "productivity",
        usageCount: 750,
        tools: ["create_page", "update_database", "search_pages", "get_page"],
      },
    ];

    return popularServers.slice(0, args.limit || 5);
  },
});

export const getMCPServerDetails = query({
  args: {
    serverId: v.string(),
  },
  handler: async (ctx, args) => {
    // Mock server details
    const serverDetails = {
      "gmail-mcp": {
        id: "gmail-mcp",
        name: "Gmail MCP",
        description: "Connect to Gmail for email management and automation",
        category: "communication",
        usageCount: 1250,
        version: "1.2.0",
        author: "Gmail Team",
        documentation: "https://docs.gmail-mcp.com",
        tools: [
          {
            name: "send_email",
            description: "Send an email to specified recipients",
            parameters: ["to", "subject", "body", "attachments?"]
          },
          {
            name: "read_emails",
            description: "Read emails from inbox or specific folder",
            parameters: ["folder?", "limit?", "unread_only?"]
          },
          {
            name: "search_emails",
            description: "Search emails by query",
            parameters: ["query", "limit?"]
          },
          {
            name: "create_draft",
            description: "Create a draft email",
            parameters: ["to", "subject", "body"]
          }
        ],
        requiredCredentials: [
          {
            name: "gmail_api_key",
            description: "Gmail API Key",
            type: "string",
            required: true
          },
          {
            name: "oauth_token",
            description: "OAuth 2.0 Token",
            type: "string",
            required: true
          }
        ]
      }
    };

    return serverDetails[args.serverId as keyof typeof serverDetails] || null;
  },
});

export const getMCPServerTools = query({
  args: {
    serverId: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const serverDetails: any = await ctx.runQuery(api.mcp.getMCPServerDetails, {
      serverId: args.serverId,
    });

    return serverDetails?.tools || [];
  },
});
