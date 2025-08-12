import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => 
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    requiresWebSearch: v.optional(v.boolean()),
    userTimezone: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      fileId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Add user message
    const userMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      userId,
      attachments: args.attachments,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create assistant message placeholder for streaming
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      userId,
      isStreaming: true,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    // Start streaming response
    await ctx.scheduler.runAfter(0, internal.streaming.generateStreamingResponse, {
      conversationId: args.conversationId,
      messageId: assistantMessageId,
      includeWebSearch: args.requiresWebSearch,
      userTimezone: args.userTimezone,
    });

    return { userMessageId, assistantMessageId };
  },
});

// Send a user message without creating an assistant placeholder or starting streaming.
export const sendWithoutStreaming = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    userTimezone: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      fileId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Add user message only
    const userMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      userId,
      attachments: args.attachments,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return { userMessageId };
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found");
    }

    // Store original content if not already edited
    const originalContent = message.isEdited ? message.originalContent : message.content;

    await ctx.db.patch(args.messageId, {
      content: args.newContent,
      isEdited: true,
      originalContent,
    });

    // If this is a user message, regenerate assistant response
    if (message.role === "user") {
      // Find the next assistant message and delete it
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => 
          q.eq("conversationId", message.conversationId)
        )
        .order("asc")
        .collect();

      const messageIndex = messages.findIndex(m => m._id === args.messageId);
      const nextMessage = messages[messageIndex + 1];
      
      if (nextMessage && nextMessage.role === "assistant") {
        await ctx.db.delete(nextMessage._id);
      }

      // Create new assistant message placeholder
      const assistantMessageId = await ctx.db.insert("messages", {
        conversationId: message.conversationId,
        role: "assistant",
        content: "",
        userId,
        isStreaming: true,
        timestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Start streaming response
      await ctx.scheduler.runAfter(0, internal.streaming.generateStreamingResponse, {
        conversationId: message.conversationId,
        messageId: assistantMessageId,
      });
    }
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found");
    }

    await ctx.db.delete(args.messageId);
  },
});

export const regenerate = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId || message.role !== "assistant") {
      throw new Error("Message not found or not an assistant message");
    }

    // Reset message for streaming
    await ctx.db.patch(args.messageId, {
      content: "",
      isStreaming: true,
    });

    // Start streaming response
    await ctx.scheduler.runAfter(0, internal.streaming.generateStreamingResponse, {
      conversationId: message.conversationId,
      messageId: args.messageId,
    });
  },
});

// Internal functions
export const get = internalQuery({
  args: { messageId: v.id("messages") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const listInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => 
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    isComplete: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isStreaming: !args.isComplete,
    });
  },
});

export const finalizeStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    tokens: v.optional(v.number()),
    model: v.optional(v.string()),
    searchResults: v.optional(v.array(v.object({
      title: v.string(),
      link: v.string(),
      snippet: v.string(),
      displayLink: v.string(),
    }))),
    hasWebSearch: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    await ctx.db.patch(args.messageId, {
      content: args.content,
      isStreaming: false,
      tokens: args.tokens,
      model: args.model,
      searchResults: args.searchResults,
      hasWebSearch: args.hasWebSearch,
    });

    // Update conversation last message time
    await ctx.db.patch(message.conversationId, {
      lastMessageAt: Date.now(),
    });
    
    return null;
  },
});

// Attach a file to an existing message (used by actions that generate files)
export const addAttachment = internalMutation({
  args: {
    messageId: v.id("messages"),
    attachment: v.object({
      fileId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const nextAttachments = Array.isArray(message.attachments)
      ? [...message.attachments, args.attachment]
      : [args.attachment];

    await ctx.db.patch(args.messageId, {
      attachments: nextAttachments,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const addAssistantMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      userId: conversation.userId,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });
  },
});

// Public-safe variant so the client can add an assistant message (e.g., for image edits)
export const addAssistantMessagePublic = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      userId: conversation.userId,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
  },
});

export const addAssistantMessageWithSearch = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    searchResults: v.array(v.object({
      title: v.string(),
      link: v.string(),
      snippet: v.string(),
      displayLink: v.string(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      userId: conversation.userId,
      searchResults: args.searchResults,
      hasWebSearch: true,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });
  },
});

export const addLandingPageContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    htmlContent: v.string(),
    title: v.string(),
    theme: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      landingPageContent: {
        htmlContent: args.htmlContent,
        title: args.title,
        theme: args.theme,
        shouldOpenRightPanel: true,
      },
    });
    return null;
  },
});

export const addDocumentContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    title: v.string(),
    content: v.string(), // JSON string of blocks
    shouldOpenRightPanel: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      documentContent: {
        title: args.title,
        content: args.content,
        shouldOpenRightPanel: args.shouldOpenRightPanel,
      },
      hasDocument: true,
    });
    return null;
  },
});

export const updateDocumentContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(), // JSON string of blocks
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message && message.documentContent) {
      await ctx.db.patch(args.messageId, {
        documentContent: {
          ...message.documentContent,
          content: args.content,
        },
      });
    }
    return null;
  },
});
