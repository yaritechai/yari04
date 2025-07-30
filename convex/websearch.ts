"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";


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

// Enhanced web search with multiple providers
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
          include_images: true,
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
            image: result.image || undefined,
          }));
        }
      }
    } catch (error) {
      console.error("Tavily search failed:", error);
    }
  }

  return [];
}

// Enhanced AI response generation with search context
// Action to read content from a specific URL
export const readUrl = internalAction({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    return await readUrlContent(args.url);
  },
});

export const generateResponseWithSearch = internalAction({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Perform web search
      const searchResults = await performWebSearch(args.query);

      // Get conversation messages for context
      const messages: any[] = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // Format messages for OpenAI
      const openaiMessages = messages.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Add search context to the conversation with enhanced content
      let searchContext = "No search results found.";
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

      // Get current date and time for system prompt
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

      const systemMessage = {
        role: "system" as const,
        content: `📅 **CURRENT DATE & TIME**: ${currentDateTime}

You are a helpful AI assistant. The user has asked a question that required web search. Here are the current search results for "${args.query}":

${searchContext}

The search results include full webpage content retrieved using Jina Reader for comprehensive analysis. Use this information to provide a comprehensive and accurate response. Always cite your sources using the provided links when available.`
      };

      // Call OpenRouter with search context
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://convex.dev",
          "X-Title": "Convex AI Chat",
        },
      });

      const completion: any = await openrouter.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [systemMessage, ...openaiMessages],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const assistantMessage: string | undefined = completion.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error("No response from AI");
      }

      // Save AI response with search results
      await ctx.runMutation(internal.messages.addAssistantMessageWithSearch, {
        conversationId: args.conversationId,
        content: assistantMessage,
      });
    } catch (error) {
      console.error("Error in generateResponseWithSearch:", error);
      
      // Save error message to conversation
      await ctx.runMutation(internal.messages.addAssistantMessage, {
        conversationId: args.conversationId,
        content: "I apologize, but I encountered an error while searching for information. Please try again.",
      });
    }
  },
});
