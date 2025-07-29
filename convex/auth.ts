import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const getUserByExternalId = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    // For now, we'll try to find user by email since we don't have external ID mapping
    // In a real implementation, you'd have a mapping table for external IDs
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.externalId))
      .first();
    
    return user;
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
