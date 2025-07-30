import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: { 
    archived: v.optional(v.boolean()),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    console.log("🔍 Auth Debug - Starting conversations.list query");
    
    const userId = await getAuthUserId(ctx);
    console.log("🔍 Auth Debug - userId from getAuthUserId:", userId);
    
    if (!userId) {
      console.error("🔍 Auth Debug - No userId found, user not authenticated");
      console.log("🔍 Auth Debug - ctx.auth:", ctx.auth);
      throw new Error("Not authenticated");
    }

    console.log("🔍 Auth Debug - User authenticated, fetching conversations for userId:", userId);

    let query = ctx.db
      .query("conversations")
      .withIndex("by_user_and_archived", (q) => 
        q.eq("userId", userId).eq("isArchived", args.archived || false)
      )
      .order("desc");

    const conversations = await query.take(100);
    console.log("🔍 Auth Debug - Found conversations:", conversations.length);

    // Filter by folder if specified
    if (args.folderId) {
      const folderConversations = await ctx.db
        .query("conversationFolders")
        .withIndex("by_folder", (q) => q.eq("folderId", args.folderId!))
        .collect();
      
      const folderConversationIds = new Set(folderConversations.map(fc => fc.conversationId));
      return conversations.filter(c => folderConversationIds.has(c._id));
    }

    return conversations;
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    return conversation;
  },
});

export const getHistory = query({
  args: { 
    conversationId: v.id("conversations"),
    includeMessages: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    let messages: any[] = [];
    if (args.includeMessages) {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => 
          q.eq("conversationId", args.conversationId)
        )
        .order("asc")
        .collect();
    }

    return {
      conversation,
      messages,
      messageCount: await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => 
          q.eq("conversationId", args.conversationId)
        )
        .collect()
        .then(msgs => msgs.length),
    };
  },
});

export const create = mutation({
  args: { 
    title: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    folderId: v.optional(v.id("folders")),
    type: v.optional(v.union(v.literal("chat"), v.literal("agent_builder"))),
    agentId: v.optional(v.id("agents")),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: args.title,
      lastMessageAt: Date.now(),
      model: args.model,
      systemPrompt: args.systemPrompt,
      temperature: args.temperature,
      type: args.type || "chat",
      agentId: args.agentId as Id<"agentConfigs"> | undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add to folder if specified
    if (args.folderId) {
      await ctx.db.insert("conversationFolders", {
        conversationId,
        folderId: args.folderId,
        userId,
        createdAt: Date.now(),
      });
    }

    return conversationId;
  },
});

export const updateTitle = mutation({
  args: { 
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      title: args.title,
    });
  },
});

export const generateSmartTitle = mutation({
  args: { 
    conversationId: v.id("conversations"),
    firstMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Schedule AI title generation
    await ctx.scheduler.runAfter(0, internal.conversations.generateTitleInternal, {
      conversationId: args.conversationId,
      firstMessage: args.firstMessage,
    });
  },
});

export const update = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      title: args.title,
      model: args.model,
      systemPrompt: args.systemPrompt,
      temperature: args.temperature,
    });
  },
});

export const updateSettings = mutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      model: args.model,
      systemPrompt: args.systemPrompt,
      temperature: args.temperature,
    });
  },
});

export const archive = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isArchived: true,
    });
  },
});

export const unarchive = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isArchived: false,
    });
  },
});

export const star = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      starred: !conversation.starred,
    });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete folder associations
    const folderAssociations = await ctx.db
      .query("conversationFolders")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const association of folderAssociations) {
      await ctx.db.delete(association._id);
    }

    // Delete the conversation
    await ctx.db.delete(args.conversationId);
  },
});

export const createAgentBuilder = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const agentBuilderPrompt = "You are an AI Agent Builder Assistant. Help users create AI agents by asking about their needs and guiding them through the process. Ask about what tasks they want to automate, what tools they use, and what workflows they need.";

    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: "Agent Builder",
      lastMessageAt: Date.now(),
      model: "gpt-4o-mini",
      systemPrompt: agentBuilderPrompt,
      temperature: 0.7,
      type: "agent_builder",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const duplicate = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Create new conversation
    const newConversationId = await ctx.db.insert("conversations", {
      userId,
      title: `${conversation.title} (Copy)`,
      lastMessageAt: Date.now(),
      model: conversation.model,
      systemPrompt: conversation.systemPrompt,
      temperature: conversation.temperature,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.insert("messages", {
        conversationId: newConversationId,
        role: message.role,
        content: message.content,
        userId,
        attachments: message.attachments,
        searchResults: message.searchResults,
        hasWebSearch: message.hasWebSearch,
        timestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return newConversationId;
  },
});

// Internal functions
export const getInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const generateTitleInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    firstMessage: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Use OpenRouter with GPT-4.1 Nano for fast title generation
      const openai = await import("openai").then(m => m.default);
      const client = new openai({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": process.env.CONVEX_SITE_URL || "http://localhost:3000",
          "X-Title": "Yari AI Assistant",
        },
      });

      // Get current date and time for system prompt
      const currentDateTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const completion = await client.chat.completions.create({
        model: "openai/gpt-4.1-nano", // Using the fast summarization model
        messages: [
          {
            role: "system",
            content: `📅 **CURRENT DATE & TIME**: ${currentDateTime}

Generate a 2-3 word title that captures the essence of this conversation. Be concise and descriptive. Examples: 'Recipe Help', 'Code Debug', 'Travel Planning', 'Math Problem', 'Writing Tips'.`
          },
          {
            role: "user",
            content: args.firstMessage
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      const title = completion.choices[0]?.message?.content?.trim();
      if (title && title.length > 0) {
        await ctx.db.patch(args.conversationId, {
          title: title,
        });
      }
    } catch (error) {
      console.error("Failed to generate smart title:", error);
      // Fallback to truncated first message
      const fallbackTitle = args.firstMessage.length > 30 
        ? args.firstMessage.substring(0, 30) + "..."
        : args.firstMessage;
      
      await ctx.db.patch(args.conversationId, {
        title: fallbackTitle,
      });
    }
  },
});

export const updateLastMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
