import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const save = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
    tasks: v.array(v.object({ title: v.string(), description: v.optional(v.string()), done: v.boolean() })),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("completed")),
    auto: v.optional(v.boolean()),
    maxSteps: v.optional(v.number()),
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
        maxSteps: args.maxSteps ?? existing.maxSteps ?? Math.max(5, Math.min(20, args.tasks.length || 10)),
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
      maxSteps: args.maxSteps ?? Math.max(5, Math.min(20, args.tasks.length || 10)),
      executedSteps: 0,
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
    // Post a short assistant confirmation and kick off execution stream
    await ctx.scheduler.runAfter(0, internal.streaming.generateStreamingResponse, {
      conversationId: plan.conversationId,
      messageId: await ctx.db.insert("messages", {
        conversationId: plan.conversationId,
        role: "assistant",
        content: "Approved. I’m starting now and will keep you updated.",
        userId: plan.userId,
        isStreaming: true,
        timestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    });
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
    const increment = args.done ? 1 : 0;
    const currentStep = args.done && plan.currentStep === args.index ? (plan.currentStep ?? 0) + 1 : plan.currentStep ?? 0;
    const executedSteps = (plan.executedSteps ?? 0) + increment;
    const status = executedSteps >= (plan.maxSteps ?? tasks.length) || currentStep >= tasks.length ? "completed" : plan.status;
    await ctx.db.patch(args.planId, { tasks, currentStep, executedSteps, status, updatedAt: Date.now() });
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


