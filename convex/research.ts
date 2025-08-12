"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Simple multi-provider research action. Uses Tavily if available, otherwise DuckDuckGo.
export const gather = action({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
    planId: v.optional(v.id("plans")),
  },
  returns: v.array(
    v.object({
      title: v.string(),
      link: v.string(),
      snippet: v.optional(v.string()),
      displayLink: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const results: Array<{ title: string; link: string; snippet?: string; displayLink?: string }> = [];

    // Try Tavily
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (tavilyApiKey) {
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyApiKey, query: args.query, search_depth: "basic", max_results: 5 }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const r of data.results || []) {
            results.push({ title: r.title || "", link: r.url || "", snippet: r.content || "", displayLink: r.url ? new URL(r.url).hostname : undefined });
          }
        }
      } catch {}
    }

    // Fallback: DuckDuckGo
    if (results.length === 0) {
      try {
        const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`);
        if (res.ok) {
          const data = await res.json();
          for (const t of (data.RelatedTopics || []).slice(0, 5)) {
            results.push({ title: t.Text ? t.Text.split(' - ')[0] : "DuckDuckGo Result", link: t.FirstURL || "", snippet: t.Text || "", displayLink: t.FirstURL ? new URL(t.FirstURL).hostname : undefined });
          }
        }
      } catch {}
    }

    // Persist artifact if we have any
    try {
      if (results.length > 0) {
        await ctx.storage;
      }
    } catch {}

    return results;
  },
});


