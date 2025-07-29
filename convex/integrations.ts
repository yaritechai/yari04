import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const integration = await ctx.db.get(args.integrationId);
    if (!integration || integration.userId !== userId) {
      throw new Error("Integration not found");
    }

    return integration;
  },
});

export const create = mutation({
  args: {
    type: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    metadata: v.optional(v.object({
      accountId: v.optional(v.string()),
      accountName: v.optional(v.string()),
      permissions: v.optional(v.array(v.string())),
      lastSyncAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("integrations", {
      userId,
      type: args.type,
      name: args.name,
      description: args.description,
      config: {},
      isEnabled: args.isEnabled,
      metadata: args.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    integrationId: v.id("integrations"),
    isEnabled: v.optional(v.boolean()),
    metadata: v.optional(v.object({
      accountId: v.optional(v.string()),
      accountName: v.optional(v.string()),
      permissions: v.optional(v.array(v.string())),
      lastSyncAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const integration = await ctx.db.get(args.integrationId);
    if (!integration || integration.userId !== userId) {
      throw new Error("Integration not found");
    }

    await ctx.db.patch(args.integrationId, {
      isEnabled: args.isEnabled,
      metadata: args.metadata,
    });
  },
});

export const remove = mutation({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const integration = await ctx.db.get(args.integrationId);
    if (!integration || integration.userId !== userId) {
      throw new Error("Integration not found");
    }

    await ctx.db.delete(args.integrationId);
  },
});

export const getEnabledIntegrations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("integrations")
      .withIndex("by_user_and_enabled", (q) => 
        q.eq("userId", userId).eq("isEnabled", true)
      )
      .collect();
  },
});

// Internal functions for AI context
export const getIntegrationsForAI = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_user_and_enabled", (q) => 
        q.eq("userId", args.userId).eq("isEnabled", true)
      )
      .collect();

    return integrations.map(integration => ({
      type: integration.type,
      name: integration.name,
      description: integration.description,
      accountName: integration.metadata?.accountName,
      permissions: integration.metadata?.permissions || [],
      lastSyncAt: integration.metadata?.lastSyncAt,
    }));
  },
});

export const createOrUpdate = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    metadata: v.optional(v.object({
      accountId: v.optional(v.string()),
      accountName: v.optional(v.string()),
      permissions: v.optional(v.array(v.string())),
      lastSyncAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        isEnabled: args.isEnabled,
        metadata: args.metadata,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("integrations", {
        userId: args.userId,
        type: args.type,
        name: args.name,
        description: args.description,
        config: {},
        isEnabled: args.isEnabled,
        metadata: args.metadata,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const disable = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (integration) {
      await ctx.db.patch(integration._id, {
        isEnabled: false,
      });
    }
  },
});

export const removeByType = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (integration) {
      await ctx.db.delete(integration._id);
    }
  },
});
