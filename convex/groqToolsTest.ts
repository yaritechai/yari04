"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { streamGroqCompletion, shouldUseGroq } from "./lib/groqClient";
import { MODELS, getModelParameters } from "./modelRouter";

// Test action to verify Groq API access to tools
export const testGroqWithTools = action({
  args: {
    modelId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
    modelTested: v.optional(v.string()),
    toolsTest: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return {
          success: false,
          error: "GROQ_API_KEY environment variable is not set. Please set it with: npx convex env set GROQ_API_KEY=your_api_key",
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
      
      // Test system prompt with tools
      const systemPrompt = `You are a helpful AI assistant with access to various tools.`;
      
      const toolsPrompt = `
## Available Tools:
1. generate_image - Create images from text descriptions
2. edit_image - Edit existing images
3. generate_csv - Create downloadable CSV files
4. generate_table - Create formatted tables with data
5. plan_task - Create task checklists
6. gather_research - Search the web for information
7. complete_task - Mark tasks as complete

When you need to use a tool, output a JSON object with the tool name and arguments.
Example: {"tool": "generate_image", "args": {"prompt": "a beautiful sunset"}}
`;

      const testPrompt = "Please list all the tools you have access to and briefly explain what each one does. Then, show me how you would call the generate_image tool to create an image of a mountain landscape.";
      
      const response = await streamGroqCompletion({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt + toolsPrompt },
          { role: "user", content: testPrompt }
        ],
        temperature: modelParams.temperature,
        max_tokens: 1000,
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

      // Read the full response to check tool understanding
      const reader = response.body?.getReader();
      if (!reader) {
        return {
          success: false,
          error: "No response body from Groq API",
          modelTested: modelId,
        };
      }

      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
      }

      return {
        success: true,
        message: `Successfully tested ${modelId} with tools prompt`,
        modelTested: modelId,
        toolsTest: fullResponse.substring(0, 1500) + (fullResponse.length > 1500 ? "..." : ""),
      };
    } catch (error) {
      return {
        success: false,
        error: `Error testing Groq with tools: ${error instanceof Error ? error.message : String(error)}`,
        modelTested: args.modelId,
      };
    }
  },
});
