"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

type InngestEvent = {
  name: string;
  data?: Record<string, any>;
  ts?: string | number;
  user?: { id?: string };
};

async function postInngestEvents(events: InngestEvent[]): Promise<void> {
  const apiKey = process.env.INNGEST_EVENT_KEY;
  if (!apiKey) {
    console.warn("INNGEST_EVENT_KEY not set; skipping event emit", events.map(e => e.name));
    return;
  }
  const res = await fetch("https://api.inngest.com/v2/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-inngest-event-key": apiKey,
    },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to emit Inngest events: ${res.status} ${res.statusText} ${text}`);
  }
}

export const emitEvent = internalAction({
  args: {
    name: v.string(),
    data: v.optional(v.any()),
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event: InngestEvent = {
      name: args.name,
      data: args.data ?? {},
      user: args.userId ? { id: args.userId } : undefined,
    };
    await postInngestEvents([event]);
    return null;
  },
});

export const emitPlanApproved = internalAction({
  args: {
    planId: v.id("plans"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await postInngestEvents([
      {
        name: "plan/approved",
        data: { planId: args.planId },
        user: { id: args.userId },
      },
    ]);
    return null;
  },
});

export const emitAgentWorkflow = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    workflow: v.object({
      name: v.string(),
      steps: v.array(v.object({
        id: v.string(),
        agent: v.string(),
        input: v.any(),
      })),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await postInngestEvents([
      {
        name: "agent/workflow.queued",
        data: {
          conversationId: args.conversationId,
          workflow: args.workflow,
        },
        user: { id: args.userId },
      },
    ]);
    return null;
  },
});

// Additional helper emitters for plan step lifecycle and generalist agent runs
export const emitPlanStepCompleted = internalAction({
  args: {
    planId: v.id("plans"),
    stepIndex: v.number(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await postInngestEvents([
      {
        name: "plan/step.completed",
        data: { planId: args.planId, stepIndex: args.stepIndex },
        user: { id: args.userId },
      },
    ]);
    return null;
  },
});

export const emitPlanCompleted = internalAction({
  args: {
    planId: v.id("plans"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await postInngestEvents([
      {
        name: "plan/completed",
        data: { planId: args.planId },
        user: { id: args.userId },
      },
    ]);
    return null;
  },
});

export const emitGeneralistRunRequested = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    planId: v.optional(v.id("plans")),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await postInngestEvents([
      {
        name: "agent/generalist.requested",
        data: { conversationId: args.conversationId, planId: args.planId },
        user: { id: args.userId },
      },
    ]);
    return null;
  },
});

