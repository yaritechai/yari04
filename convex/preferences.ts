import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return preferences || {
      defaultModel: "openai/gpt-4o-2024-11-20",
      defaultTemperature: 0.7,
      theme: "light",
      codeTheme: "github",
      fontSize: "medium",
      enableWebSearch: false,
      enableStreaming: true,
      showTokenCount: false,
    };
  },
});

export const update = mutation({
  args: {
    defaultModel: v.optional(v.string()),
    defaultTemperature: v.optional(v.number()),
    theme: v.optional(v.string()),
    codeTheme: v.optional(v.string()),
    fontSize: v.optional(v.string()),
    enableWebSearch: v.optional(v.boolean()),
    enableStreaming: v.optional(v.boolean()),
    showTokenCount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ...args,
        updatedAt: Date.now(),
      });
    }
  },
});
