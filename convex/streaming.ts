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

      const mcpConnections = await ctx.runQuery(api.smithery.getUserMCPConnections, {
        conversationId: args.conversationId,
      });

      // Get available capabilities for context
      const availableCapabilities = await ctx.runQuery(api.agentBuilder.getAvailableCapabilities, {});

      // Get current date and time for comprehensive context
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

      const currentTimestamp = Date.now();

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
      const systemPrompt = `📅 **CURRENT DATE & TIME**: ${currentDateTime}
⏰ **TIMESTAMP**: ${currentTimestamp}

🤖 **AI ASSISTANT CONTEXT**
You are an advanced AI assistant with access to powerful capabilities and integrations. 

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

🛠️ **AVAILABLE TOOLS**:
• **web_search**: Search the internet for current information. Call this when you need up-to-date information.
• **generate_landing_page**: Create complete HTML landing pages with modern design.
${mcpConnections.length > 0 ? '• **MCP Tools**: Various tools available through connected integrations' : ''}

⚡ **INSTRUCTIONS**:
- Use web_search tool for any queries requiring current information
- Always provide comprehensive, helpful responses
- Cite sources when using web search results
- Be proactive in suggesting relevant integrations or capabilities
- Use the current date/time context when relevant
- Leverage available integrations when appropriate for the user's request

🎯 **RESPONSE GUIDELINES**:
- Be conversational and helpful
- Provide specific, actionable information
- Use the available tools and integrations to enhance your responses
- When searching, explain what you're looking for and why`;

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

      const completion = await openrouter.chat.completions.create({
        model: selectedModel,
        messages: messagesWithSystem,
        max_tokens: modelParams.max_tokens,
        temperature: modelParams.temperature,
        top_p: modelParams.top_p,
        tools: tools,
        tool_choice: "auto"
      });

      const responseMessage = completion.choices[0]?.message;
      const toolCalls = responseMessage?.tool_calls;

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

            // Make follow-up call to get informed response
            const informedResponse = await openrouter.chat.completions.create({
              model: selectedModel,
              messages: followUpMessages,
              max_tokens: modelParams.max_tokens,
              temperature: modelParams.temperature,
              top_p: modelParams.top_p,
            });

            const responseContent = informedResponse.choices[0]?.message?.content || "I found some information but couldn't process it properly.";
            
            fullContent = `🔍 **Searched for current information**: ${params.query}\n*Reason: ${params.reason}*\n\n${responseContent}`;
            
            // Update message content first
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: fullContent,
              isComplete: false,
            });
            
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

I've created a complete landing page for you! Here's the HTML:

\`\`\`html
${html}
\`\`\`

The landing page features:
- **Modern ${params.theme} design** with glassmorphic elements
- **Responsive layout** that works on all devices  
- **Smooth animations** and hover effects
- **Professional typography** and spacing
- **Call-to-action sections** optimized for conversions

You can copy this HTML and save it as an \`.html\` file to use immediately!`;

          tokenCount = fullContent.split(/\s+/).length;
          
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
        // No tool calls, use the regular response
        fullContent = responseMessage?.content || "I apologize, but I couldn't generate a response.";
        tokenCount = fullContent.split(/\s+/).length;
      }

      console.log("OpenRouter stream created successfully");

      // Log final status
      console.log("Stream completed, final content length:", fullContent.length);

      // Save the final AI response with search results if available
      if (autonomousSearchResults.length > 0) {
        // Use addAssistantMessageWithSearch to store search results for UI display
        await ctx.runMutation(internal.messages.addAssistantMessageWithSearch, {
          conversationId: args.conversationId,
          content: fullContent,
          searchResults: autonomousSearchResults.slice(0, 5), // Limit to 5 results for UI
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
  const { title, description, content_sections, call_to_action, color_scheme = "modern" } = params;
  
  const colorSchemes = {
    modern: {
      primary: "#f9c313",
      secondary: "#1f2937",
      background: "#ffffff",
      text: "#374151",
      accent: "#eab308"
    },
    dark: {
      primary: "#f9c313",
      secondary: "#ffffff", 
      background: "#111827",
      text: "#f3f4f6",
      accent: "#eab308"
    },
    light: {
      primary: "#f9c313",
      secondary: "#6b7280",
      background: "#f9fafb",
      text: "#374151", 
      accent: "#eab308"
    },
    colorful: {
      primary: "#f9c313",
      secondary: "#3b82f6",
      background: "#ffffff",
      text: "#1f2937",
      accent: "#ef4444"
    },
    minimal: {
      primary: "#000000",
      secondary: "#6b7280",
      background: "#ffffff", 
      text: "#374151",
      accent: "#f9c313"
    }
  };

  const colors = colorSchemes[color_scheme as keyof typeof colorSchemes] || colorSchemes.modern;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${colors.text};
            background-color: ${colors.background};
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: ${colors.background};
            padding: 2rem 0;
            text-align: center;
            border-bottom: 1px solid ${colors.secondary}20;
        }
        
        h1 {
            font-size: 3rem;
            font-weight: 800;
            color: ${colors.secondary};
            margin-bottom: 1rem;
        }
        
        .subtitle {
            font-size: 1.25rem;
            color: ${colors.text};
            max-width: 600px;
            margin: 0 auto;
        }
        
        .hero {
            padding: 4rem 0;
            text-align: center;
            background: linear-gradient(135deg, ${colors.primary}10, ${colors.accent}10);
        }
        
        .cta-button {
            display: inline-block;
            background: ${colors.primary};
            color: ${colors.secondary};
            padding: 1rem 2rem;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            margin-top: 2rem;
            transition: all 0.3s ease;
            border: 2px solid ${colors.primary};
        }
        
        .cta-button:hover {
            background: ${colors.accent};
            transform: translateY(-2px);
            box-shadow: 0 8px 25px ${colors.primary}30;
        }
        
        .content-section {
            padding: 3rem 0;
            border-bottom: 1px solid ${colors.secondary}10;
        }
        
        .content-section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            font-size: 2rem;
            font-weight: 700;
            color: ${colors.secondary};
            margin-bottom: 1.5rem;
            text-align: center;
        }
        
        .section-content {
            font-size: 1.1rem;
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        
        .card {
            background: ${colors.background};
            padding: 2rem;
            border-radius: 16px;
            border: 2px solid ${colors.secondary}10;
            transition: all 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 30px ${colors.secondary}15;
            border-color: ${colors.primary};
        }
        
        footer {
            background: ${colors.secondary};
            color: ${colors.background};
            text-align: center;
            padding: 2rem 0;
            margin-top: 4rem;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            
            .container {
                padding: 0 15px;
            }
            
            .hero {
                padding: 2rem 0;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>${title}</h1>
            <p class="subtitle">${description}</p>
        </div>
    </header>
    
    <section class="hero">
        <div class="container">
            <a href="#" class="cta-button">${call_to_action?.text || 'Get Started'}</a>
        </div>
    </section>
    
    <main>
        <div class="container">
            ${content_sections?.map((section: any) => `
                <section class="content-section">
                    <h2 class="section-title">${section.heading || section.type}</h2>
                    <div class="section-content">
                        ${section.content}
                    </div>
                </section>
            `).join('') || ''}
        </div>
    </main>
    
    <footer>
        <div class="container">
            <p>&copy; 2024 ${title}. Built with Yari AI.</p>
        </div>
    </footer>
</body>
</html>`;
}
