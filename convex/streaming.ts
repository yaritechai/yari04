"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { getModelForTask, getModelParameters } from "./modelRouter";

// Test action to verify OpenRouter connection
export const testOpenRouter = internalAction({
  args: {},
  handler: async (ctx, args) => {
    try {
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      const completion = await openrouter.chat.completions.create({
        model: "moonshotai/kimi-k2",
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

export const generateStreamingResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    includeWebSearch: v.optional(v.boolean()),
    userTimezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("Starting streaming response generation:", args);

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

      // Get user's enabled integrations and MCP connections for context
      const userIntegrations = await ctx.runQuery(internal.integrations.getIntegrationsForAI, {
        userId: conversation.userId,
      });

      const mcpConnections = await ctx.runQuery(internal.smithery.getUserMCPConnectionsInternal, {
        conversationId: args.conversationId,
      });

      // Get available capabilities for context  
      const availableCapabilities = await ctx.runQuery(internal.agentBuilder.getAvailableCapabilitiesInternal, {});

      // Get current date and time using Eastern Time (most common US timezone)
      // TODO: Add proper user timezone detection and storage
      const userTimezone = args.userTimezone || "America/New_York";
      
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
        timeZone: userTimezone
      });

      const currentTimestamp = Date.now();
      const currentTimeZone = userTimezone;

      console.log("Checking message for URLs:", message.content);

      // Check if the message contains URLs that need to be read
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = message.content.match(urlRegex) || [];

      // Auto-enable web search for landing page requests and research queries
      let shouldPerformSearch = args.includeWebSearch || false;
      const isLandingPageRequest = /\b(landing page|website|webpage|create.*page|build.*page|design.*page)\b/i.test(message.content);
      
      // Auto-detect research queries
      const researchKeywords = /\b(research|search|find information|look up|investigate|tell me about|who is|what is|current|latest|recent|news about)\b/i;
      const isResearchRequest = researchKeywords.test(message.content);
      
      if (isLandingPageRequest) {
        console.log("Auto-enabling web search for landing page request:", message.content);
        shouldPerformSearch = true;
      } else if (isResearchRequest) {
        console.log("Auto-enabling web search for research request:", message.content);
        shouldPerformSearch = true;
      }

      // Get conversation messages for context
      const messages: any[] = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // Filter and prepare messages for OpenRouter
      const filteredMessages = messages.filter(msg => 
        msg.role !== "system" && 
        msg.content && 
        msg.content.trim() !== ""
      );

      console.log("Filtered messages for OpenRouter:", { 
        totalMessages: messages.length, 
        filteredMessages: filteredMessages.length,
        messageRoles: filteredMessages.map(m => m.role)
      });

      // Format messages for OpenAI
      const openaiMessages = filteredMessages.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Create comprehensive system prompt with context
      const systemPrompt = `🕐 **IMPORTANT: USER'S CURRENT TIME & DATE**
📅 **Right now it is**: ${currentDateTime}
🌍 **Timezone**: ${currentTimeZone}
⏰ **Unix timestamp**: ${currentTimestamp}
🎯 **This is the user's current local time** - ALWAYS use this for time-sensitive responses, scheduling, deadlines, and any time-related context.

## CORE INSTRUCTIONS
You are **Yari AI**, an advanced AI assistant created by **Yari Tech** (CEO: Neil Patel). You have access to powerful capabilities and integrations, including web search, landing page design, and content creation.

## RESPONSE STYLE  
- **BE DIRECT & CONVERSATIONAL**: Skip formal intros, get straight to helpful answers
- **BE CONCISE**: Keep responses focused and actionable, avoid unnecessary fluff
- **ASK FOLLOW-UP QUESTIONS**: When appropriate, ask 1-2 relevant questions to better help the user
- **BE HELPFUL**: Prioritize practical, actionable advice over theoretical explanations
- **USE CURRENT TIME AWARENESS**: Always reference the user's current time/date when relevant (scheduling, deadlines, "today", "tomorrow", etc.)

## YARI AI CORE CAPABILITIES

### 🔍 **Web Search & Research**
You can search the web for current information, latest news, research data, and real-time updates. Use this for:
- Current events and breaking news
- Latest product information and pricing  
- Research papers and academic content
- Market trends and business intelligence
- Technical documentation and tutorials

**IMPORTANT**: For creative tasks like landing page generation, proceed directly without web search unless explicitly asked to research something specific.

### 🎨 **Custom Landing Page Design** 
You can create completely custom, unique landing pages tailored to any business or purpose. When generating landing pages:
- **PROCEED DIRECTLY**: Don't research unless explicitly asked - use your creativity and the request details
- **BE CREATIVE**: Don't use templates - create unique designs from scratch
- **TAILOR TO THE REQUEST**: Adapt colors, layout, style to match the specific business/purpose
- **MODERN DESIGN**: Use contemporary web design trends, animations, and interactions
- **RESPONSIVE**: Ensure it works beautifully on all devices
- **PROFESSIONAL**: Create designs worthy of real businesses
- **UNIQUE**: Each landing page should be visually distinct and custom-designed

Example approaches for landing pages:
- **Tech Startup**: Sleek gradients, glassmorphism, modern typography
- **Restaurant**: Warm colors, food imagery, elegant fonts
- **Fitness Brand**: Bold colors, dynamic layouts, energy-focused design
- **Luxury Brand**: Minimal design, premium typography, sophisticated colors
- **Creative Agency**: Unique layouts, bold typography, artistic elements

### ✍️ **Content Creation**
You excel at creating engaging, professional content including:
- Marketing copy and sales materials
- Blog posts and articles
- Social media content
- Technical documentation
- Creative writing and storytelling

## TOOL USAGE GUIDELINES
- **Web Search**: ONLY use when you need current information that you don't already know (news, recent events, specific data, current prices)
- **Landing Pages**: Generate IMMEDIATELY when requested - no research needed unless user specifically asks to research something
- **Creative Tasks**: Proceed directly using your knowledge and creativity - don't search unless explicitly requested
- **Be Proactive**: Suggest using these capabilities when they would be helpful

**CRITICAL**: For landing page requests, generate the page immediately using the information provided. Only search if the user explicitly says "research X" or "find information about Y".

**LANDING PAGE RULE**: When asked to create a landing page for a person, business, or concept, proceed directly with creative design based on the name provided. Do NOT research unless explicitly requested.

## CONTEXT AWARENESS
Current conversation context:
- User timezone: ${currentTimeZone}
- Available integrations: ${mcpConnections ? mcpConnections.length : 0} MCP connections
- User capabilities: ${availableCapabilities.length > 0 ? availableCapabilities.map(cap => cap.name).join(', ') : 'Standard features'}

Remember: You're here to be genuinely helpful, direct, and efficient. Focus on solving problems and providing value!`;

      // Use model router for intelligent model selection
      const selectedModel = getModelForTask(message.content, {
        isLandingPage: isLandingPageRequest,
        isCodeGeneration: message.content.toLowerCase().includes('code') || message.content.toLowerCase().includes('html'),
        isResearchTask: shouldPerformSearch
      });
      
      const modelParams = getModelParameters(selectedModel);

      console.log("Prepared OpenRouter messages:", {
        messageCount: openaiMessages.length + 1, // +1 for system prompt
        model: selectedModel,
        temperature: modelParams.temperature,
        hasApiKey: !!process.env.OPENROUTER_API_KEY,
        isLandingPageRequest,
        shouldPerformSearch
      });

      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev",
          "X-Title": "Convex AI Chat",
        },
      });

      let autonomousSearchResults: any[] = [];
      let fullContent = "";
      let tokenCount = 0;

      console.log("Creating OpenRouter streaming completion...");

      // Add tools for autonomous web search and landing page generation
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "generate_landing_page",
            description: "Generate a completely custom HTML landing page with unique design, layout, and styling tailored to the specific request. Be creative with colors, animations, layouts, and interactions.",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The main title/headline for the landing page"
                },
                subtitle: {
                  type: "string", 
                  description: "Supporting description or tagline"
                },
                htmlContent: {
                  type: "string",
                  description: "Complete HTML document with embedded CSS - be creative with design, colors, layout, animations, and interactive elements. Make it unique and tailored to the request."
                },
                designDescription: {
                  type: "string",
                  description: "Brief description of the design choices and visual style used"
                }
              },
              required: ["title", "subtitle", "htmlContent"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "web_search",
            description: "Search the web for current information. ONLY use this when you need specific current data that you don't already know (recent news, current prices, etc.). Do NOT use for creative tasks like landing pages.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find current information"
                },
                reason: {
                  type: "string", 
                  description: "Explanation of why this search is needed"
                }
              },
              required: ["query", "reason"]
            }
          }
        }
      ];

      // First API call to potentially trigger tool usage
      let toolCallData: any = null;
      
      const messagesWithSystem = [
        { role: "system" as const, content: systemPrompt },
        ...openaiMessages
      ];

      console.log(`🤖 Selected model: ${selectedModel} for task type based on prompt:`, message.content);

      // Use streaming completion for real-time updates
      const completion = await openrouter.chat.completions.create({
        model: selectedModel,
        messages: messagesWithSystem,
        max_tokens: modelParams.max_tokens,
        temperature: modelParams.temperature,
        top_p: modelParams.top_p,
        tools: tools,
        tool_choice: "auto",
        stream: true
      });

      let streamedContent = "";
      let responseMessage: any = null;
      let toolCalls: any = null;

      // Process streaming chunks
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          streamedContent += delta.content;
          
          // Update message in real-time every few chunks to avoid too many DB calls
          if (streamedContent.length % 50 === 0 || streamedContent.length > 100) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: streamedContent,
              isComplete: false,
            });
          }
        }
        
        // Capture tool calls during streaming
        if (delta?.tool_calls) {
          toolCalls = delta.tool_calls;
        }
        
        // Mark as complete when streaming finishes
        if (chunk.choices[0]?.finish_reason) {
          responseMessage = { content: streamedContent };
        }
      }

      // Ensure we have the final content
      if (!responseMessage) {
        responseMessage = { content: streamedContent };
      }

      if (toolCalls && toolCalls.length > 0) {
        // Handle the first tool call
        const toolCall = toolCalls[0];
        toolCallData = {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments
        };
      }

      // Process tool call if present
      if (toolCallData && toolCallData.name === "web_search") {
        try {
          const params = JSON.parse(toolCallData.arguments);
          console.log("AI requested autonomous web search:", params);
          
          // Perform the web search
          autonomousSearchResults = await performWebSearch(params.query);
          
          if (autonomousSearchResults.length > 0) {
            // Store search results for sidebar display
            const searchResultsForSidebar = autonomousSearchResults.slice(0, 5).map(result => ({
              title: result.title,
              url: result.link,
              snippet: result.snippet,
              content: result.snippet, // We'll use snippet as content for sidebar
            }));

            // Save search results to trigger sidebar
            await ctx.runMutation(internal.messages.addSearchResults, {
              messageId: args.messageId,
              query: params.query,
              results: searchResultsForSidebar,
            });

            // Enhanced search context with full content from top results
            const enhancedResults = [];
            
            for (const result of autonomousSearchResults.slice(0, 3)) {
              try {
                const fullContent = await readUrlContent(result.link);
                if (fullContent && fullContent.trim()) {
                  enhancedResults.push({
                    title: result.title,
                    url: result.link,
                    snippet: result.snippet,
                    content: fullContent.substring(0, 2000) // Limit content length
                  });
                } else {
                  // Fallback to snippet if full content fails
                  enhancedResults.push({
                    title: result.title,
                    url: result.link,
                    snippet: result.snippet,
                    content: result.snippet
                  });
                }
              } catch (error) {
                console.log("Error reading URL content for autonomous search:", error);
                enhancedResults.push({
                  title: result.title,
                  url: result.link,
                  snippet: result.snippet,
                  content: result.snippet
                });
              }
            }
            
            // Create search context for the AI
            const searchContext = enhancedResults
              .map((result, index) => {
                return `**Source ${index + 1}: ${result.title}**\nURL: ${result.url}\n${result.content}`;
              })
              .join('\n\n---\n\n');

            // Now make a second API call with the search results to get the informed response
            const followUpMessages = [
              ...openaiMessages,
              {
                role: "assistant" as const,
                content: `I need to search for current information about "${params.query}" because: ${params.reason}. Let me find the latest information for you.`
              },
              {
                role: "system" as const,
                content: `Here are the current search results for "${params.query}":\n\n${searchContext}\n\nPlease provide a comprehensive response using this current information. Always cite your sources using the provided URLs.`
              },
              {
                role: "user" as const,
                content: "Please provide your response using the current information you just found."
              }
            ];

            // Make follow-up call to get informed response with streaming
            const informedResponse = await openrouter.chat.completions.create({
              model: selectedModel,
              messages: followUpMessages,
              max_tokens: modelParams.max_tokens,
              temperature: modelParams.temperature,
              top_p: modelParams.top_p,
              stream: true,
            });

            let searchResponseContent = "";
            const searchPrefix = `🔍 **Searched for current information**: ${params.query}\n*Reason: ${params.reason}*\n\n`;
            
            // Stream the search response content
            for await (const chunk of informedResponse) {
              const delta = chunk.choices[0]?.delta;
              
              if (delta?.content) {
                searchResponseContent += delta.content;
                
                // Update with search results prefix + streaming content
                const currentContent = searchPrefix + searchResponseContent;
                
                // Update every 30 characters or so to show streaming progress
                if (searchResponseContent.length % 30 === 0 || searchResponseContent.length > 50) {
                  await ctx.runMutation(internal.messages.updateStreamingMessage, {
                    messageId: args.messageId,
                    content: currentContent,
                    isComplete: false,
                  });
                }
              }
            }
            
            fullContent = searchPrefix + (searchResponseContent || "I found some information but couldn't process it properly.");
            
          } else {
            fullContent = `I attempted to search for current information about "${params.query}" but didn't find any results. Let me answer based on my existing knowledge.`;
          }
          
          tokenCount = fullContent.split(/\s+/).length;
        } catch (error) {
          console.error("Error processing autonomous web search:", error);
          fullContent = `I tried to search for current information but encountered an error. Let me answer based on my existing knowledge instead.`;
        }
      } else if (toolCallData && toolCallData.name === "generate_landing_page") {
        try {
          const params = JSON.parse(toolCallData.arguments);
          
          // Use the AI's custom HTML directly - no templates!
          const html = params.htmlContent;
          
          // Create content that will display the landing page and auto-open the right panel
          fullContent = `# 🚀 Landing Page Generated: ${params.title}

I've created a completely custom landing page for you! ${params.designDescription ? `\n\n**Design Concept**: ${params.designDescription}` : ''}

The landing page features:
- **Custom design** tailored specifically to your request
- **Unique layout and styling** created from scratch
- **Responsive design** that works beautifully on all devices  
- **Interactive elements** and smooth animations
- **Professional typography** and modern aesthetics

Click the "Generated HTML" button below to view your custom landing page!`;

          tokenCount = fullContent.split(/\s+/).length;
          
          // Store the HTML content for the right panel
          await ctx.runMutation(internal.messages.addLandingPageContent, {
            messageId: args.messageId,
            htmlContent: html,
            title: params.title,
            theme: 'custom'
          });
          
          // Update the message with the generated content
          await ctx.runMutation(internal.messages.updateStreamingMessage, {
            messageId: args.messageId,
            content: fullContent,
            isComplete: false,
          });
          
        } catch (error) {
          console.error("Error generating landing page:", error);
          fullContent = "I encountered an error while generating the landing page. Please try again with more specific requirements.";
        }
      } else {
        // No tool calls, use the streamed response
        fullContent = streamedContent || "I apologize, but I couldn't generate a response.";
        tokenCount = fullContent.split(/\s+/).length;
        
        // Make sure we have the final streamed content in the message
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: args.messageId,
          content: fullContent,
          isComplete: false,
        });
      }

      console.log("OpenRouter stream created successfully");

      // Log final status
      console.log("Stream completed, final content length:", fullContent.length);

      // Save the final AI response - always update the original streaming message
      if (autonomousSearchResults.length > 0) {
        // Update the original streaming message with search results
        await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
          messageId: args.messageId,
          content: fullContent,
          hasWebSearch: true,
        });
      } else {
        // Regular message without search results
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: args.messageId,
          content: fullContent,
          isComplete: true,
        });
      }

      // Update conversation metadata
      await ctx.runMutation(internal.conversations.updateLastMessage, {
        conversationId: args.conversationId,
      });

    } catch (error) {
      console.error("Streaming error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        conversationId: args.conversationId,
        messageId: args.messageId,
      });

      try {
        // Save error message
        await ctx.runMutation(internal.messages.updateStreamingMessage, {
          messageId: args.messageId,
          content: "I apologize, but I encountered an error while generating a response. Error: " + (error instanceof Error ? error.message : String(error)) + ". Please try again.",
          isComplete: true,
        });
      } catch (saveError) {
        console.error("Failed to save error message:", saveError);
      }
    }

    return null;
  },
});

