"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

// **FAST TOOL CALLING SYSTEM** - Uses original JSON tool pattern but optimized
export const generateFastToolResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    includeWebSearch: v.optional(v.boolean()),
    userTimezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("🚀 Starting fast tool response");

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
          "X-Title": "Yari AI Fast Tools",
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

      // **TOOL CALLING SYSTEM PROMPT** - Forces JSON output for image requests
      const systemPrompt = `You are Yari AI, an advanced AI assistant. Current time: ${currentDateTime}

## CRITICAL INSTRUCTIONS FOR IMAGE REQUESTS
**WHEN A USER ASKS FOR AN IMAGE, YOU MUST OUTPUT A JSON TOOL CALL:**

For ANY image request (create, generate, make, design an image), respond with:
1. A brief acknowledgment 
2. The JSON tool call in a fenced code block
3. Nothing else

## TOOL USAGE
You can request tools by outputting a single JSON object in a fenced code block:

### IMAGE GENERATION TOOL
**REQUIRED for any image request**
\`\`\`json
{
  "tool": "generate_image",
  "arguments": {
    "prompt": "exact description from user request",
    "size": "1024x1024"
  }
}
\`\`\`

### WEB SEARCH TOOL  
**Use for research questions**
\`\`\`json
{
  "tool": "web_search", 
  "arguments": {
    "query": "search query"
  }
}
\`\`\`

## EXAMPLES

User: "create an image of a dog wearing a birthday hat"
You: I'll create that image for you!

\`\`\`json
{
  "tool": "generate_image",
  "arguments": {
    "prompt": "a dog wearing a birthday hat",
    "size": "1024x1024"
  }
}
\`\`\`

User: "make a logo for my coffee shop"  
You: I'll design a logo for your coffee shop!

\`\`\`json
{
  "tool": "generate_image",
  "arguments": {
    "prompt": "logo for coffee shop",
    "size": "1024x1024"
  }
}
\`\`\`

## TOOL CALLING RULES
- ALWAYS output JSON for image requests - this is required!
- Use the exact prompt the user provided
- Be brief before the JSON call
- Output exactly one JSON object in a fenced block

Remember: For image requests, you MUST output the JSON tool call!`;

      console.log(`🧠 Using fast tool calling system`);

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

      let streamedContent = "";
      
      // **STREAM IMMEDIATELY** - No delays
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          streamedContent += delta.content;
          
          // Update every 50 characters for smooth streaming
          if (streamedContent.length % 50 === 0) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: streamedContent,
              isComplete: false,
            });
          }
        }
      }

      // **TOOL DETECTION & EXECUTION** - Same pattern as original but faster
      let finalContent = streamedContent;
      
      try {
        // Look for JSON tool calls in the response (original pattern)
        const toolJsonMatch = streamedContent.match(/```json\s*([\s\S]*?)\s*```/i);
        if (toolJsonMatch && toolJsonMatch[1]) {
          const toolObj = JSON.parse(toolJsonMatch[1]);
          
          if (toolObj && toolObj.tool) {
            console.log(`🔧 Executing tool: ${toolObj.tool}`);
            
            if (toolObj.tool === "generate_image") {
              const prompt = toolObj.arguments?.prompt || message.content;
              console.log(`🎨 Generating image: "${prompt}"`);
              
              // Update message to show tool execution
              await ctx.runMutation(internal.messages.updateStreamingMessage, {
                messageId: args.messageId,
                content: streamedContent.replace(toolJsonMatch[0], `🎨 Generating image: "${prompt}"...`),
                isComplete: false,
              });
              
              const result = await ctx.runAction(api.ai.generateImage, {
                prompt: prompt, // Use EXACT prompt from JSON
                size: toolObj.arguments?.size || "1024x1024",
              });
              
              if (result?.url) {
                finalContent = streamedContent.replace(toolJsonMatch[0], `Generated image: ${result.url}`);
                console.log(`✅ Image generated successfully: ${prompt}`);
              } else {
                finalContent = streamedContent.replace(toolJsonMatch[0], "❌ Failed to generate image");
              }
            }
            
            if (toolObj.tool === "web_search") {
              const query = toolObj.arguments?.query || message.content;
              console.log(`🔍 Web search: "${query}"`);
              
              const searchResults = await performWebSearch(query);
              if (searchResults.length > 0) {
                const searchSummary = searchResults.map(r => `• ${r.title}: ${r.snippet}`).join('\n');
                finalContent = streamedContent.replace(toolJsonMatch[0], `**Search Results:**\n${searchSummary}`);
                console.log(`✅ Web search completed: ${searchResults.length} results`);
              } else {
                finalContent = streamedContent.replace(toolJsonMatch[0], "No search results found");
              }
            }
          }
        }
      } catch (toolError) {
        console.error("Tool execution failed:", toolError);
        // Keep original content if tool fails
      }

      // **FINALIZE RESPONSE**
      await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
        messageId: args.messageId,
        content: finalContent,
      });

      // Update conversation timestamp
      await ctx.runMutation(internal.conversations.updateLastMessage, {
        conversationId: args.conversationId,
      });

      console.log("✅ Fast tool response completed:", finalContent.length, "characters");

    } catch (error) {
      console.error("Fast tool streaming error:", error);
      
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: `❌ Error: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        isComplete: true,
      });
    }

    return null;
  },
});

// **WEB SEARCH FUNCTION**
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
