"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { getModelForTask, getModelParameters } from "./modelRouter";
import { Id } from "./_generated/dataModel";
import * as XLSX from 'xlsx';

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

      // Format messages for OpenAI with vision support
      const hasImages = filteredMessages.some((msg: any) => 
        msg.attachments && msg.attachments.length > 0 && 
        msg.attachments.some((att: any) => att.fileType && att.fileType.startsWith('image/'))
      );
      
      const hasDataFiles = filteredMessages.some((msg: any) => 
        msg.attachments && msg.attachments.length > 0 && 
        msg.attachments.some((att: any) => 
          att.fileType && (
            att.fileType === 'text/csv' ||
            att.fileType === 'application/vnd.ms-excel' ||
            att.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            att.fileName?.toLowerCase().endsWith('.csv') ||
            att.fileName?.toLowerCase().endsWith('.xls') ||
            att.fileName?.toLowerCase().endsWith('.xlsx')
          )
        )
      );
      
      const openaiMessages = await Promise.all(
        filteredMessages.map(async (msg: any) => {
          // Handle text-only messages
          if (!msg.attachments || msg.attachments.length === 0) {
            return {
              role: msg.role as "user" | "assistant",
              content: msg.content,
            };
          }
          
          // Handle messages with attachments (images)
          const content: any[] = [
            {
              type: "text",
              text: msg.content || "Please analyze this image:"
            }
          ];
          
          // Process image attachments
          for (const attachment of msg.attachments) {
            if (attachment.fileType && attachment.fileType.startsWith('image/')) {
              try {
                // Get the image URL from Convex storage
                const imageUrl = await ctx.storage.getUrl(attachment.fileId);
                if (imageUrl) {
                  content.push({
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                      detail: "high" // Use high detail for better analysis
                    }
                  });
                }
              } catch (error) {
                console.error("Failed to get image URL:", error);
              }
            } else if (attachment.fileType && (
              attachment.fileType === 'text/csv' ||
              attachment.fileType === 'application/vnd.ms-excel' ||
              attachment.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              attachment.fileName?.toLowerCase().endsWith('.csv') ||
              attachment.fileName?.toLowerCase().endsWith('.xls') ||
              attachment.fileName?.toLowerCase().endsWith('.xlsx')
            )) {
              try {
                // Get the file content from Convex storage
                const fileBlob = await ctx.storage.get(attachment.fileId);
                if (fileBlob) {
                  const arrayBuffer = await fileBlob.arrayBuffer();
                  
                  // Parse CSV files
                  if (attachment.fileType === 'text/csv' || attachment.fileName?.toLowerCase().endsWith('.csv')) {
                    const text = new TextDecoder().decode(arrayBuffer);
                    const rows = text.split('\n').slice(0, 100); // Limit to first 100 rows for context
                    const dataPreview = rows.join('\n');
                    
                    content.push({
                      type: "text",
                      text: `\n\n📊 CSV FILE: ${attachment.fileName}\nFile Size: ${attachment.fileSize} bytes\nFirst 100 rows:\n\n${dataPreview}\n\n`
                    });
                  } else if (attachment.fileName?.toLowerCase().endsWith('.xlsx') || 
                           attachment.fileName?.toLowerCase().endsWith('.xls') ||
                           attachment.fileType === 'application/vnd.ms-excel' ||
                           attachment.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                    // Parse Excel files using xlsx library
                    try {
                      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                      const sheetName = workbook.SheetNames[0]; // Get first sheet
                      const worksheet = workbook.Sheets[sheetName];
                      
                      // Convert to CSV format (first 100 rows)
                      const csvData = XLSX.utils.sheet_to_csv(worksheet, { strip: true });
                      const rows = csvData.split('\n').slice(0, 100);
                      const dataPreview = rows.join('\n');
                      
                      content.push({
                        type: "text",
                        text: `\n\n📊 EXCEL FILE: ${attachment.fileName}\nSheet: ${sheetName}\nFile Size: ${attachment.fileSize} bytes\nFirst 100 rows:\n\n${dataPreview}\n\n`
                      });
                    } catch (excelError) {
                      console.error("Failed to parse Excel file:", excelError);
                      content.push({
                        type: "text", 
                        text: `\n\n📊 EXCEL FILE: ${attachment.fileName}\nFile Size: ${attachment.fileSize} bytes\n❌ Error parsing Excel file. Please try converting to CSV format.\n\n`
                      });
                    }
                  } else {
                    // For other data file types
                    content.push({
                      type: "text", 
                      text: `\n\n📊 DATA FILE: ${attachment.fileName}\nFile Size: ${attachment.fileSize} bytes\nFile Type: ${attachment.fileType}\n\n`
                    });
                  }
                }
              } catch (error) {
                console.error("Failed to process data file:", error);
                content.push({
                  type: "text",
                  text: `\n\n❌ Error processing file: ${attachment.fileName}\n\n`
                });
              }
            }
          }
          
          return {
            role: msg.role as "user" | "assistant",
            content: content
          };
        })
      );

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

