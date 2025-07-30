import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Debug query to check for stuck streaming messages
export const checkStuckStreaming = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("messages"),
    conversationId: v.id("conversations"),
    role: v.string(),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const stuckMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("isStreaming"), true))
      .collect();
    
    return stuckMessages.map(msg => ({
      _id: msg._id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : ""),
      isStreaming: msg.isStreaming,
      createdAt: msg.createdAt,
    }));
  },
});

// Debug mutation to fix stuck streaming messages
export const fixStuckStreaming = mutation({
  args: {},
  returns: v.object({
    fixed: v.number(),
    messages: v.array(v.id("messages")),
  }),
  handler: async (ctx) => {
    const stuckMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("isStreaming"), true))
      .collect();
    
    // Fix messages that have been streaming for more than 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const messagesToFix = stuckMessages.filter(msg => 
      msg.createdAt && msg.createdAt < fiveMinutesAgo
    );
    
    for (const message of messagesToFix) {
      await ctx.db.patch(message._id, {
        isStreaming: false,
        content: message.content || "Message generation was interrupted.",
      });
    }
    
    return {
      fixed: messagesToFix.length,
      messages: messagesToFix.map(m => m._id),
    };
  },
});

// Debug query to check recent assistant messages
export const checkRecentActivity = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("messages"),
    conversationId: v.id("conversations"),
    createdAt: v.optional(v.number()),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
  })),
  handler: async (ctx) => {
    const recentMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("role"), "assistant"))
      .order("desc")
      .take(20);
    
    return recentMessages.map(msg => ({
      _id: msg._id,
      conversationId: msg.conversationId,
      createdAt: msg.createdAt,
      content: msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : ""),
      isStreaming: msg.isStreaming,
    }));
  },
});
