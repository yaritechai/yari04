import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const save = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
    tasks: v.array(v.object({ title: v.string(), description: v.optional(v.string()), done: v.boolean() })),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("completed")),
    auto: v.optional(v.boolean()),
  },
  returns: v.object({ planId: v.id("plans") }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const existing = await ctx.db
      .query("plans")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        tasks: args.tasks,
        status: args.status,
        auto: args.auto ?? existing.auto ?? false,
        updatedAt: now,
      });
      return { planId: existing._id };
    }
    const planId = await ctx.db.insert("plans", {
      conversationId: args.conversationId,
      userId: conversation.userId,
      title: args.title,
      status: args.status,
      tasks: args.tasks,
      currentStep: 0,
      auto: args.auto ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return { planId };
  },
});

export const approve = mutation({
  args: { planId: v.id("plans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");
    await ctx.db.patch(args.planId, { status: "approved", updatedAt: Date.now() });
    return null;
  },
});

export const toggleTask = mutation({
  args: { planId: v.id("plans"), index: v.number(), done: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");
    const tasks = [...plan.tasks];
    if (args.index < 0 || args.index >= tasks.length) throw new Error("Index out of range");
    tasks[args.index] = { ...tasks[args.index], done: args.done };
    const currentStep = args.done && plan.currentStep === args.index ? plan.currentStep + 1 : plan.currentStep;
    await ctx.db.patch(args.planId, { tasks, currentStep, updatedAt: Date.now() });
    return null;
  },
});

export const get = query({
  args: { planId: v.id("plans") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .collect();
  },
});

export const logEvent = mutation({
  args: {
    planId: v.id("plans"),
    conversationId: v.id("conversations"),
    message: v.string(),
    type: v.optional(v.union(v.literal("info"), v.literal("progress"), v.literal("warning"), v.literal("error"))),
    stepIndex: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");
    await ctx.db.insert("planEvents", {
      planId: args.planId,
      conversationId: args.conversationId,
      userId: plan.userId,
      type: args.type ?? "info",
      message: args.message,
      stepIndex: args.stepIndex,
      createdAt: Date.now(),
    });
    return null;
  }
});