## CRITICAL HTML/CSS RULE FOR ALL TASKS
**WHENEVER YOU CREATE HTML CONTENT (landing pages, designs, clones, websites):**
- **MUST USE INLINE CSS ONLY**: All styling goes in style="" attributes, never in <style> blocks
- **COMPLETE HTML DOCUMENTS**: Always provide full HTML with <!DOCTYPE html>, <html>, <head>, and <body>
- **IMMEDIATE RENDERING**: Code must work instantly when opened in a browser
- **NO EXTERNAL DEPENDENCIES**: No external CSS files, frameworks, or stylesheets
- **INLINE RESPONSIVE**: Use responsive units and inline media queries for mobile compatibility

## YARI AI CORE CAPABILITIES

### 👁️ **Vision & Image Processing**
You can analyze, understand, and work with images, screenshots, photos, and visual content:
- **IMAGE ANALYSIS**: Describe, identify, and understand visual content
- **OCR & TEXT EXTRACTION**: Read and extract text from images
- **DESIGN REPLICATION**: Clone and recreate visual designs you see in images
- **SCREENSHOT ANALYSIS**: Understand UI/UX designs and webpage layouts
- **CHART & GRAPH READING**: Interpret data visualizations and diagrams

**WHEN CLONING IMAGES/DESIGNS:**
- Study the image carefully for colors, fonts, layout, spacing, and visual hierarchy
- Create pixel-perfect recreations using HTML with inline CSS only
- Match brand colors, typography, button styles, and layout proportions exactly
- Use inline CSS for all styling to ensure immediate visual rendering
- Maintain responsive design principles while preserving the original design intent

### 📊 **Data Analysis & Processing**
You can analyze and work with structured data from CSV and Excel files:
- **CSV ANALYSIS**: Process and analyze comma-separated value files
- **DATA INSIGHTS**: Extract patterns, trends, and key insights from datasets
- **STATISTICAL ANALYSIS**: Calculate means, medians, correlations, and distributions
- **DATA VISUALIZATION**: Suggest charts and graphs for data representation
- **REPORTING**: Create comprehensive data reports and summaries
- **FILTERING & GROUPING**: Help organize and filter data by various criteria

**WHEN ANALYZING DATA FILES:**
- Examine the data structure and identify column headers and data types
- Look for patterns, trends, outliers, and interesting insights
- Provide statistical summaries and key metrics
- Suggest actionable recommendations based on the data
- Offer data visualization suggestions (charts, graphs, dashboards)
- Help with data cleaning and organization tasks

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