// Function to detect if the user is requesting a landing page
function detectLandingPageRequest(message: string): boolean {
  const landingPageKeywords = [
    'landing page',
    'website for',
    'create a site',
    'build a website',
    'web page for',
    'homepage for',
    'site about',
    'website about',
    'create a page',
    'build a page',
    'design a website',
    'make a website',
    'create website',
    'build website'
  ];
  
  const lowerMessage = message.toLowerCase();
  return landingPageKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to extract search query from landing page request
function extractSearchQueryFromLandingPageRequest(message: string): string {
  // Remove common prefixes and extract the main topic
  const cleanedMessage = message
    .toLowerCase()
    .replace(/^(create|build|make|design)\s+(a\s+)?(landing\s+page|website|site|page)\s+(for|about)\s+/i, '')
    .replace(/^(landing\s+page|website|site|page)\s+(for|about)\s+/i, '')
    .trim();
  
  // If we couldn't extract a clean topic, use the original message
  return cleanedMessage || message;
}

// Function to read URL content using Jina Reader
async function readUrlContent(url: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-With-Generated-Alt': 'true'
      }
    });
    
    if (response.ok) {
      const content = await response.text();
      // Limit content to prevent token overflow
      return content.slice(0, 8000);
    }
  } catch (error) {
    console.error("Jina Reader failed for URL:", url, error);
  }
  return null;
}

async function performWebSearch(query: string): Promise<any[]> {
  // Try Tavily first if available
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (tavilyApiKey) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: query,
          search_depth: "basic",
          include_images: false,
          include_answer: false,
          max_results: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          return data.results.map((result: any) => ({
            title: result.title || "",
            link: result.url || "",
            snippet: result.content || "",
            displayLink: new URL(result.url || "").hostname || "",
          }));
        }
      }
    } catch (error) {
      console.error("Tavily search failed:", error);
    }
  }

  // Try SerpAPI as fallback if available
  const serpApiKey = process.env.SERPAPI_KEY;
  if (serpApiKey) {
    try {
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=5`);
      const data = await response.json();
      
      const results = (data.organic_results || []).map((result: any) => ({
        title: result.title || "",
        link: result.link || "",
        snippet: result.snippet || "",
        displayLink: result.displayed_link || result.link || "",
      }));
      
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.error("SerpAPI search failed:", error);
    }
  }

  return [];
}

// Note: Old template function removed - AI now generates custom HTML directly
