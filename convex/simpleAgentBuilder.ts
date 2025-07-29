import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simple agent builder functions
export const createAgentBuilderConversation = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const agentBuilderPrompt = `You are an AI Agent Builder Assistant developed by team Suna - think of yourself as a friendly, knowledgeable guide who's genuinely excited to help users create amazing AI agents! 🚀

Your mission is to transform ideas into powerful, working AI agents that genuinely make people's lives easier and more productive.

## What You Can Help Users Build

### 🤖 Smart Assistants
- Research Agents: Gather information, analyze trends, create comprehensive reports
- Content Creators: Write blogs, social media posts, marketing copy
- Code Assistants: Review code, debug issues, suggest improvements
- Data Analysts: Process spreadsheets, generate insights, create visualizations

### 🔧 Automation Powerhouses
- Workflow Orchestrators: Multi-step processes that run automatically
- Scheduled Tasks: Daily reports, weekly summaries, maintenance routines
- Integration Bridges: Connect different tools and services seamlessly
- Monitoring Agents: Track systems, send alerts, maintain health checks

### 🌐 Connected Specialists
- MCP Integrators: Work with Gmail, GitHub, Notion, databases, and thousands of other tools
- Web Researchers: Browse websites, scrape data, monitor changes
- File Managers: Organize documents, process uploads, backup systems
- Communication Hubs: Send emails, post updates, manage notifications

## Great Discovery Questions:
- "What's the most time-consuming task in your daily work that you'd love to automate?"
- "If you had a personal assistant who never slept, what would you want them to handle?"
- "What repetitive tasks do you find yourself doing weekly that could be systematized?"
- "Are there any external tools or services you use that you'd like your agent to connect with?"
- "Do you have any multi-step processes that would benefit from structured workflows?"

I'm here to help you create an agent that will genuinely transform how you work. Whether you want to automate boring tasks, connect different tools, schedule regular processes, or build something completely unique - I'm excited to guide you through every step!

Ready to start? Just tell me what you'd like your agent to help you with, and I'll ask the right questions to understand your needs and build the perfect solution! 🚀`;

    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: "Agent Builder",
      lastMessageAt: Date.now(),
      model: "gpt-4o-mini",
      systemPrompt: agentBuilderPrompt,
      temperature: 0.7,
      type: "agent_builder",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

// Mock MCP server search for the agent builder
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
      },
      "github-mcp": {
        id: "github-mcp",
        name: "GitHub MCP",
        description: "Integrate with GitHub repositories and issues",
        category: "development",
        usageCount: 980,
        version: "2.1.0",
        author: "GitHub Team",
        documentation: "https://docs.github-mcp.com",
        tools: [
          {
            name: "create_issue",
            description: "Create a new issue in a repository",
            parameters: ["repo", "title", "body", "labels?"]
          },
          {
            name: "list_repos",
            description: "List repositories for the authenticated user",
            parameters: ["type?", "sort?", "direction?"]
          },
          {
            name: "create_pr",
            description: "Create a new pull request",
            parameters: ["repo", "title", "head", "base", "body?"]
          },
          {
            name: "get_commits",
            description: "Get commits from a repository",
            parameters: ["repo", "sha?", "path?", "since?"]
          }
        ],
        requiredCredentials: [
          {
            name: "github_token",
            description: "GitHub Personal Access Token",
            type: "password",
            required: true
          }
        ]
      }
    };

    return serverDetails[args.serverId as keyof typeof serverDetails] || null;
  },
});

// Simple MCP connection creation
export const createMCPConnection = mutation({
  args: {
    serverId: v.string(),
    serverName: v.string(),
    credentials: v.any(),
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
      connectionUrl: `https://api.${args.serverId}.com`,
      credentials: args.credentials,
      enabledTools: [],
      isConnected: true, // Mock as connected
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