**CRITICAL CSS & HTML REQUIREMENTS:**
- **ALWAYS USE INLINE CSS**: Put ALL styles directly in HTML elements using style="" attributes
- **NO SEPARATE CSS BLOCKS**: Never use <style> tags or external CSS files
- **COMPLETE HTML**: Generate full, complete HTML documents with proper structure
- **INLINE EVERYTHING**: Colors, fonts, spacing, animations, responsive design - ALL inline
- **RESPONSIVE INLINE**: Use inline media queries and responsive units (rem, %, vw, vh)
- **ANIMATIONS INLINE**: Include CSS animations and transitions directly in style attributes

**INLINE CSS EXAMPLE:**
\`\`\`html
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  <h1 style="color: white; font-size: 2.5rem; font-weight: bold; margin: 0;">Title</h1>
</div>
\`\`\`

Example approaches for landing pages:
- **Tech Startup**: Sleek gradients, glassmorphism, modern typography
- **Restaurant**: Warm colors, food imagery, elegant fonts
- **Fitness Brand**: Bold colors, dynamic layouts, energy-focused design
- **Luxury Brand**: Minimal design, premium typography, sophisticated colors
- **Creative Agency**: Unique layouts, bold typography, artistic elements

**IMAGE CLONING/REPLICATION:**
When asked to clone, recreate, or copy an image (especially screenshots or designs):
- **ANALYZE CAREFULLY**: Study colors, fonts, layout, spacing, and visual elements
- **RECREATE EXACTLY**: Match the design as closely as possible
- **USE INLINE CSS**: Implement ALL styling inline for immediate visual rendering
- **MAINTAIN PROPORTIONS**: Keep the same aspect ratios and element relationships
- **PRESERVE BRANDING**: Match brand colors, typography, and visual style exactly

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
        isResearchTask: shouldPerformSearch,
        hasImages: hasImages, // Include image detection for vision model selection
        hasDataFiles: hasDataFiles // Include data file detection for data analysis model selection
      });
      
      const modelParams = getModelParameters(selectedModel);

      console.log("Prepared OpenRouter messages:", {
        messageCount: openaiMessages.length + 1, // +1 for system prompt
        model: selectedModel,
        temperature: modelParams.temperature,
        hasApiKey: !!process.env.OPENROUTER_API_KEY,
        isLandingPageRequest,
        shouldPerformSearch,
        hasImages: hasImages,
        hasDataFiles: hasDataFiles,
        imagesDetected: hasImages ? "Using vision-capable model" : "Using standard model",
        dataFilesDetected: hasDataFiles ? "Using data analysis model" : "Using standard model"
      });

      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev",
          "X-Title": "Convex AI Chat",
        },
      });

      console.log("Creating OpenRouter streaming completion...");

      // SIMPLE SEARCH APPROACH - No complex tool calling
      if (shouldPerformSearch) {
        // Get the latest user message from the conversation for search query
        const conversationMessages = await ctx.runQuery(internal.messages.listInternal, {
          conversationId: args.conversationId,
        });
        
        // Find the latest user message
        const latestUserMessage = conversationMessages
          .filter(msg => msg.role === "user")
          .sort((a, b) => b._creationTime - a._creationTime)[0];
        
        if (!latestUserMessage) {
          console.log("No user message found for search");
        } else {
          console.log("🔍 Performing direct search for:", latestUserMessage.content);
          
          // Direct search call - simple and clean
          try {
            const searchResults = await performWebSearch(latestUserMessage.content);
            
            if (searchResults.length > 0) {
              // Format search results for LLM
              const searchContext = searchResults.map((result, index) => 
                `${index + 1}. **${result.title}**\n   URL: ${result.link}\n   ${result.snippet}\n`
              ).join('\n');
              
              // Create enhanced prompt with search results
              const searchPrompt = `Based on the following search results about "${latestUserMessage.content}", provide a comprehensive response:

${searchContext}

