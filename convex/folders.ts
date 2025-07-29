import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("folders", {
      userId,
      name: args.name,
      color: args.color || "#3B82F6",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    await ctx.db.patch(args.folderId, {
      name: args.name,
      color: args.color,
    });
  },
});

export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    // Remove all conversation associations
    const associations = await ctx.db
      .query("conversationFolders")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const association of associations) {
      await ctx.db.delete(association._id);
    }

    await ctx.db.delete(args.folderId);
  },
});

export const addConversation = mutation({
  args: {
    folderId: v.id("folders"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const folder = await ctx.db.get(args.folderId);
    const conversation = await ctx.db.get(args.conversationId);
    
    if (!folder || folder.userId !== userId || !conversation || conversation.userId !== userId) {
      throw new Error("Folder or conversation not found");
    }

    // Check if association already exists
    const existing = await ctx.db
      .query("conversationFolders")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    if (existing) {
      // Update existing association
      await ctx.db.patch(existing._id, {
        folderId: args.folderId,
      });
    } else {
      // Create new association
      await ctx.db.insert("conversationFolders", {
        conversationId: args.conversationId,
        folderId: args.folderId,
        userId,
        createdAt: Date.now(),
      });
    }
  },
});

export const removeConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const association = await ctx.db
      .query("conversationFolders")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    if (association && association.userId === userId) {
      await ctx.db.delete(association._id);
    }
  },
});
