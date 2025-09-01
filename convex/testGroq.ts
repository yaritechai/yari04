"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { streamGroqCompletion, shouldUseGroq } from "./lib/groqClient";
import { MODELS, getModelParameters } from "./modelRouter";
import { internal } from "./_generated/api";

// Test action to verify Groq API connection with a specific model
export const testGroqConnection = internalAction({
  args: {
    modelId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
    modelTested: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return {
          success: false,
          error: "GROQ_API_KEY environment variable is not set",
          modelTested: args.modelId,
        };
      }

      // Use the provided model or default to Llama 3
      const modelId = args.modelId || "groq/llama3-70b-8192";
      
      if (!shouldUseGroq(modelId)) {
        return {
          success: false,
          error: `Model ${modelId} is not a Groq model`,
          modelTested: modelId,
        };
      }

      const modelParams = getModelParameters(modelId);
      
      const response = await streamGroqCompletion({
        model: modelId,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello, are you working? Please respond with a very short message." },
        ],
        temperature: modelParams.temperature,
        max_tokens: 50, // Short response for testing
        top_p: modelParams.top_p,
        apiKey: groqApiKey,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Groq API error: ${response.status} ${response.statusText}`,
          modelTested: modelId,
        };
      }

      // Read a small part of the response to verify content
      const reader = response.body?.getReader();
      if (!reader) {
        return {
          success: false,
          error: "No response body from Groq API",
          modelTested: modelId,
        };
      }

      const { value } = await reader.read();
      const content = new TextDecoder().decode(value);

      return {
        success: true,
        message: `Successfully connected to Groq API using model: ${modelId}. Response preview: ${content.substring(0, 100)}...`,
        modelTested: modelId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error connecting to Groq API: ${error instanceof Error ? error.message : String(error)}`,
        modelTested: args.modelId,
      };
    }
  },
});

// Public action to test all configured Groq models
export const testAllGroqModels = action({
  args: {},
  returns: v.array(v.object({
    model: v.string(),
    success: v.boolean(),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
  })),
  handler: async (ctx): Promise<Array<{
    model: string;
    success: boolean;
    message?: string;
    error?: string;
  }>> => {
    const results: Array<{
      model: string;
      success: boolean;
      message?: string;
      error?: string;
    }> = [];
    
    const groqModels = Object.values(MODELS).filter(model => shouldUseGroq(model));
    
    for (const model of groqModels) {
      try {
        const result: {
          success: boolean;
          message?: string;
          error?: string;
          modelTested?: string;
        } = await ctx.runAction(internal.testGroq.testGroqConnection, { modelId: model });
        
        results.push({
          model,
          success: result.success,
          message: result.message,
          error: result.error,
        });
      } catch (error) {
        results.push({
          model,
          success: false,
          error: `Failed to test model: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
    
    return results;
  },
});
