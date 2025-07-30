"use node";

import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";
import { getModelForTask, getModelParameters, supportsThinking } from "./modelRouter";

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
        model: "openai/gpt-4o-mini",
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

      // Get current date and time for comprehensive context
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const currentTimestamp = Date.now();
      const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log("Checking message for URLs:", message.content);

      // Check if the message contains URLs that need to be read
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = message.content.match(urlRegex) || [];

      // Auto-enable web search for landing page requests
      let shouldPerformSearch = args.includeWebSearch || false;
      const isLandingPageRequest = /\b(landing page|website|webpage|create.*page|build.*page|design.*page)\b/i.test(message.content);
      
      if (isLandingPageRequest) {
        console.log("Auto-enabling web search for landing page request:", message.content);
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

🤖 **AI ASSISTANT CONTEXT**
You are **Yari AI**, an advanced AI assistant created by **Yari Tech** (CEO: Neil Patel). You have access to powerful capabilities and integrations, including web search, landing page design, and content creation. 

🔧 **AVAILABLE CORE CAPABILITIES**:
${availableCapabilities.map((cap: any) => `• **${cap.name}** (${cap.id}): ${cap.description}`).join('\n')}

🔌 **ACTIVE MCP INTEGRATIONS**:
${mcpConnections.length > 0 ? mcpConnections.map((conn: any) => 
  `• **${conn.serverName}**: ${conn.enabledTools.slice(0, 3).join(', ')}${conn.enabledTools.length > 3 ? ' +' + (conn.enabledTools.length - 3) + ' more' : ''}`
).join('\n') : '• No MCP integrations currently active'}

📊 **USER INTEGRATIONS**:
${userIntegrations.length > 0 ? userIntegrations.map(int => 
  `• **${int.name}** (${int.type}): ${int.description || 'Connected service'}`
).join('\n') : '• No additional integrations configured'}

🛠️ **YARI AI CORE CAPABILITIES**:
• **Web Search**: Search the internet for current, real-time information on any topic
• **Landing Page Design**: Create complete, modern HTML landing pages with beautiful designs
• **Content Creation**: Write articles, blogs, marketing copy, and any other content you need
• **generate_landing_page**: Technical tool for creating HTML landing pages
• **web_search**: Technical tool for internet searches
${mcpConnections.length > 0 ? '• **MCP Tools**: Various tools available through connected integrations' : ''}

⚡ **CORE INSTRUCTIONS**:
- **USE CURRENT TIME AWARENESS**: Always reference the user's current time/date when relevant (scheduling, deadlines, "today", "tomorrow", etc.)
- **BE DIRECT & CONVERSATIONAL**: Use natural, flowing speech like talking to a friend
- **KEEP IT CONCISE**: For basic questions, give short, clear answers. Don't over-explain unless asked
- **BE HELPFUL**: Always aim to be genuinely useful and solve the user's actual need
- **USE TOOLS PROACTIVELY**: Search web for current info, generate content, leverage integrations
- **CITE SOURCES**: When using search results, mention where info came from
- **ASK FOLLOW-UP QUESTIONS**: Based on context, ask 1-2 relevant questions to be more helpful

🎯 **RESPONSE STYLE**:
- **Casual & Direct**: "Here's what I found..." rather than "I would be happy to assist you with..."
- **Natural Flow**: Write like you're having a conversation, not writing a formal report
- **Appropriate Length**: Match response length to question complexity - simple questions deserve simple answers
- **Engage & Explore**: End with a follow-up question when it would be genuinely helpful
- **Be Human-like**: Use contractions, natural phrasing, show personality while staying professional

🚀 **SMART TOOL USAGE**:
- Search immediately for current events, recent info, or facts you're uncertain about
- Use integrations and MCP tools when they can add real value
- Explain briefly what you're searching for, but don't over-announce every action`;

      // Determine model selection based on request type and length
      const requestLength = message.content.length;
      const complexity = requestLength > 200 || isLandingPageRequest ? "complex" : "simple";
      
      // Simple model selection logic
      let selectedModel = "z-ai/glm-4.5-air"; // Default fast model
      let modelParams = {
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.95,
      };

      if (complexity === "complex" || isLandingPageRequest) {
        selectedModel = "z-ai/glm-4.5"; // More capable model for complex tasks
        modelParams.max_tokens = 4000;
      }

      console.log("Prepared OpenRouter messages:", {
        messageCount: openaiMessages.length + 1, // +1 for system prompt
        model: "gpt-4o-mini",
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
            name: "web_search",
            description: "Search the web for current information. Use this when you need up-to-date information that you don't have in your training data.",
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
        },
        {
          type: "function" as const,
          function: {
            name: "generate_landing_page",
            description: "Generate a complete HTML landing page with modern design, animations, and responsive layout.",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The main title/headline for the landing page"
                },
                subtitle: {
                  type: "string",
                  description: "Subtitle or description"
                },
                theme: {
                  type: "string",
                  enum: ["modern", "minimalist", "corporate", "creative", "glassmorphic"],
                  description: "Visual theme for the landing page"
                },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      title: { type: "string" },
                      content: { type: "string" }
                    }
                  },
                  description: "Sections to include in the landing page"
                }
              },
              required: ["title", "subtitle", "theme"]
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
          const html = generateCompleteHTML(params);
          
          // Create content that will display the landing page and auto-open the right panel
          fullContent = `# 🚀 Landing Page Generated: ${params.title}

I've created a beautiful landing page for you! The page features:
- **${params.theme || 'Modern'} design** with advanced CSS animations
- **Responsive layout** optimized for all devices  
- **Interactive elements** and smooth hover effects
- **Professional typography** and modern spacing
- **Hero section** with engaging visuals
- **Feature sections** with micro-interactions

Click the "Generated HTML" button below to view your landing page!`;

          tokenCount = fullContent.split(/\s+/).length;
          
          // Store the HTML content for the right panel
          await ctx.runMutation(internal.messages.addLandingPageContent, {
            messageId: args.messageId,
            htmlContent: html,
            title: params.title,
            theme: params.theme || 'modern'
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
          searchResults: autonomousSearchResults.slice(0, 5), // Limit to 5 results for UI
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

// Helper function to generate complete HTML for landing pages
function generateCompleteHTML(params: any) {
  const { 
    title = "Amazing Landing Page", 
    subtitle = "Welcome to our innovative solution", 
    theme = "modern",
    sections = []
  } = params;
  
  // Choose a random layout variation for variety
  const layouts = ['hero-first', 'feature-grid', 'split-hero', 'testimonial-focus', 'product-showcase'];
  const selectedLayout = layouts[Math.floor(Math.random() * layouts.length)];
  
  const colorSchemes = {
    modern: {
      primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      primarySolid: "#667eea",
      secondary: "#1a202c",
      background: "#ffffff",
      surface: "#f7fafc",
      text: "#2d3748",
      textLight: "#718096",
      accent: "#ed8936",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      pattern: "radial-gradient(circle at 20% 80%, #667eea15 0%, transparent 50%), radial-gradient(circle at 80% 20%, #764ba215 0%, transparent 50%)"
    },
    glassmorphic: {
      primary: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))",
      primarySolid: "#8b5cf6",
      secondary: "#1f2937",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      surface: "rgba(255, 255, 255, 0.1)",
      text: "#ffffff",
      textLight: "#e2e8f0",
      accent: "#f59e0b",
      gradient: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))",
      pattern: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%)"
    },
    dark: {
      primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      primarySolid: "#667eea", 
      secondary: "#f7fafc",
      background: "#0f1419",
      surface: "#1a2332",
      text: "#e2e8f0",
      textLight: "#a0aec0",
      accent: "#ffd700",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      pattern: "radial-gradient(circle at 30% 70%, #667eea15 0%, transparent 50%)"
    },
    vibrant: {
      primary: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
      primarySolid: "#ff6b6b",
      secondary: "#2c2c54",
      background: "#ffffff",
      surface: "#fff5f5",
      text: "#2d3748",
      textLight: "#718096",
      accent: "#ff9ff3",
      gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
      pattern: "radial-gradient(circle at 40% 60%, #ff6b6b15 0%, transparent 50%)"
    },
    minimal: {
      primary: "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)",
      primarySolid: "#2d3748",
      secondary: "#1a202c", 
      background: "#ffffff",
      surface: "#f7fafc",
      text: "#2d3748",
      textLight: "#718096",
      accent: "#3182ce",
      gradient: "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)",
      pattern: "radial-gradient(circle at 50% 50%, #2d374815 0%, transparent 50%)"
    }
  };

  const colors = colorSchemes[theme as keyof typeof colorSchemes] || colorSchemes.modern;
  const isGlass = theme === 'glassmorphic';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --primary: ${colors.primarySolid};
            --primary-gradient: ${colors.primary};
            --secondary: ${colors.secondary};
            --background: ${colors.background};
            --surface: ${colors.surface};
            --text: ${colors.text};
            --text-light: ${colors.textLight};
            --accent: ${colors.accent};
            --pattern: ${colors.pattern};
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.7;
            color: var(--text);
            background: var(--background);
            ${isGlass ? 'background: var(--background);' : ''}
            overflow-x: hidden;
            scroll-behavior: smooth;
        }
        
        .container {
            max-width: min(1400px, 95vw);
            margin: 0 auto;
            padding: 0 clamp(1rem, 5vw, 3rem);
        }
        
        /* Glassmorphism and Advanced Effects */
        .glass {
            background: var(--surface);
            ${isGlass ? 'backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);' : ''}
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
        }
        
        .pattern-bg {
            position: relative;
        }
        
        .pattern-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--pattern);
            z-index: -1;
            border-radius: inherit;
        }
        
        /* Navigation */
        nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            padding: 1rem 0;
            ${isGlass ? 'backdrop-filter: blur(20px); background: rgba(255,255,255,0.1);' : 'background: var(--surface);'}
            transition: all 0.3s ease;
        }
        
        .nav-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: 800;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        /* Hero Section Variations */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            background: var(--background);
            overflow: hidden;
        }
        
        .hero.pattern-bg::before {
            animation: float 20s infinite linear;
        }
        
        @keyframes float {
            0% { transform: translateX(-50px) translateY(-50px); }
            50% { transform: translateX(50px) translateY(50px); }
            100% { transform: translateX(-50px) translateY(-50px); }
        }
        
        .hero-content {
            max-width: 900px;
            z-index: 2;
            position: relative;
        }
        
        .hero h1 {
            font-size: clamp(2.5rem, 8vw, 5rem);
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 2rem;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.02em;
        }
        
        .hero .subtitle {
            font-size: clamp(1.125rem, 3vw, 1.5rem);
            color: var(--text-light);
            margin-bottom: 3rem;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
            font-weight: 400;
        }
        
        /* Advanced Button Styles */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2.5rem;
            font-size: 1.125rem;
            font-weight: 600;
            text-decoration: none;
            border-radius: 50px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            border: 2px solid transparent;
            cursor: pointer;
        }
        
        .btn-primary {
            background: var(--primary-gradient);
            color: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .btn-primary::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
            transform: translateX(-100%);
            transition: transform 0.6s;
        }
        
        .btn-primary:hover::before {
            transform: translateX(100%);
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        
        .btn-secondary {
            background: transparent;
            color: var(--text);
            border: 2px solid var(--primary);
        }
        
        .btn-secondary:hover {
            background: var(--primary);
            color: white;
            transform: translateY(-2px);
        }
        
        /* Feature Grid */
        .features {
            padding: 8rem 0;
            background: var(--surface);
        }
        
        .section-header {
            text-align: center;
            margin-bottom: 5rem;
        }
        
        .section-title {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 800;
            color: var(--secondary);
            margin-bottom: 1.5rem;
            letter-spacing: -0.01em;
        }
        
        .section-subtitle {
            font-size: 1.25rem;
            color: var(--text-light);
            max-width: 600px;
            margin: 0 auto;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 3rem;
            margin-top: 4rem;
        }
        
        .feature-card {
            background: var(--background);
            padding: 3rem 2.5rem;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            ${isGlass ? 'backdrop-filter: blur(20px);' : ''}
        }
        
        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--primary-gradient);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }
        
        .feature-card:hover::before {
            transform: scaleX(1);
        }
        
        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 30px 60px rgba(0,0,0,0.15);
        }
        
        .feature-icon {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            background: var(--primary-gradient);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin-bottom: 2rem;
            position: relative;
        }
        
        .feature-icon::after {
            content: '✨';
            color: white;
        }
        
        .feature-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--secondary);
            margin-bottom: 1rem;
        }
        
        .feature-description {
            color: var(--text-light);
            line-height: 1.6;
        }
        
        /* Stats Section */
        .stats {
            padding: 6rem 0;
            background: var(--background);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 3rem;
            text-align: center;
        }
        
        .stat-number {
            font-size: 3rem;
            font-weight: 900;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: var(--text-light);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        /* Footer */
        footer {
            background: var(--secondary);
            color: var(--background);
            padding: 4rem 0 2rem;
            margin-top: 6rem;
        }
        
        .footer-content {
            text-align: center;
        }
        
        .footer-logo {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 1rem;
        }
        
        .footer-text {
            opacity: 0.8;
            margin-bottom: 2rem;
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animate-in {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .hero {
                min-height: 80vh;
                padding: 2rem 0;
            }
            
            .features {
                padding: 4rem 0;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
                gap: 2rem;
            }
            
            .feature-card {
                padding: 2.5rem 2rem;
            }
            
            nav {
                padding: 0.75rem 0;
            }
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 0 1rem;
            }
            
            .btn {
                padding: 0.875rem 2rem;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <nav>
        <div class="container">
            <div class="nav-content">
                <div class="logo">${title}</div>
            </div>
        </div>
    </nav>
    
    <section class="hero pattern-bg">
        <div class="container">
            <div class="hero-content animate-in">
                <h1>${title}</h1>
                <p class="subtitle">${subtitle}</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <a href="#features" class="btn btn-primary">Get Started →</a>
                    <a href="#about" class="btn btn-secondary">Learn More</a>
                </div>
            </div>
        </div>
    </section>
    
    <section id="features" class="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Amazing Features</h2>
                <p class="section-subtitle">Discover what makes our solution unique and powerful</p>
            </div>
            
            <div class="feature-grid">
                ${sections.length > 0 ? sections.slice(0, 6).map((section: any, index: number) => `
                    <div class="feature-card glass">
                        <div class="feature-icon"></div>
                        <h3 class="feature-title">${section.title || `Feature ${index + 1}`}</h3>
                        <p class="feature-description">${section.content || 'Amazing functionality that will revolutionize your workflow.'}</p>
                    </div>
                `).join('') : `
                    <div class="feature-card glass">
                        <div class="feature-icon"></div>
                        <h3 class="feature-title">Lightning Fast</h3>
                        <p class="feature-description">Experience blazing fast performance with our optimized architecture.</p>
                    </div>
                    <div class="feature-card glass">
                        <div class="feature-icon"></div>
                        <h3 class="feature-title">Secure & Private</h3>
                        <p class="feature-description">Your data is protected with enterprise-grade security measures.</p>
                    </div>
                    <div class="feature-card glass">
                        <div class="feature-icon"></div>
                        <h3 class="feature-title">Easy Integration</h3>
                        <p class="feature-description">Seamlessly integrate with your existing tools and workflows.</p>
                    </div>
                `}
            </div>
        </div>
    </section>
    
    <section class="stats pattern-bg">
        <div class="container">
            <div class="stats-grid">
                <div>
                    <div class="stat-number">99.9%</div>
                    <div class="stat-label">Uptime</div>
                </div>
                <div>
                    <div class="stat-number">10K+</div>
                    <div class="stat-label">Happy Users</div>
                </div>
                <div>
                    <div class="stat-number">500+</div>
                    <div class="stat-label">Integrations</div>
                </div>
                <div>
                    <div class="stat-number">24/7</div>
                    <div class="stat-label">Support</div>
                </div>
            </div>
        </div>
    </section>
    
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-logo">${title}</div>
                <p class="footer-text">Built with ❤️ using Yari AI</p>
                <p style="opacity: 0.6; font-size: 0.875rem;">&copy; 2024 ${title}. All rights reserved.</p>
            </div>
        </div>
    </footer>
    
    <script>
        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        // Add scroll effect to navigation
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('nav');
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                nav.style.background = '${isGlass ? 'rgba(255,255,255,0.15)' : 'var(--surface)'}';
                nav.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            } else {
                nav.style.background = '${isGlass ? 'rgba(255,255,255,0.1)' : 'var(--surface)'}';
                nav.style.borderBottom = 'none';
            }
            
            lastScroll = currentScroll;
        });
        
        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe feature cards
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = \`opacity 0.6s ease \${index * 0.1}s, transform 0.6s ease \${index * 0.1}s\`;
            observer.observe(card);
        });
    </script>
</body>
</html>`;
}