Please provide a detailed and informative response based on these search results.`;

              // Call LLM with search context AND conversation history
              const searchMessagesWithHistory = [
                { role: "system" as const, content: systemPrompt },
                ...openaiMessages.slice(0, -1), // Include all previous conversation history except the current message
                { 
                  role: "system" as const, 
                  content: `CURRENT WEB SEARCH RESULTS for "${latestUserMessage.content}":\n\n${searchContext}\n\nPlease use these search results to provide a comprehensive and up-to-date response to the user's question, while maintaining context from the previous conversation.`
                },
                { 
                  role: "user" as const, 
                  content: latestUserMessage.content // Keep the original user message unchanged
                }
              ];

              const completion = await openrouter.chat.completions.create({
        model: selectedModel,
                messages: searchMessagesWithHistory,
        max_tokens: modelParams.max_tokens,
        temperature: modelParams.temperature,
                stream: true
              });

              let responseContent = "";
              
              // Stream the response
              for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
                  responseContent += delta.content;
          
                  // Update streaming message
                  if (responseContent.length % 50 === 0) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
                      content: responseContent,
              isComplete: false,
            });
          }
        }
              }

              // Finalize with search results - this will show the badges and enable right panel
              await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
                messageId: args.messageId,
                content: responseContent,
                searchResults: searchResults, // Show in right panel
                hasWebSearch: true,
              });

              console.log("Search completed, response length:", responseContent.length);
              return;
              
            } else {
              console.log("No search results found, falling back to normal response");
                }
              } catch (error) {
            console.error("Search failed:", error);
            // Fall through to normal response
          }
        }
      }

      // NORMAL RESPONSE (no search)
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
        stream: true
      });

      let streamedContent = "";

      // Stream the normal response
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          streamedContent += delta.content;
          
          // Update message in real-time
          if (streamedContent.length % 50 === 0 || streamedContent.length > 100) {
            await ctx.runMutation(internal.messages.updateStreamingMessage, {
              messageId: args.messageId,
              content: streamedContent,
              isComplete: false,
            });
          }
        }
      }

      // Finalize normal response
      await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
        messageId: args.messageId,
        content: streamedContent,
      });

      console.log("Stream completed, final content length:", streamedContent.length);

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

// Function to detect if content should trigger the document editor
function detectDocumentContent(content: string, userMessage: string): boolean {
  const contentLength = content.length;
  const userRequest = userMessage.toLowerCase();
  
  // Detect writing/creative content keywords in user request
  const writingKeywords = [
    'write', 'create', 'draft', 'compose', 'author',
    'article', 'blog', 'essay', 'story', 'letter',
    'email', 'memo', 'report', 'proposal', 'plan',
    'guide', 'tutorial', 'documentation', 'content',
    'copy', 'script', 'speech', 'presentation',
    'marketing', 'creative', 'brainstorm', 'outline'
  ];
  
  const hasWritingKeywords = writingKeywords.some(keyword => 
    userRequest.includes(keyword)
  );
  
  // Detect structured content patterns in AI response
  const hasStructuredContent = 
    content.includes('\n\n') || // Multiple paragraphs
    content.includes('# ') ||    // Headers
    content.includes('## ') ||   // Headers
    content.includes('### ') ||  // Headers
    content.includes('- ') ||    // Lists
    content.includes('* ') ||    // Lists
    content.includes('1. ') ||   // Numbered lists
    content.includes('**') ||    // Bold text
    content.includes('---');     // Dividers
  
  // Criteria for triggering document editor:
  // 1. Long content (500+ chars) with writing keywords
  // 2. Structured content (headers, lists, etc.) regardless of length
  // 3. Very long content (1000+ chars) regardless of keywords
  
  return (
    (contentLength > 500 && hasWritingKeywords) ||
    (hasStructuredContent && contentLength > 200) ||
    contentLength > 1000
  );
}

