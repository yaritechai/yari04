"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";
import { getModelForTask, getModelParameters } from "./modelRouter";
import { Id } from "./_generated/dataModel";
import * as XLSX from 'xlsx';
// Import pdf-parse dynamically inside handler to keep action lean on cold start
// duplicate import removed

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
      
      // Early path: detect explicit image edit requests and route directly to Black Forest Labs
      const latestUserWithImage = [...messages]
        .filter((m: any) => m.role === 'user' && m.attachments && m.attachments.some((a: any) => a.fileType?.startsWith('image/')))
        .sort((a: any, b: any) => b._creationTime - a._creationTime)[0];

      const isImageEditRequest = (text: string | undefined) => {
        if (!text) return false;
        const t = text.toLowerCase();
        // Recognize a variety of common edit intents
        const patterns = [
          /^\[\s*edit:\s*.+\]$/i, // [Edit: ...]
          /\b(edit|remove|erase|replace|change|swap|add|insert|crop|blur|sharpen|enhance|retouch|background|bg|logo|text)\b/,
        ];
        return patterns.some((re) => re.test(t));
      };

      if (latestUserWithImage && isImageEditRequest(latestUserWithImage.content)) {
        try {
          // Use the first image attachment of that message
          const att = latestUserWithImage.attachments.find((a: any) => a.fileType?.startsWith('image/'));
          if (att) {
            const blob = await ctx.storage.get(att.fileId);
            if (blob) {
              const arr = await blob.arrayBuffer();
              const base64 = Buffer.from(arr).toString('base64');
              const prompt = latestUserWithImage.content?.replace(/^\[\s*edit:\s*(.+)\]$/i, '$1') || latestUserWithImage.content || 'Please edit this image.';

              const result = await ctx.runAction(api.ai.editImage, {
                prompt,
                imageBase64: base64,
              });

              const url = (result as any)?.url;
              const content = url ? `Generated image: ${url}` : '❌ Failed to edit image.';

              await ctx.runMutation(internal.messages.updateStreamingMessage, {
                messageId: args.messageId,
                content,
                isComplete: true,
              });

              await ctx.runMutation(internal.conversations.updateLastMessage, {
                conversationId: args.conversationId,
              });

              return null;
            }
          }
        } catch (e) {
          console.error('Direct image edit path failed, falling back to normal flow:', e);
        }
      }
      
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
              // For models that don't support image_url, just mention the image
              // The AI will use the edit_image tool if needed
              content[0].text += `\n\n[Image attached: ${attachment.fileName}]`;
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
            } else if (attachment.fileType === 'application/pdf' || attachment.fileName?.toLowerCase().endsWith('.pdf')) {
              try {
                const fileBlob = await ctx.storage.get(attachment.fileId);
                if (fileBlob) {
                  const arrayBuffer = await fileBlob.arrayBuffer();
                  const nodeBuffer = Buffer.from(arrayBuffer);
                  // Use require to avoid TS type resolution issues in Convex typecheck
                  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                  const pdfParse = require('pdf-parse');
                  const parsed = await pdfParse(nodeBuffer);
                  const fullText: string = parsed?.text || '';
                  const preview = fullText.split(/\n/).slice(0, 60).join('\n').slice(0, 4000);
                  const pageCount = parsed?.numpages || parsed?.numPages || undefined;
                  content.push({
                    type: "text",
                    text: `\n\n📄 PDF FILE: ${attachment.fileName}${pageCount ? ` (Pages: ${pageCount})` : ''}\nPreview (first lines):\n\n${preview}\n\n`
                  });
                } else {
                  content.push({
                    type: "text",
                    text: `\n\n📄 PDF FILE: ${attachment.fileName}\n(File not available for reading)\n\n`
                  });
                }
              } catch (pdfErr) {
                console.error('Failed to parse PDF:', pdfErr);
                content.push({
                  type: "text",
                  text: `\n\n📄 PDF FILE: ${attachment.fileName}\nUnable to extract text from this PDF. You can ask me to focus on specific sections or provide a text excerpt.\n\n`
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

## TOOLS AVAILABLE

You can request the following tool by outputting a single JSON object (treat it like a fenced \`json\` code block) with the shape shown below. Do this only when it helps the user.

Tool name: generate_image
Purpose: Generate an image via ChatGPT's image model.
JSON schema to call the tool (example):
{
  "tool": "generate_image",
  "arguments": {
    "prompt": "<concise visual prompt>",
    "size": "1024x1024",
    "quality": "high",
    "background": "transparent"
  }
}

Rules:
- Output exactly one JSON object in a single fenced block when calling a tool. No extra commentary.
- Prefer size "1024x1024" unless the user requests a specific aspect ratio.
- If the user asks for multiple variants, specify it in the prompt text.

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
      const systemWithTools = `${systemPrompt}

## MARKDOWN OUTPUT RULES
- Use Markdown to format responses when it improves clarity.
- Prefer concise headings, bullet/numbered lists, and bold for key points.
- For comparisons or tabular data, render a Markdown table. Avoid HTML tables unless explicitly requested.
- When showing code, use fenced code blocks with the correct language tag (e.g., \`\`\`js, \`\`\`ts, \`\`\`python).
- When attaching CSVs, include a short Markdown table preview (first 10–30 rows) in the message when feasible.
- Do not introduce colors or visual styling in the content; the app theme handles visuals. Stick to plain Markdown.
- Use descriptive links like [Title](https://example.com) rather than bare URLs when appropriate.

## IMAGE TOOLS (Black Forest Labs)
- Tool: generate_image
  - Purpose: Create a brand-new image from text.
  - Args: { "prompt": string, "size"?: string, "quality"?: string, "background"?: string }
  - Use ONLY when no source image needs to be edited.

- Tool: edit_image
  - Purpose: Edit an existing image via BFL FLUX.
  - IMPORTANT: When you see "[Image attached: filename]" and the user asks for ANY changes to that image, you MUST use this tool.
  - Common edit requests: "make her wear a hoodie", "change background", "add snow", "remove object", etc.
  - Args: { "prompt": string, "input_image"?: base64 or data URL, "attachmentIndex"?: number }
  - If you don't have base64, omit input_image; the server will use the most recent attached image.
  - Do NOT try to analyze the image content directly - use this tool for edits.

## DATA TOOLS
- Tool name: generate_csv
  - Use when you want to provide the user with a downloadable CSV derived from your analysis.
  - Arguments: { "csv": string, "filename"?: string }
  - ALWAYS include non-empty CSV content.
  - The CSV will be attached to your current assistant message and shown with a small download button.

- Tool name: generate_table
  - Use when you want to present structured data clearly as a table (and provide a downloadable CSV).
  - Arguments: { "headers"?: string[], "rows"?: string[][], "records"?: Array<Record<string, string | number>>, "filename"?: string }
  - ALWAYS include data via either:

### Planning & Research Tools (Agent Swarm)

- Tool: plan_task
  - Purpose: Break a complex user request into a short, actionable checklist for approval.
  - Args: {
      "title": string,
      "tasks": Array<{"title": string, "description"?: string}>
    }
  - Behavior: The server will persist this plan and render a checklist UI in the chat for user approval.

- Tool: gather_research
  - Purpose: Perform parallel web research using available search providers to gather context.
  - Args: { "queries": string[] }
  - Behavior: The server will fetch results and attach summarized sources back to the conversation.
    - headers + rows (rows are arrays matching headers order), or
    - records (array of objects; headers will be inferred from keys).
  - The table will be inserted into your response as a Markdown table and a CSV will be attached for download.

### PDF HANDLING
- When the user attaches a PDF, acknowledge it and summarize or extract key points. If you cannot access the full text, ask the user what sections to focus on or request a text excerpt.

When you need to call a tool, output a single fenced JSON object calling the correct tool.`;

      const messagesWithSystem = [
        { role: "system" as const, content: systemWithTools },
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

      // Attempt to detect a generate_image, edit_image, or generate_csv tool call in the streamed content
      let finalContent = streamedContent;
      try {
        // Helper to execute a generate_image, edit_image, generate_csv, plan_task, gather_research tool call
        const executeTool = async (
          matchedText: string,
          toolObj: { tool?: string; name?: string; arguments?: { prompt?: string; size?: string; quality?: string; background?: string; input_image?: string; attachmentIndex?: number; csv?: string; filename?: string; headers?: string[]; rows?: string[][]; records?: Array<Record<string, string | number>>; title?: string; tasks?: Array<{ title: string; description?: string }>; queries?: string[] } }
        ) => {
          const argsObj = (toolObj.arguments || {}) as {
            prompt?: string;
              size?: string;
              quality?: string;
              background?: string;
            input_image?: string;
            attachmentIndex?: number;
            csv?: string;
            filename?: string;
            headers?: string[];
            rows?: string[][];
            records?: Array<Record<string, string | number>>;
            title?: string;
            tasks?: Array<{ title: string; description?: string }>;
            queries?: string[];
          };
          const toolName = (toolObj.tool || toolObj.name || '').toLowerCase();
          try {
            if (toolName === 'generate_image') {
              if (!argsObj.prompt) return;
            const result = await ctx.runAction(api.ai.generateImage, {
              prompt: argsObj.prompt,
              size: argsObj.size,
              quality: argsObj.quality,
              background: argsObj.background,
            });
            if (result && result.url) {
                finalContent = streamedContent.replace(matchedText, `Generated image: ${result.url}`);
              } else {
                finalContent = streamedContent.replace(matchedText, "❌ Failed to generate image. The provider did not return a URL.");
              }
              return;
            }
            if (toolName === 'edit_image') {
              if (!argsObj.prompt) return;
              // Prefer provided input_image (base64 or data URL). Otherwise use most recent image attachment in this conversation.
              let base64: string | null = null;
              if (argsObj.input_image && typeof argsObj.input_image === 'string') {
                const val = argsObj.input_image.trim();
                if (val.startsWith('data:')) base64 = val.split(',')[1] || '';
                else if (/^[A-Za-z0-9+/=]+$/.test(val) && val.length > 100) base64 = val;
              }
              if (!base64) {
                const imageMessages = messages
                  .filter((m: any) => m.attachments && m.attachments.some((a: any) => a.fileType?.startsWith('image/')))
                  .reverse();
                const idx = Math.max(0, Number(argsObj.attachmentIndex ?? 0));
                const target = imageMessages[idx];
                if (target) {
                  const att = target.attachments.find((a: any) => a.fileType?.startsWith('image/'));
                  if (att) {
                    const blob = await ctx.storage.get(att.fileId);
                    if (blob) {
                      const arr = await blob.arrayBuffer();
                      base64 = Buffer.from(arr).toString('base64');
                    }
                  }
                }
              }
              if (!base64) {
                finalContent = streamedContent.replace(matchedText, "❌ Could not find a source image to edit. Please attach an image and try again.");
                return;
              }
              const result = await ctx.runAction(api.ai.editImage, {
                prompt: argsObj.prompt,
                imageBase64: base64,
              });
              if (result && (result as any).url) {
                finalContent = streamedContent.replace(matchedText, `Generated image: ${(result as any).url}`);
              } else {
                finalContent = streamedContent.replace(matchedText, "❌ Failed to edit image. The provider did not return a URL.");
              }
              return;
            }
            if (toolName === 'generate_csv') {
              // Expect CSV content in argsObj.csv. If not present, derive from prompt via simple pass-through
              const csvText = (argsObj.csv && typeof argsObj.csv === 'string') ? argsObj.csv : '';
              const desiredName = (argsObj.filename && typeof argsObj.filename === 'string') ? argsObj.filename : 'data.csv';

              const encoder = new TextEncoder();
              const csvBytes = encoder.encode(csvText);
              const blob = new Blob([csvBytes], { type: 'text/csv' });

              // Save to storage and attach to this assistant message
              const storageId = await ctx.storage.store(blob as any);
              await ctx.runMutation(internal.messages.addAttachment, {
                messageId: args.messageId,
                attachment: {
                  fileId: storageId as any,
                  fileName: desiredName,
                  fileType: 'text/csv',
                  fileSize: csvBytes.byteLength,
                },
              });

              finalContent = streamedContent.replace(
                matchedText,
                `CSV generated and attached as ${desiredName}.`
              );
              return;
            }
            if (toolName === 'plan_task') {
              const planTitle = argsObj.title || 'Plan';
              const tasks = (argsObj.tasks || []).map(t => ({ title: t.title, description: t.description, done: false }));
              const saved = await ctx.runMutation(api.plans.save, {
                conversationId: args.conversationId,
                title: planTitle,
                tasks,
                status: 'draft',
              });
              finalContent = streamedContent.replace(matchedText, `Plan created: [plan:${saved.planId}]`);
              return;
            }
            if (toolName === 'gather_research') {
              const allQueries = (argsObj.queries && argsObj.queries.length > 0) ? argsObj.queries : [message.content];
              // Run in sequence (providers parallelized inside action)
              const aggregated: any[] = [];
              for (const q of allQueries) {
                const res = await ctx.runAction(api.research.gather, { conversationId: args.conversationId, query: q });
                aggregated.push(...res);
              }
              // Attach as a compact list for UI badges
              if (aggregated.length > 0) {
                // Attach to assistant message as searchResults for badges
                await ctx.runMutation(internal.messages.addAssistantMessageWithSearch, {
                  conversationId: args.conversationId,
                  content: `Research summary for: ${allQueries.join('; ')}`,
                  searchResults: aggregated.map((r: any) => ({
                    title: r.title || '',
                    link: r.link || '',
                    snippet: r.snippet || '',
                    displayLink: r.displayLink || (r.link ? new URL(r.link).hostname : ''),
                  })),
                });
                finalContent = streamedContent.replace(matchedText, `Gathered ${aggregated.length} research sources.`);
              } else {
                finalContent = streamedContent.replace(matchedText, `No research sources found.`);
              }
              return;
            }
            if (toolName === 'generate_table') {
              // Build CSV/MD from headers+rows or records. Fallback to csv string if provided.
              let headers = Array.isArray(argsObj.headers) ? argsObj.headers : [];
              let rows = Array.isArray(argsObj.rows) ? argsObj.rows : [];
              const records = Array.isArray(argsObj.records) ? argsObj.records : [];
              const desiredName = (argsObj.filename && typeof argsObj.filename === 'string') ? argsObj.filename : 'table.csv';

              const escapeCsv = (val: string) => {
                const needsQuotes = /[",\n]/.test(val);
                const escaped = val.replace(/"/g, '""');
                return needsQuotes ? `"${escaped}"` : escaped;
              };
              // If records provided, derive headers and row matrix
              if (records.length > 0) {
                const keySet = new Set<string>();
                for (const rec of records) Object.keys(rec || {}).forEach(k => keySet.add(k));
                if (headers.length === 0) headers = Array.from(keySet);
                if (rows.length === 0) rows = records.map(rec => headers.map(h => String((rec as any)[h] ?? '')));
              }

              // Build CSV (or use provided csv string)
              let csvText = '';
              if (typeof argsObj.csv === 'string' && argsObj.csv.trim().length > 0) {
                csvText = argsObj.csv.trim();
              } else {
                const csvLines: string[] = [];
                if (headers.length > 0) csvLines.push(headers.map(h => escapeCsv(String(h))).join(','));
                for (const r of rows) {
                  const safeRow = (Array.isArray(r) ? r : []).map(v => {
                    const s = String(v ?? '');
                    const sanitized = /^[=+\-@]/.test(s) ? `'${s}` : s;
                    return escapeCsv(sanitized);
                  });
                  csvLines.push(safeRow.join(','));
                }
                csvText = csvLines.join('\n');
              }

              if (!csvText || csvText.trim().length === 0) {
                finalContent = streamedContent.replace(matchedText, "I tried to create a table but no valid data was provided.");
                return;
              }
              const encoder = new TextEncoder();
              const csvBytes = encoder.encode(csvText);
              const blob = new Blob([csvBytes], { type: 'text/csv' });

              const storageId = await ctx.storage.store(blob as any);
              await ctx.runMutation(internal.messages.addAttachment, {
                messageId: args.messageId,
                attachment: {
                  fileId: storageId as any,
                  fileName: desiredName,
                  fileType: 'text/csv',
                  fileSize: csvBytes.byteLength,
                },
              });

              // Build Markdown table preview (if no matrix, parse first rows of csv)
              let mdHeaders = headers;
              let mdBodyRows = rows;
              if (mdHeaders.length === 0 || mdBodyRows.length === 0) {
                const lines = csvText.split(/\r?\n/).filter(Boolean);
                if (lines.length > 0) {
                  const split = (line: string) => line.split(',').map(c => c.replace(/^\"|\"$/g, ''));
                  mdHeaders = split(lines[0]);
                  mdBodyRows = lines.slice(1, 31).map(split);
                }
              }
              const mdHeader = mdHeaders.length > 0 ? `| ${mdHeaders.join(' | ')} |` : '';
              const mdDivider = mdHeaders.length > 0 ? `| ${mdHeaders.map(() => '---').join(' | ')} |` : '';
              const mdRows = (mdBodyRows || []).map(r => `| ${(r || []).map(c => String(c ?? '')).join(' | ')} |`).join('\n');
              const mdTable = mdHeaders.length > 0 ? `${mdHeader}\n${mdDivider}\n${mdRows}` : mdRows;

              finalContent = streamedContent.replace(
                matchedText,
                `\n\nGenerated table (download attached CSV: ${desiredName}):\n\n${mdTable}\n\n`
              );
              return;
            }
          } catch (imageError) {
            console.error("Image tool execution failed:", imageError);
            finalContent = streamedContent.replace(matchedText, "❌ Failed to execute image tool.");
          }
        };

        // Helper: extract a balanced JSON object containing a given index
        const extractBalancedJsonAt = (text: string, anchorIndex: number): string | null => {
          // find the nearest '{' before anchorIndex
          let start = -1;
          for (let i = anchorIndex; i >= 0; i--) {
            if (text[i] === '{') { start = i; break; }
          }
          if (start === -1) return null;
          let depth = 0;
          let inString = false;
          let escape = false;
          for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (inString) {
              if (escape) {
                escape = false;
              } else if (ch === '\\') {
                escape = true;
              } else if (ch === '"') {
                inString = false;
              }
              continue;
            }
            if (ch === '"') {
              inString = true;
            } else if (ch === '{') {
              depth++;
            } else if (ch === '}') {
              depth--;
              if (depth === 0) {
                return text.slice(start, i + 1);
              }
            }
          }
          return null;
        };

        // 1) Prefer fenced JSON block
        const toolJsonMatch = streamedContent.match(/```json\s*([\s\S]*?)\s*```/i);
        if (toolJsonMatch && toolJsonMatch[1]) {
          const maybeObj = JSON.parse(toolJsonMatch[1]);
          if (
            maybeObj &&
            (maybeObj.tool === "generate_image" || maybeObj.name === "generate_image" ||
             maybeObj.tool === 'edit_image' || maybeObj.name === 'edit_image' ||
             maybeObj.tool === 'generate_csv' || maybeObj.name === 'generate_csv' ||
             maybeObj.tool === 'generate_table' || maybeObj.name === 'generate_table')
          ) {
            await executeTool(toolJsonMatch[0], maybeObj);
          }
        } else {
          // 2) Fallback: try to find an unfenced JSON object containing a generate_image or edit_image tool call
          const anchors = ['generate_image', 'edit_image', 'generate_csv', 'generate_table']
            .map((key) => ({ key, idx: streamedContent.indexOf(key) }))
            .filter((a) => a.idx >= 0)
            .sort((a, b) => a.idx - b.idx);
          for (const { key, idx } of anchors) {
            const candidate = extractBalancedJsonAt(streamedContent, idx);
            if (!candidate) continue;
            try {
              const obj = JSON.parse(candidate);
              if (obj && (obj.tool === key || obj.name === key)) {
                await executeTool(candidate, obj);
                break;
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse or execute tool call:", e);
      }

      // Finalize normal response (with possible image result)
      await ctx.runMutation(internal.messages.finalizeStreamingMessage, {
        messageId: args.messageId,
        content: finalContent,
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
