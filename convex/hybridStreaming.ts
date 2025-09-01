"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

// **HYBRID SYSTEM** - Immediate responses + working image generation
export const generateHybridResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    includeWebSearch: v.optional(v.boolean()),
    userTimezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("🚀 Starting hybrid response (immediate + tools)");

    try {
      // Get the triggering message
      const message = await ctx.runQuery(internal.messages.get, {
        messageId: args.messageId,
      });

      if (!message) {
        throw new Error("Message not found");
      }

      // Get conversation context
      const conversation = await ctx.runQuery(internal.conversations.getInternal, {
        conversationId: args.conversationId,
      });
      
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Check if paused
      if (conversation.isPaused) {
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: args.messageId,
          content: "⏸️ Paused. Resume the conversation to continue.",
          isComplete: true,
        });
        return null;
      }

      // **QUICK IMAGE DETECTION** - Handle image requests immediately
      const isImageRequest = /\b(create|generate|make|design|draw)\s+(?:an?\s+)?image\s+of\b/i.test(message.content) ||
                           /\b(logo|illustration|diagram|picture|photo)\b/i.test(message.content);

      if (isImageRequest) {
        console.log("🎨 Detected image request - processing immediately");
        
        // **IMMEDIATE IMAGE GENERATION** - No complex orchestration
        try {
          // Extract the core prompt (what they actually want)
          const imagePrompt = extractCleanImagePrompt(message.content);
          
          console.log(`🎨 Generating image: "${imagePrompt}"`);
          
          // Use your existing BFL system directly
          const imageResult = await ctx.runAction(api.ai.generateImage, {
            prompt: imagePrompt, // Use the EXACT prompt they asked for
            size: "1024x1024",
          });
          
          if (imageResult?.url) {
            const response = `I've created an image of ${imagePrompt} for you!\n\nGenerated image: ${imageResult.url}`;
            
            await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
              messageId: args.messageId,
              content: response,
            });
            
            console.log(`✅ Image generated successfully: ${imagePrompt}`);
            return null;
          }
        } catch (error) {
          console.error("Image generation failed:", error);
        }
      }

      // **REGULAR CHAT RESPONSE** - For non-image requests
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      const formattedMessages = messages
        .filter(msg => msg.role !== "system" && msg.content?.trim())
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY!,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev",
          "X-Title": "Yari AI Hybrid",
        },
      });

      const currentDateTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: args.userTimezone || 'America/New_York',
      });

      const systemPrompt = `You are Yari AI, an advanced AI assistant. Current time: ${currentDateTime}

Be helpful, direct, and conversational. Provide clear, accurate responses.

For image requests, I handle those automatically - just focus on being helpful and conversational.`;

      const completion = await openrouter.chat.completions.create({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages,
        ],
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      });

      let streamedContent = "";

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          streamedContent += delta.content;
          
          if (streamedContent.length % 50 === 0) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: streamedContent,
              isComplete: false,
            });
          }
        }
      }

      await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
        messageId: args.messageId,
        content: streamedContent,
      });

      await ctx.runMutation(internal.conversations.updateLastMessage, {
        conversationId: args.conversationId,
      });

      console.log("✅ Hybrid response completed:", streamedContent.length, "characters");

    } catch (error) {
      console.error("Hybrid streaming error:", error);
      
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: `❌ Error: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        isComplete: true,
      });
    }

    return null;
  },
});

// **CLEAN IMAGE PROMPT EXTRACTION** - Gets exactly what the user asked for
function extractCleanImagePrompt(text: string): string {
  // Look for explicit image requests and extract the subject
  const imagePatterns = [
    /create an? image of (.+)/i,
    /generate an? image of (.+)/i,
    /make an? image of (.+)/i,
    /draw (.+)/i,
    /show me (.+)/i,
    /design (.+)/i,
  ];
  
  for (const pattern of imagePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // If no pattern matches, return the cleaned text
  return text.replace(/please|can you|could you|i want|i need/gi, '').trim();
}
