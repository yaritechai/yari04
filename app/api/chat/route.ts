import { streamText, tool, stepCountIs, hasToolCall } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { saveChat, getChatMessages } from '@/lib/db';

const openai = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// **AGENTIC TOOLS** - Each tool has proper input/output schemas
const agenticTools = {
  webSearch: tool({
    description: 'Search the web for current information and research',
    inputSchema: z.object({
      query: z.string().describe('Search query to find relevant information'),
      maxResults: z.number().optional().default(5).describe('Maximum number of results to return'),
    }),
    outputSchema: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
      relevanceScore: z.number().optional(),
    })),
    execute: async ({ query, maxResults }) => {
      console.log(`🔍 Web Search: "${query}"`);
      
      // Tavily search implementation
      if (process.env.TAVILY_API_KEY) {
        try {
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query,
              search_depth: "basic",
              max_results: maxResults,
            }),
          });

          const data = await response.json();
          return data.results?.map((result: any) => ({
            title: result.title || "",
            url: result.url || "",
            snippet: result.content || "",
            relevanceScore: result.score || 0.5,
          })) || [];
        } catch (error) {
          console.error("Tavily search failed:", error);
          return [];
        }
      }

      // Fallback mock data for development
      return [
        {
          title: `Search results for: ${query}`,
          url: "https://example.com",
          snippet: `Mock search result for "${query}". In production, this would contain real web search results.`,
          relevanceScore: 0.8,
        }
      ];
    },
  }),

  generateImage: tool({
    description: 'Generate an image from a text description using AI',
    inputSchema: z.object({
      prompt: z.string().describe('Detailed description of the image to generate'),
      size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().default('1024x1024'),
      style: z.enum(['natural', 'artistic', 'photographic']).optional().default('natural'),
    }),
    outputSchema: z.object({
      url: z.string(),
      prompt: z.string(),
      size: z.string(),
    }),
    execute: async ({ prompt, size, style }) => {
      console.log(`🎨 Image Generation: "${prompt}"`);
      
      // OpenAI DALL-E implementation
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: `${style} style: ${prompt}`,
              size,
              quality: "standard",
              n: 1,
            }),
          });

          const data = await response.json();
          return {
            url: data.data[0]?.url || "",
            prompt: prompt,
            size: size,
          };
        } catch (error) {
          console.error("Image generation failed:", error);
          throw new Error("Failed to generate image");
        }
      }

      // Fallback for development
      return {
        url: "https://via.placeholder.com/1024x1024?text=Generated+Image",
        prompt: prompt,
        size: size,
      };
    },
  }),

  analyzeData: tool({
    description: 'Analyze uploaded CSV or Excel data files',
    inputSchema: z.object({
      fileId: z.string().describe('ID of the uploaded file to analyze'),
      analysisType: z.enum(['summary', 'trends', 'insights', 'full']).optional().default('summary'),
      focusAreas: z.array(z.string()).optional().describe('Specific areas to focus analysis on'),
    }),
    outputSchema: z.object({
      summary: z.string(),
      insights: z.array(z.string()),
      statistics: z.object({
        rowCount: z.number(),
        columnCount: z.number(),
        dataTypes: z.record(z.string()),
      }).optional(),
      recommendations: z.array(z.string()).optional(),
    }),
    execute: async ({ fileId, analysisType, focusAreas }) => {
      console.log(`📊 Data Analysis: ${fileId} (${analysisType})`);
      
      // In production, this would:
      // 1. Fetch the file from storage
      // 2. Parse CSV/Excel data
      // 3. Perform statistical analysis
      // 4. Generate insights
      
      // Mock analysis for development
      return {
        summary: `Analyzed data file ${fileId}. The dataset contains valuable information that can provide insights into the requested ${analysisType} analysis.`,
        insights: [
          "Data shows clear patterns in the primary metrics",
          "Several outliers were identified that may require attention",
          "Trends indicate positive growth over the analyzed period",
        ],
        statistics: {
          rowCount: 1250,
          columnCount: 8,
          dataTypes: {
            "date": "datetime",
            "value": "numeric",
            "category": "string",
            "status": "boolean",
          },
        },
        recommendations: [
          "Focus on the top-performing categories for optimization",
          "Investigate the outliers identified in the analysis",
          "Consider expanding data collection in underrepresented areas",
        ],
      };
    },
  }),

  createPlan: tool({
    description: 'Create a structured plan for complex tasks and projects',
    inputSchema: z.object({
      objective: z.string().describe('The main goal or objective to plan for'),
      complexity: z.enum(['simple', 'moderate', 'complex']).optional().default('moderate'),
      timeframe: z.string().optional().describe('Expected timeframe for completion'),
      constraints: z.array(z.string()).optional().describe('Any constraints or limitations'),
    }),
    outputSchema: z.object({
      title: z.string(),
      overview: z.string(),
      steps: z.array(z.object({
        title: z.string(),
        description: z.string(),
        estimatedTime: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
      })),
      timeline: z.string().optional(),
      resources: z.array(z.string()).optional(),
    }),
    execute: async ({ objective, complexity, timeframe, constraints }) => {
      console.log(`📋 Plan Creation: "${objective}" (${complexity})`);
      
      const stepCount = complexity === 'simple' ? 3 : complexity === 'moderate' ? 5 : 8;
      
      return {
        title: `Plan: ${objective}`,
        overview: `Comprehensive ${complexity} plan to achieve: ${objective}${timeframe ? ` within ${timeframe}` : ''}.`,
        steps: Array.from({ length: stepCount }, (_, i) => ({
          title: `Step ${i + 1}: Implementation Phase ${i + 1}`,
          description: `Detailed implementation step for achieving the objective. This step builds on previous work and moves toward the final goal.`,
          estimatedTime: complexity === 'simple' ? '1-2 hours' : complexity === 'moderate' ? '2-4 hours' : '4-8 hours',
          dependencies: i > 0 ? [`Step ${i}`] : [],
        })),
        timeline: timeframe || `${stepCount * 2}-${stepCount * 4} hours`,
        resources: [
          'Team collaboration tools',
          'Project management software',
          'Required technical resources',
        ],
      };
    },
  }),

  finalAnswer: tool({
    description: 'Provide the final comprehensive answer after completing all necessary research and analysis',
    inputSchema: z.object({
      answer: z.string().describe('The comprehensive final answer to the user\'s question'),
      sources: z.array(z.string()).optional().describe('Sources and references used'),
      confidence: z.number().min(0).max(100).describe('Confidence level in the answer (0-100)'),
      followUp: z.array(z.string()).optional().describe('Suggested follow-up questions or actions'),
    }),
    outputSchema: z.object({
      answer: z.string(),
      sources: z.array(z.string()),
      confidence: z.number(),
      followUp: z.array(z.string()),
    }),
    execute: async ({ answer, sources = [], confidence, followUp = [] }) => {
      console.log(`✅ Final Answer: ${confidence}% confidence`);
      return { answer, sources, confidence, followUp };
    },
  }),
};

