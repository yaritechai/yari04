"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// **SIMPLIFIED STREAMING FUNCTION** - Fallback for basic responses
// The new agentic system (agenticStreaming.ts) handles complex tool calling
export const generateStreamingResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    includeWebSearch: v.optional(v.boolean()),
    userTimezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("📝 Using simplified streaming (fallback system)");

    try {
      // Get the message that triggered this response
      const message = await ctx.runQuery(internal.messages.get, {
      messageId: args.messageId,
      });

      if (!message) {
        throw new Error("Message not found");
      }

      // Get conversation for context
      const conversation = await ctx.runQuery(internal.conversations.getInternal, {
        conversationId: args.conversationId,
      });
      
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Hard stop if conversation is paused
      if (conversation.isPaused) {
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: args.messageId,
          content: "⏸️ Paused. Resume the conversation to continue.",
          isComplete: true,
        });
        return null;
      }

      // Get conversation messages for context
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // Filter and prepare messages for OpenRouter
      const filteredMessages = messages.filter(msg => 
        msg.role !== "system" && 
        msg.content && 
        msg.content.trim() !== ""
      );

      // Format messages for OpenAI
      const openaiMessages = filteredMessages.map((msg: any) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
      }));

      // Get current time
      const userTimezone = args.userTimezone || "America/New_York";
      const currentDateTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: userTimezone
      });

      // Simple system prompt
      const systemPrompt = `You are Yari AI, an advanced AI assistant. Current time: ${currentDateTime}

Be helpful, direct, and conversational. Provide clear, accurate responses.`;

      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev",
          "X-Title": "Convex AI Chat",
        },
      });

      // **SIMPLE STREAMING** - No complex tool orchestration
              const completion = await openrouter.chat.completions.create({
        model: "openai/gpt-4o", // Use a reliable model
        messages: [
          { role: "system", content: systemPrompt },
          ...openaiMessages
        ],
        max_tokens: 4000,
        temperature: 0.7,
                stream: true
              });

      let streamedContent = "";
              
              // Stream the response
              for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          streamedContent += delta.content;
          
          // Update every 100 characters (less frequent than before)
          if (streamedContent.length % 100 === 0) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: streamedContent,
              isComplete: false,
            });
          }
        }
              }

      // Finalize the response
              await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
                messageId: args.messageId,
                content: streamedContent,
      });

      // Update conversation metadata
      await ctx.runMutation(internal.conversations.updateLastMessage, {
        conversationId: args.conversationId,
      });

      console.log("✅ Simple streaming completed, content length:", streamedContent.length);

    } catch (error) {
      console.error("Streaming error:", error);
      
      try {
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
          content: "I apologize, but I encountered an error while generating a response. Please try again.",
        isComplete: true,
      });
      } catch (saveError) {
        console.error("Failed to save error message:", saveError);
    }
    }

    return null;
  },
});

// **BACKGROUND ENRICHMENT** - Simplified version
export const enrichContextInBackground = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userText: v.string(),
    includeWebSearch: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Simplified - just log for now
    console.log("📎 Background enrichment (simplified):", args.userText);
      return null;
  }
});

// **TEST FUNCTION** - Keep for debugging
export const testOpenRouter = internalAction({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    try {
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      const completion = await openrouter.chat.completions.create({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Say hello" }],
        max_tokens: 10,
      });

      return completion.choices[0]?.message?.content || "No response";
    } catch (error) {
      console.error("OpenRouter test failed:", error);
      throw error;
    }
  },
});
