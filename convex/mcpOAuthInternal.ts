import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Store MCP session information
export const storeMCPSession = internalMutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    serverUrl: v.string(),
    callbackUrl: v.string(),
    status: v.union(v.literal("pending_auth"), v.literal("connected"), v.literal("disconnected")),
    tokens: v.optional(v.any()),
    credentials: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("mcpSessions", {
      sessionId: args.sessionId,
      userId: args.userId,
      serverUrl: args.serverUrl,
      callbackUrl: args.callbackUrl,
      status: args.status,
      tokens: args.tokens,
      credentials: args.credentials,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update MCP session status
export const updateMCPSessionStatus = internalMutation({
  args: {
    sessionId: v.string(),
    status: v.union(v.literal("pending_auth"), v.literal("connected"), v.literal("disconnected")),
    tokens: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("mcpSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (session) {
      await ctx.db.patch(session._id, {
        status: args.status,
        ...(args.tokens && { tokens: args.tokens }),
        updatedAt: Date.now(),
      });
    }
  },
});

// Get MCP session
export const getMCPSession = internalQuery({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mcpSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();
  },
});

// Log MCP tool usage
export const logMCPToolUsage = internalMutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    toolName: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("mcpToolUsage", {
      sessionId: args.sessionId,
      userId: args.userId,
      toolName: args.toolName,
      success: args.success,
      error: args.error,
      timestamp: Date.now(),
    });
  },
});

// Clean up old MCP sessions
export const cleanupOldMCPSessions = internalMutation({
  args: {
    olderThanMs: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanMs;
    
    const oldSessions = await ctx.db
      .query("mcpSessions")
      .filter((q) => q.lt(q.field("updatedAt"), cutoffTime))
      .collect();

    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    return { deletedCount: oldSessions.length };
  },
});
