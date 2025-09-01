"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

// **IMMEDIATE AGENTIC RESPONSE** - Fast, intelligent, no delays
export const generateAgenticResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    includeWebSearch: v.optional(v.boolean()),
    userTimezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("🚀 Starting immediate agentic response");

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

      // Get conversation messages for context
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // Filter and format messages
      const formattedMessages = messages
        .filter(msg => msg.role !== "system" && msg.content?.trim())
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Setup OpenRouter
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY!,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev",
          "X-Title": "Yari AI Agentic",
        },
      });

      // Get current time
      const currentDateTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: args.userTimezone || 'America/New_York',
      });

      // **ENHANCED SYSTEM PROMPT** - With intelligent prompt improvement authority
      const systemPrompt = `You are Yari AI, an advanced agentic AI assistant. Current time: ${currentDateTime}

## CORE IDENTITY
You are an intelligent, helpful, and capable AI assistant that can research, create, analyze, and provide comprehensive solutions to complex problems.

## RESPONSE BEHAVIOR
- START IMMEDIATELY: Never say "Got it" or "Let me start" - begin your response right away
- BE CONVERSATIONAL: Sound natural and helpful, not robotic
- USE KNOWLEDGE FIRST: Start with what you know, then enhance with tools
- STREAM WHILE WORKING: Continue talking while tools run in background

## AVAILABLE TOOLS

### 🔍 WEB SEARCH CAPABILITIES
When to use: Research questions, current events, fact-checking, latest information
How to trigger: Say "Let me search for current information..." or "I'll research..."
What it does: Searches web using Tavily API, returns relevant current results

### 🎨 IMAGE GENERATION & EDITING CAPABILITIES
When to use: Visual content requests, logos, illustrations, diagrams, creative imagery
How to trigger: Say "I'll generate that image for you..." or "I'll create..."
What it does: Uses Black Forest Labs FLUX for high-quality image generation and editing

## INTELLIGENT PROMPT IMPROVEMENT AUTHORITY
**YOU HAVE FULL PERMISSION TO IMPROVE USER IMAGE PROMPTS:**

When a user asks for an image, you should:
1. **Analyze their intent** - What type of image do they really need?
2. **Enhance the prompt** - Add professional specifications to make it better
3. **Explain your improvements** - Tell them how you enhanced their request
4. **Generate superior results** - Create images that exceed their expectations

**PROMPT IMPROVEMENT EXAMPLES:**

User: "Create a logo"
You: "I'll create a professional logo design for you. To make it exceptional, I'm enhancing your request with modern design principles, clean typography, and scalable vector styling..."

User: "Make an image of a cat"
You: "I'll generate a beautiful image of a cat for you. I'm enhancing the prompt to create a high-quality, detailed illustration with excellent composition and lighting..."

User: "Create an image of a dog wearing a birthday hat"
You: "I'll create a delightful image of a dog wearing a birthday hat for you. I'm enhancing this to create a charming, high-quality illustration with vibrant colors, excellent composition, and a joyful celebratory atmosphere..."

**ENHANCEMENT GUIDELINES:**
- Always improve prompts by adding professional specifications
- Explain your enhancements to show added value
- Focus on creating commercial-grade quality results
- Consider the purpose and adapt enhancements accordingly
- Be creative and add artistic improvements

Your system uses Black Forest Labs FLUX - take advantage of its advanced capabilities to create exceptional images.

## QUALITY STANDARDS
- Accuracy: Always provide correct, up-to-date information
- Completeness: Give comprehensive answers that fully address the question
- Clarity: Explain complex topics in understandable terms
- Actionability: Provide practical, useful recommendations
- Efficiency: Use tools only when they add significant value

You are an advanced agentic system that can research, create, analyze, and solve complex problems while maintaining natural, immediate, and helpful conversations.`;

      console.log(`🧠 Processing with intelligent agent capabilities`);

      // **IMMEDIATE STREAMING** - Start responding right away
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

      let fullContent = "";
      let shouldUseWebSearch = false;
      let shouldGenerateImage = false;
      
      // **STREAM IMMEDIATELY** - No delays, no "Got it" messages
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          
          // **INTELLIGENT TOOL DETECTION** - Look for tool usage indicators
          if (fullContent.includes("Let me search for") || fullContent.includes("I'll search for") || fullContent.includes("I'll research")) {
            shouldUseWebSearch = true;
          }
          
          if (fullContent.includes("I'll generate") || fullContent.includes("I'll create an image") || fullContent.includes("I'll design")) {
            shouldGenerateImage = true;
          }
          
          // Update every 50 characters for smooth streaming
          if (fullContent.length % 50 === 0) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: fullContent,
              isComplete: false,
            });
          }
        }
      }

      // **ENHANCED RESPONSE WITH TOOLS** - Add tool results if needed
      let enhancedContent = fullContent;

      // Perform web search if indicated
      if (shouldUseWebSearch || args.includeWebSearch) {
        try {
          console.log("🔍 Performing web search to enhance response");
          const searchResults = await performWebSearch(message.content);
          
          if (searchResults.length > 0) {
            const searchSummary = searchResults.map(r => `• ${r.title}: ${r.snippet}`).join('\n');
            enhancedContent += `\n\n**Current Information:**\n${searchSummary}`;
            
            // Save search results for UI badges
            await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
              messageId: args.messageId,
              content: enhancedContent,
              searchResults: searchResults.map(r => ({
                title: r.title,
                link: r.url,
                snippet: r.snippet,
                displayLink: new URL(r.url).hostname,
              })),
              hasWebSearch: true,
            });
            
            console.log("✅ Enhanced response with web search results");
            return null;
          }
        } catch (error) {
          console.error("Web search failed:", error);
        }
      }

      // Generate image if indicated
      if (shouldGenerateImage) {
        try {
          console.log("🎨 Generating image to enhance response");
          // Use your existing BFL image generation system
          const imageResult = await ctx.runAction(api.ai.generateImage, {
            prompt: enhanceImagePrompt(message.content),
            size: "1024x1024",
          });
          
          if (imageResult?.url) {
            enhancedContent += `\n\nGenerated image: ${imageResult.url}`;
            console.log(`✅ Image generated successfully via BFL`);
          }
        } catch (error) {
          console.error("Image generation failed:", error);
        }
      }

      // **FINALIZE RESPONSE**
      await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
        messageId: args.messageId,
        content: enhancedContent,
      });

      // Update conversation timestamp
      await ctx.runMutation(internal.conversations.updateLastMessage, {
        conversationId: args.conversationId,
      });

      console.log(`✅ Agentic response completed: ${enhancedContent.length} characters`);

    } catch (error) {
      console.error("Agentic streaming error:", error);
      
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: `❌ Error: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        isComplete: true,
      });
    }

    return null;
  },
});

// **WEB SEARCH FUNCTION** - Simple and fast
async function performWebSearch(query: string): Promise<any[]> {
  if (!process.env.TAVILY_API_KEY) {
    return [];
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 3,
      }),
    });

    const data = await response.json();
    return data.results?.map((result: any) => ({
      title: result.title || "",
      url: result.url || "",
      snippet: result.content || "",
    })) || [];
  } catch (error) {
    console.error("Web search failed:", error);
    return [];
  }
}

// **INTELLIGENT PROMPT ENHANCEMENT** - Makes images professional with BFL FLUX
function enhanceImagePrompt(userPrompt: string): string {
  const prompt = extractImagePrompt(userPrompt).toLowerCase();
  
  // Logo detection
  if (prompt.includes('logo') || prompt.includes('brand')) {
    const businessType = extractBusinessType(userPrompt);
    return `Professional logo design for ${businessType}, modern minimalist style, clean typography, scalable design, professional brand identity`;
  }
  
  // Diagram detection
  if (prompt.includes('diagram') || prompt.includes('process') || prompt.includes('flow')) {
    return `Clean technical diagram showing ${prompt}, professional illustration style, clear labels, educational visualization`;
  }
  
  // Illustration detection
  if (prompt.includes('illustration') || prompt.includes('drawing')) {
    return `High-quality digital illustration of ${prompt}, professional artistic style, detailed and polished`;
  }
  
  // Animal/character detection (like your dog example)
  if (prompt.includes('dog') || prompt.includes('cat') || prompt.includes('animal')) {
    return `Adorable, high-quality illustration of ${prompt}, charming and detailed, excellent composition, vibrant colors, professional digital art style`;
  }
  
  // Default enhancement
  return `High-quality, professional image of ${prompt}, detailed and polished, excellent composition`;
}

// **BUSINESS TYPE EXTRACTION**
function extractBusinessType(text: string): string {
  const businessPatterns = [
    /logo for (?:my |a |an |the )?(.+?)(?:\s|$)/i,
    /(.+?)\s+logo/i,
  ];
  
  for (const pattern of businessPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return "business";
}

// **EXTRACT IMAGE PROMPT**
function extractImagePrompt(text: string): string {
  const imagePatterns = [
    /generate an? image of (.+)/i,
    /create an? image of (.+)/i,
    /make an? image of (.+)/i,
    /design an? (.+)/i,
    /logo for (.+)/i,
  ];
  
  for (const pattern of imagePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return text.replace(/please|can you|could you|i want|i need/gi, '').trim().slice(0, 150);
}