// Function to detect if the user is requesting a document (e.g., "write a document", "create a document")
function detectDocumentRequest(message: string): boolean {
  const documentKeywords = [
    'write a', 'write an', 'create a', 'create an', 'draft a', 'draft an',
    'compose a', 'compose an', 'author a', 'author an', 'make a', 'make an',
    'generate a', 'generate an', 'produce a', 'produce an',
    'article', 'blog post', 'blog', 'essay', 'story', 'letter',
    'email', 'memo', 'report', 'proposal', 'plan', 'document',
    'guide', 'tutorial', 'documentation', 'content', 'copy',
    'script', 'speech', 'presentation', 'marketing copy',
    'creative writing', 'brainstorm', 'outline', 'brief',
    'white paper', 'case study', 'research paper', 'write about'
  ];
  
  const lowerMessage = message.toLowerCase();
  return documentKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to convert text content to document blocks
function convertTextToDocumentBlocks(content: string): any[] {
  const blocks = [];
  let blockIdCounter = 1;
  
  // Split content by double newlines (paragraphs)
  const sections = content.split(/\n\s*\n/);
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;
    
    const lines = trimmedSection.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      let blockType = 'text';
      let content = trimmedLine;
      let level = undefined;
      
      // Detect headers
      if (trimmedLine.startsWith('### ')) {
        blockType = 'heading';
        content = trimmedLine.substring(4);
        level = 3;
      } else if (trimmedLine.startsWith('## ')) {
        blockType = 'heading';
        content = trimmedLine.substring(3);
        level = 2;
      } else if (trimmedLine.startsWith('# ')) {
        blockType = 'heading';
        content = trimmedLine.substring(2);
        level = 1;
      }
      // Detect lists
      else if (trimmedLine.match(/^[\*\-\+]\s/)) {
        blockType = 'list';
        content = trimmedLine.substring(2);
      }
      // Detect numbered lists
      else if (trimmedLine.match(/^\d+\.\s/)) {
        blockType = 'list';
        content = trimmedLine.replace(/^\d+\.\s/, '');
      }
      // Detect quotes
      else if (trimmedLine.startsWith('> ')) {
        blockType = 'quote';
        content = trimmedLine.substring(2);
      }
      // Detect dividers
      else if (trimmedLine.match(/^[\-\*_]{3,}$/)) {
        blockType = 'divider';
        content = '';
      }
      
      blocks.push({
        id: `block-${blockIdCounter++}`,
        type: blockType,
        content: content,
        ...(level && { level })
      });
    }
  }
  
  // If no blocks were created, create a single text block
  if (blocks.length === 0) {
    blocks.push({
      id: 'block-1',
      type: 'text',
      content: content
    });
  }
  
  return blocks;
}

// Function to extract a suitable title for the document
function extractDocumentTitle(content: string, userMessage: string): string {
  // Try to extract title from content
  const lines = content.split('\n');
  
  // Look for first heading
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
    if (trimmed.startsWith('## ')) {
      return trimmed.substring(3).trim();
    }
  }
  
  // Extract from user message
  const userRequest = userMessage.toLowerCase();
  
  // Look for "write a [something]" or "create a [something]"
  const writeMatch = userRequest.match(/(?:write|create|draft|compose)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:for|about|on)|\s*$)/);
  if (writeMatch) {
    const extracted = writeMatch[1].trim();
    return extracted.charAt(0).toUpperCase() + extracted.slice(1);
  }
  
  // Look for content type keywords
  if (userRequest.includes('article')) return 'Article';
  if (userRequest.includes('blog')) return 'Blog Post';
  if (userRequest.includes('essay')) return 'Essay';
  if (userRequest.includes('story')) return 'Story';
  if (userRequest.includes('letter')) return 'Letter';
  if (userRequest.includes('email')) return 'Email';
  if (userRequest.includes('memo')) return 'Memo';
  if (userRequest.includes('report')) return 'Report';
  if (userRequest.includes('proposal')) return 'Proposal';
  if (userRequest.includes('plan')) return 'Plan';
  if (userRequest.includes('guide')) return 'Guide';
  if (userRequest.includes('tutorial')) return 'Tutorial';
  
  // Default fallback
  return 'Generated Document';
}

// Note: Old template function removed - AI now generates custom HTML directly