export async function POST(request: Request) {
  try {
    const { messages, chatId } = await request.json();
    
    // In a real app, you'd use proper auth
    // const session = await auth();
    // if (!session?.user) {
    //   return new Response('Unauthorized', { status: 401 });
    // }
    
    const userId = 'demo-user'; // For demo purposes
    
    // Get chat history if chatId exists
    const previousMessages = chatId ? await getChatMessages(chatId) : [];
    const allMessages = [...previousMessages, ...messages];

    console.log(`🤖 Starting agentic chat with ${allMessages.length} messages`);

    // **AGENTIC LOOP CONTROL** - The key feature!
    const result = streamText({
      model: openai('openai/gpt-5'),
      messages: allMessages,
      tools: agenticTools,
      
      // **STOP CONDITIONS** - When to stop the agentic loop
      stopWhen: [
        hasToolCall('finalAnswer'), // Stop when agent provides final answer
        stepCountIs(10), // Safety limit - max 10 steps
      ],
      
      // **DYNAMIC STEP PREPARATION** - Adjust behavior per step
      prepareStep: async ({ stepNumber, messages, toolCalls }) => {
        console.log(`🔄 Agent Step ${stepNumber + 1}`);
        
        // First step: Analysis and planning
        if (stepNumber === 0) {
          return {
            system: `You are Yari AI, an advanced agentic assistant. Current time: ${new Date().toISOString()}

**AGENTIC BEHAVIOR:**
- For complex requests, break them down into steps
- Use tools systematically to gather information
- Research thoroughly before providing answers
- Always end with the 'finalAnswer' tool when you have sufficient information

**AVAILABLE TOOLS:**
- webSearch: For current information and research
- generateImage: For creating visual content
- analyzeData: For processing uploaded files
- createPlan: For complex project planning
- finalAnswer: For comprehensive final responses

**INSTRUCTIONS:**
1. Analyze the user's request carefully
2. Determine what tools and information you need
3. Execute tools systematically to gather complete information
4. Synthesize findings into a comprehensive response
5. Use 'finalAnswer' tool to provide your final response with confidence level

Be thorough, accurate, and helpful. Take your time to research properly.`,
          };
        }

        // Middle steps: Focus on execution
        if (stepNumber > 0 && stepNumber < 7) {
          return {
            system: `Continue working on the user's request. You're on step ${stepNumber + 1}. 
            
Gather any additional information needed, then provide your final answer using the 'finalAnswer' tool when ready.`,
          };
        }

        // Later steps: Wrap up
        if (stepNumber >= 7) {
          return {
            system: `You've completed ${stepNumber + 1} steps. Focus on synthesizing your findings and providing a comprehensive final answer using the 'finalAnswer' tool.`,
            // Switch to faster model for final synthesis
            model: openai('openai/gpt-4o-mini'),
          };
        }

        // Compress context if getting too long (token management)
        if (messages.length > 30) {
          return {
            messages: messages.slice(-20), // Keep last 20 messages
          };
        }
      },

      // **LIFECYCLE HOOKS** - Monitor the agentic process
      onStepStart: ({ stepNumber }) => {
        console.log(`🚀 Starting agentic step ${stepNumber + 1}`);
      },

      onStepFinish: ({ stepNumber, toolCalls, toolResults, usage }) => {
        console.log(`✅ Completed step ${stepNumber + 1}:`, {
          toolsCalled: toolCalls.map(tc => tc.toolName),
          resultsCount: toolResults.length,
          tokens: usage?.totalTokens || 0,
        });
      },

      onFinish: async ({ messages: finalMessages, responseMessage, usage }) => {
        console.log(`🏁 Agentic conversation completed:`, {
          totalSteps: finalMessages.filter(m => m.toolInvocations?.length).length,
          totalTokens: usage?.totalTokens || 0,
          finalMessageLength: responseMessage.content.length,
        });

        // Save the complete agentic conversation
        try {
          await saveChat({
            chatId,
            messages: finalMessages,
            userId,
            metadata: {
              agenticSteps: finalMessages.filter(m => m.toolInvocations?.length).length,
              toolsUsed: Array.from(new Set(
                finalMessages
                  .flatMap(m => m.toolInvocations || [])
                  .map(t => t.toolName)
              )),
              totalTokens: usage?.totalTokens || 0,
              completedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Failed to save chat:', error);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
