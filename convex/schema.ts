import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Conversations
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    starred: v.optional(v.boolean()),
    type: v.optional(v.string()),
    agentId: v.optional(v.id("agentConfigs")),
  }).index("by_user", ["userId"])
    .index("by_user_and_archived", ["userId", "isArchived"]),

  // Conversation folders
  conversationFolders: defineTable({
    conversationId: v.id("conversations"),
    folderId: v.id("folders"),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"])
    .index("by_folder", ["folderId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    timestamp: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    attachments: v.optional(v.array(v.any())),
    toolCalls: v.optional(v.array(v.any())),
    isStreaming: v.optional(v.boolean()),
    isEdited: v.optional(v.boolean()),
    originalContent: v.optional(v.string()),
    tokens: v.optional(v.number()),
    searchResults: v.optional(v.any()),
    hasWebSearch: v.optional(v.boolean()),
    model: v.optional(v.string()),
    reportData: v.optional(v.any()),
    landingPageContent: v.optional(v.object({
      htmlContent: v.string(),
      title: v.string(),
      theme: v.string(),
      shouldOpenRightPanel: v.boolean(),
    })),
    documentContent: v.optional(v.object({
      title: v.string(),
      content: v.string(), // JSON string of blocks
      shouldOpenRightPanel: v.boolean(),
    })),
    hasDocument: v.optional(v.boolean()),
  }).index("by_conversation", ["conversationId"]),

  folders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    createdAt: v.number(),
    updatedAt: v.number(),
    color: v.optional(v.string()),
    isExpanded: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  files: defineTable({
    userId: v.id("users"),
    name: v.string(),
    storageId: v.optional(v.id("_storage")), // Made optional for text documents
    folderId: v.optional(v.id("folders")),
    conversationId: v.optional(v.id("conversations")),
    size: v.number(),
    mimeType: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_folder", ["folderId"]),

  // Documents table for storing report content
  documents: defineTable({
    fileId: v.id("files"),
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    type: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_file", ["fileId"])
    .index("by_user", ["userId"]),

  preferences: defineTable({
    userId: v.id("users"),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    language: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
    autoSave: v.optional(v.boolean()),
    defaultModel: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    shortcuts: v.optional(v.any()),
    layout: v.optional(v.any()),
  }).index("by_user", ["userId"]),

  // User preferences (legacy)
  userPreferences: defineTable({
    userId: v.id("users"),
    theme: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    defaultTemperature: v.optional(v.number()),
    codeTheme: v.optional(v.string()),
    fontSize: v.optional(v.string()),
    enableWebSearch: v.optional(v.boolean()),
    enableStreaming: v.optional(v.boolean()),
    showTokenCount: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Integrations
  integrations: defineTable({
    userId: v.id("users"),
    type: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    metadata: v.optional(v.any()),
    config: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_enabled", ["userId", "isEnabled"]),

  mcpConnections: defineTable({
    userId: v.id("users"),
    serverId: v.string(),
    serverName: v.string(),
    connectionUrl: v.string(),
    apiKey: v.optional(v.string()),
    credentials: v.optional(v.any()),
    enabledTools: v.array(v.string()),
    isConnected: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Pending MCP integrations awaiting user credentials
  pendingMCPIntegrations: defineTable({
    userId: v.id("users"),
    serverId: v.string(),
    serverName: v.string(),
    connectionUrl: v.string(),
    requiredCredentials: v.array(v.object({
      name: v.string(),
      type: v.string(),
      description: v.string(),
      required: v.boolean(),
    })),
    suggestedTools: v.array(v.string()),
    status: v.union(v.literal("awaiting_credentials"), v.literal("completed"), v.literal("cancelled")),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  // New MCP OAuth tables
  mcpSessions: defineTable({
    sessionId: v.string(),
    userId: v.id("users"),
    serverUrl: v.string(),
    callbackUrl: v.string(),
    status: v.union(v.literal("pending_auth"), v.literal("connected"), v.literal("disconnected")),
    tokens: v.optional(v.any()),
    credentials: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session_id", ["sessionId"]).index("by_user", ["userId"]),

  mcpToolUsage: defineTable({
    sessionId: v.string(),
    userId: v.id("users"),
    toolName: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user", ["userId"]).index("by_session", ["sessionId"]),

  // Agent builder tables
  agentConfigs: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    personality: v.string(),
    systemPrompt: v.optional(v.string()),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    capabilities: v.array(v.string()),
    mcpConnections: v.array(v.string()),
    workflows: v.array(v.string()),
    scheduledTasks: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  workflows: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    steps: v.array(v.any()),
    triggers: v.array(v.any()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  scheduledTriggers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    cronExpression: v.string(),
    workflowId: v.optional(v.id("workflows")),
    action: v.any(),
    actionConfig: v.optional(v.any()),
    actionType: v.optional(v.string()),
    isActive: v.boolean(),
    lastRun: v.optional(v.number()),
    nextRun: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  capabilities: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    isEnabled: v.boolean(),
    requirements: v.optional(v.array(v.string())),
    permissions: v.optional(v.array(v.string())),
  }).index("by_category", ["category"]),

  // Agent table for agent builder
  agents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    personality: v.string(),
    systemPrompt: v.optional(v.string()),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    capabilities: v.array(v.string()),
    mcpConnections: v.array(v.string()),
    workflows: v.array(v.string()),
    scheduledTasks: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Workflow executions
  workflowExecutions: defineTable({
    userId: v.id("users"),
    workflowId: v.id("workflows"),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    steps: v.array(v.any()),
  }).index("by_user", ["userId"]).index("by_workflow", ["workflowId"]),

  // Planning and research (Agent Swarm)
  plans: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    title: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("completed")),
    tasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        done: v.boolean(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_conversation", ["conversationId"]).index("by_user", ["userId"]),

  researchArtifacts: defineTable({
    conversationId: v.id("conversations"),
    planId: v.optional(v.id("plans")),
    userId: v.id("users"),
    query: v.string(),
    results: v.array(
      v.object({
        title: v.string(),
        link: v.string(),
        snippet: v.optional(v.string()),
        displayLink: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]).index("by_plan", ["planId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
