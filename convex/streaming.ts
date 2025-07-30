"use node";

import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
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
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Starting streaming response generation:", {
      conversationId: args.conversationId,
      messageId: args.messageId,
      includeWebSearch: args.includeWebSearch,
    });
    
    try {
      // Get conversation and messages
      const conversation = await ctx.runQuery(internal.conversations.getInternal, {
        conversationId: args.conversationId,
      });
      
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // Get user's integrations for AI context
      const integrations = await ctx.runQuery(internal.integrations.getIntegrationsForAI, {
        userId: conversation.userId,
      });

      let searchContext = "";
      let searchResults: any[] = [];
      let urlContent = "";
      let integrationContext = "";

      // Build integration context if user has integrations
      if (integrations.length > 0) {
        integrationContext = `You have access to the following integrations:\n${integrations
          .map((integration: any) => `- ${integration.name} (${integration.type}): ${integration.description || 'No description'}`)
          .join('\n')}\n\nYou can reference these integrations when helping the user with tasks related to these services.`;
      }

      // Check if the user's message contains URLs and read them
      const urlRegex = /(https?:\/\/[^\s\)]+)/g;
      // Get the last user message to check for URLs
      const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
      const messageToCheck = lastUserMessage?.content || args.searchQuery || "";
      console.log("Checking message for URLs:", messageToCheck);
      const urls = messageToCheck.match(urlRegex) || [];
      
      if (urls.length > 0) {
        console.log("Found URLs:", urls);
        const urlContents = [];
        for (const url of urls.slice(0, 3)) { // Limit to 3 URLs
          console.log("Reading URL:", url);
          const content = await readUrlContent(url);
          console.log("URL content length:", content?.length || 0);
          if (content) {
            urlContents.push(`Content from ${url}:\n${content}`);
          }
        }
        if (urlContents.length > 0) {
          urlContent = urlContents.join('\n\n---\n\n');
          console.log("Total URL content prepared");
        }
      }

      // Detect if this is a landing page request and auto-enable search
      const isLandingPageRequest = detectLandingPageRequest(messageToCheck);
      let shouldPerformSearch = args.includeWebSearch;
      let searchQueryToUse = args.searchQuery;

      if (isLandingPageRequest && !shouldPerformSearch) {
        shouldPerformSearch = true;
        searchQueryToUse = extractSearchQueryFromLandingPageRequest(messageToCheck);
        console.log("Auto-enabling web search for landing page request:", searchQueryToUse);
      }

      // NOTE: This legacy search system is supplemented by autonomous tool-based search
      // The AI can also call web_search function directly via tool calling, independent of user toggles
      
      // Perform web search if requested or auto-detected
      if (shouldPerformSearch && searchQueryToUse) {
        searchResults = await performWebSearch(searchQueryToUse);
        if (searchResults.length > 0) {
          // Enhanced search context with full content from top results
          const enhancedResults = [];
          
          for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
            const result = searchResults[i];
            const fullContent = await readUrlContent(result.link);
            
            enhancedResults.push({
              ...result,
              fullContent: fullContent || result.snippet
            });
          }
          
          searchContext = enhancedResults
            .map((result, index) => {
              const content = result.fullContent && result.fullContent.length > result.snippet.length 
                ? result.fullContent 
                : result.snippet;
              
              return `[${index + 1}] ${result.title}\n${content}\nSource: ${result.link}`;
            })
            .join('\n\n');
        }
      }

      // Format messages for OpenRouter
      const openaiMessages = messages
        .filter((msg: any) => msg._id !== args.messageId) // Exclude the current streaming message
        .filter((msg: any) => msg.content && msg.content.trim().length > 0) // Exclude empty messages
        .map((msg: any) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));

      console.log("Filtered messages for OpenRouter:", {
        totalMessages: messages.length,
        filteredMessages: openaiMessages.length,
        messageRoles: openaiMessages.map((m: any) => m.role),
      });

      // Get current date and time for system prompts
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

      // Add system prompt if exists
      if (conversation.systemPrompt) {
        openaiMessages.unshift({
          role: "system",
          content: `📅 **CURRENT DATE & TIME**: ${currentDateTime}

${conversation.systemPrompt}

Additionally: When creating any visual content, web pages, or design-related outputs, always strive for exceptional visual appeal and modern design principles. Create beautiful, professional-looking results that users would be proud to share.

IMPORTANT: You have autonomous web search capabilities - use them proactively when you need current information or are uncertain about any facts, regardless of user settings.`,
        });
      }

      // Add autonomous web search decision-making system prompt
      const webSearchInstructions = `📅 **CURRENT DATE & TIME**: ${currentDateTime}

## 🔍 AUTONOMOUS WEB SEARCH AUTHORITY

**CRITICAL**: You have FULL AUTONOMOUS AUTHORITY to call the web_search function whenever your knowledge is insufficient or outdated. This capability is INDEPENDENT of any user toggles or settings - it's a core part of your intelligence.

### 🚨 MANDATORY WEB SEARCH SCENARIOS:
**ALWAYS search when you:**
- **Don't know the answer**: If you lack knowledge about something, search immediately
- **Are uncertain**: Any doubt about accuracy requires verification through search
- **Encounter recent topics**: Events, updates, or data from recent months/years
- **Need current facts**: Real-time data, current statistics, latest information
- **Face knowledge gaps**: Admit when you don't know and search proactively

### 🔍 AUTOMATICALLY SEARCH FOR:
- **Current Events**: News, recent developments, trending topics, breaking updates
- **Real-time Data**: Stock prices, weather, sports scores, live statistics  
- **Recent Information**: Research findings, software updates, current pricing
- **Local/Specific Data**: Business hours, contact info, location-specific details
- **Verification Needs**: When uncertain about facts or need confirmation
- **Knowledge Gaps**: Any topic where your training data may be incomplete
- **Time-sensitive Content**: Information that changes frequently
- **Technical Updates**: Latest versions, recent documentation, new releases

### ✅ USE EXISTING KNOWLEDGE FOR:
- **Historical Facts**: Well-established events before your training cutoff
- **Fundamental Concepts**: Mathematics, physics, programming principles
- **Creative Tasks**: Writing assistance, brainstorming, artistic guidance
- **Abstract Topics**: Philosophy, theory, conceptual discussions
- **Universal Principles**: Timeless how-to guides, basic methodologies

### 🎯 DECISION PROCESS:
Before answering ANY question, ask yourself:
1. **"Do I have complete, current knowledge of this topic?"**
2. **"Could this information have changed recently?"**
3. **"Am I uncertain about any aspect of this?"**
4. **"Would searching provide more accurate/current information?"**

**If ANY answer is YES or uncertain → IMMEDIATELY call web_search**

### 🚀 SEARCH IMPLEMENTATION:
- **No permission needed**: You have full authority to search autonomously
- **Be proactive**: Better to search unnecessarily than provide outdated info
- **Search first**: When in doubt, search before answering
- **Multiple searches**: Feel free to search multiple times for comprehensive information
- **Always explain**: Include your reasoning for why you searched

**Remember: Your goal is accuracy and completeness. User preferences don't override your responsibility to provide the best possible information through autonomous search when needed.**
`;

      openaiMessages.unshift({
        role: "system",
        content: webSearchInstructions,
      });

      // Add HTML generation system prompt for Canvas mode or landing page requests
      const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
      const isCanvasMode = lastUserMsg?.content?.includes('[Canvas:') || false;
      const shouldUseHTMLMode = isCanvasMode || isLandingPageRequest;
      
      if (shouldUseHTMLMode) {
        const htmlSystemPrompt = `📅 **CURRENT DATE & TIME**: ${currentDateTime}

You are a world-class UI/UX designer and front-end developer with expertise from companies like Apple, Google, and the best design agencies. When creating HTML content (especially landing pages, web apps, or any web interfaces):

🎨 DESIGN EXCELLENCE REQUIREMENTS:
- Create **stunning, award-winning designs** that feel like they cost $10,000+ to develop
- Use cutting-edge design trends: glass morphism, dynamic gradients, perfect typography hierarchy, delightful micro-interactions
- Implement **sophisticated color palettes** using advanced color theory (60-30-10 rule, complementary harmonies)
- Use **premium typography** with perfect font pairing (Google Fonts: Inter, Poppins, Fraunces, etc.)
- Add **subtle depth** with layered shadows, perfect 8px grid spacing, and golden ratio proportions
- Create designs that would make users think "Wow, this is beautiful!" and screenshot to share

🛠️ TECHNICAL REQUIREMENTS:
- Generate ONLY pure HTML with inline CSS styles (NO external frameworks or CDNs)
- Create fully self-contained HTML documents that work in any browser
- Use semantic HTML5 elements and modern CSS features (flexbox, grid, CSS variables, animations)
- Include proper meta tags, DOCTYPE, and viewport settings
- Ensure mobile-first responsive design with smooth breakpoints

✨ VISUAL DESIGN PRINCIPLES:
- **Typography**: Use beautiful font stacks, perfect line-height, ideal spacing, clear hierarchy
- **Colors**: Create sophisticated color palettes with 60-30-10 rule, ensure WCAG contrast compliance  
- **Layout**: Perfect spacing using 8px grid system, golden ratio proportions, visual balance
- **Interactive Elements**: Smooth hover effects, subtle animations, micro-interactions that delight
- **Modern Aesthetics**: Clean minimalism, purposeful use of whitespace, contemporary design patterns
- **Visual Hierarchy**: Clear information architecture, scannable content, logical flow

🚀 LANDING PAGE EXCELLENCE:
- **Hero sections** that immediately grab attention with magnetic headlines and compelling value propositions
- **Trust signals**: gorgeous testimonials, client logos, social proof, impressive statistics with beautiful data visualization
- **User journey**: Seamless flow from problem → solution → benefits → irresistible call-to-action
- **Multiple touchpoints**: Strategic conversion opportunities that feel natural, not pushy
- **Visual storytelling**: Guide users through an emotional journey with purposeful design elements
- **Premium imagery**: High-quality visuals from Unsplash (add ?auto=format&fit=crop&w=800&q=60 for optimization)

🎯 USER EXPERIENCE FOCUS:
- Intuitive navigation and user flow
- Fast perceived performance with progressive loading states
- Accessibility-first design (proper ARIA labels, keyboard navigation, screen reader friendly)
- Mobile-optimized touch targets and interactions
- Clear calls-to-action that stand out without being overwhelming

The final result should be a beautiful, pixel-perfect design that users would assume cost thousands of dollars to create. Make it feel premium, modern, and professionally crafted.`;
        
        openaiMessages.unshift({
          role: "system",
          content: htmlSystemPrompt,
        });
      }

      // Add URL content if available
      if (urlContent) {
        openaiMessages.unshift({
          role: "system",
          content: `📅 **CURRENT DATE & TIME**: ${currentDateTime}

The user has shared URLs in their message. Here is the full content from those URLs retrieved using Jina Reader:

${urlContent}

Please analyze and discuss this content in your response. Provide insights, summaries, or answer questions about what you found on these pages.`,
        });
      }

      // Add search context if available
      if (searchContext) {
        const searchContextPrompt = isLandingPageRequest 
          ? `📅 **CURRENT DATE & TIME**: ${currentDateTime}

You have access to current web search results for "${searchQueryToUse}" to help create an accurate and informed landing page:

${searchContext}

Use this information to create compelling, accurate content for the landing page. Include real facts, statistics, and current information from these sources. Always ensure the content is relevant and up-to-date.`
          : `📅 **CURRENT DATE & TIME**: ${currentDateTime}

You have access to current web search results for "${searchQueryToUse}":

${searchContext}

The search results include full webpage content retrieved using Jina Reader for comprehensive analysis. Use this information to provide accurate, up-to-date responses. Always cite sources when using information from the search results.`;
        
        openaiMessages.unshift({
          role: "system",
          content: searchContextPrompt,
        });
      }

      // Add integration context if available
      if (integrationContext) {
        openaiMessages.unshift({
          role: "system",
          content: `📅 **CURRENT DATE & TIME**: ${currentDateTime}

${integrationContext}`,
        });
      }

      // Ensure we have at least one message
      if (openaiMessages.length === 0) {
        console.log("No messages found, adding default message");
        openaiMessages.push({
          role: "user",
          content: "Hello, how can you help me today?",
        });
      }

      // Check for OpenRouter API key
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openrouterApiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is not set. Please configure your OpenRouter API key.");
      }

      console.log("Prepared OpenRouter messages:", {
        messageCount: openaiMessages.length,
        model: conversation.model || "openai/gpt-4o",
        temperature: conversation.temperature || 0.7,
        hasApiKey: !!openrouterApiKey,
        isLandingPageRequest,
        shouldPerformSearch,
      });

      // Initialize OpenRouter client
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterApiKey,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev", // Optional: for analytics
          "X-Title": "Convex AI Chat", // Optional: for analytics
        },
      });

      console.log("Creating OpenRouter streaming completion...");

      // Intelligent model selection based on task type
      const userPrompt = lastUserMessage?.content || args.searchQuery || "";
      const selectedModel = getModelForTask(userPrompt, {
        isLandingPage: isLandingPageRequest,
        isReport: false,
        isTitleGeneration: false,
        isConversationSummary: false,
        isCodeGeneration: /code|programming|function|implement|debug/.test(userPrompt.toLowerCase()),
        isResearchTask: /research|analyze|study|investigate/.test(userPrompt.toLowerCase()),
      });
      
      const modelParams = getModelParameters(selectedModel);
      
      console.log("🤖 Selected model:", selectedModel, "for task type based on prompt:", userPrompt.substring(0, 100));

      // Create streaming completion
      const stream = await openrouter.chat.completions.create({
        model: selectedModel,
        messages: openaiMessages,
        max_tokens: modelParams.max_tokens,
        temperature: modelParams.temperature,
        top_p: modelParams.top_p,
        stream: true,
        // Add tool calling support - always include web search, conditionally include landing page
        tools: [
          // Web search tool - always available for autonomous decision making
          {
            type: "function" as const,
            function: {
              name: "web_search",
              description: "AUTONOMOUS web search tool - Use whenever you need current information, don't know something, or are uncertain. This tool is ALWAYS available regardless of user settings or toggles. Call proactively when your knowledge is insufficient.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query to find current information"
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation of why web search is needed (e.g., 'need current data', 'verify recent information')"
                  }
                },
                required: ["query", "reason"]
              }
            }
          },
          // Landing page tool - only when creating landing pages
          ...(isLandingPageRequest ? [{
            type: "function" as const,
            function: {
              name: "generate_landing_page",
              description: "Generate a complete HTML landing page with inline CSS",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "The title of the landing page"
                  },
                  description: {
                    type: "string", 
                    description: "Meta description for SEO"
                  },
                  content_sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["hero", "features", "testimonials", "pricing", "cta", "about"] },
                        content: { type: "string" }
                      }
                    }
                  },
                  call_to_action: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      url: { type: "string" }
                    }
                  },
                  color_scheme: {
                    type: "string",
                    enum: ["modern", "dark", "light", "colorful", "minimal"],
                    description: "Color scheme for the landing page"
                  }
                },
                required: ["title", "description", "content_sections"]
              }
            }
          }] : [])
        ],
        tool_choice: "auto",
      });

      console.log("OpenRouter stream created successfully");

      let fullContent = "";
      let tokenCount = 0;
      let toolCallData = null;
      let autonomousSearchResults: any[] = [];

      // Process stream
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Handle regular content
        if (delta?.content) {
          fullContent += delta.content;
          // Count tokens more accurately (rough estimate)
          tokenCount += delta.content.split(/\s+/).length;
          
          // Update message content in real-time (throttle updates for smooth streaming)
          if (fullContent.length % 40 === 0 || delta.content.includes('\n')) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: fullContent,
              isComplete: false,
            });
          }
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (!toolCallData) {
              toolCallData = {
                id: toolCall.id,
                name: toolCall.function?.name || "",
                arguments: toolCall.function?.arguments || ""
              };
            } else {
              // Accumulate arguments
              toolCallData.arguments += toolCall.function?.arguments || "";
            }
          }
        }
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
                if (fullContent) {
                  enhancedResults.push({
                    title: result.title,
                    url: result.link,
                    snippet: result.snippet,
                    content: fullContent.substring(0, 2000) // Limit content length
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

The landing page includes:
- **Title**: ${params.title}
- **Description**: ${params.description}
- **Sections**: ${params.content_sections?.length || 0} content sections
- **Color Scheme**: ${params.color_scheme || 'modern'}
${params.call_to_action ? `- **Call to Action**: ${params.call_to_action.text}` : ''}

The page will automatically open in the browser preview on the right panel for you to see how it looks!`;

          tokenCount = fullContent.split(/\s+/).length;
        } catch (error) {
          console.error("Error processing tool call:", error);
          fullContent = "I tried to generate a landing page but encountered an error processing the request. Please try again.";
        }
      }

      console.log("Stream completed, final content length:", fullContent.length);

      // Final update before finalization
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: fullContent,
        isComplete: false,
      });

      // Combine regular search results with autonomous search results
      const allSearchResults = [...searchResults, ...autonomousSearchResults];
      
      // Finalize the message
      await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
        messageId: args.messageId,
        content: fullContent,
        tokens: tokenCount,
        model: conversation.model || "openai/gpt-4o-mini",
        searchResults: allSearchResults.length > 0 ? allSearchResults : undefined,
        hasWebSearch: shouldPerformSearch || autonomousSearchResults.length > 0,
      });

    } catch (error) {
      console.error("Streaming error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error("Error details:", {
        message: errorMessage,
        stack: errorStack,
        conversationId: args.conversationId,
        messageId: args.messageId,
      });
      
      // Update message with error
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: `I apologize, but I encountered an error while generating a response. Error: ${errorMessage}. Please try again.`,
        isComplete: true,
      });
    }
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
