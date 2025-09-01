import { v } from "convex/values";

// Model configurations with task-specific routing using Groq
export const MODELS = {
  // General purpose models
  GENERAL_THINKING: "openai/gpt-5",
  RESEARCH: "openai/gpt-5",
  SUMMARIZATION: "openai/gpt-5",
  DATA_ANALYSIS: "openai/gpt-5",
  CODING_LANDING: "openai/gpt-5",
  // Moonshot AI model for specific tasks
  VISION: "moonshotai/kimi-k2-instruct",
  VISION_GPT: "moonshotai/kimi-k2-instruct",
} as const;

// Task type identification patterns
const TASK_PATTERNS = {
  // Research patterns
  research: [
    /research/i,
    /analyze/i,
    /analysis/i,
    /investigate/i,
    /study/i,
    /examine/i,
    /compare/i,
    /evaluate/i,
    /assessment/i,
    /review/i,
    /survey/i,
    /literature/i,
    /academic/i,
    /scientific/i,
    /data analysis/i,
    /market research/i,
  ],
  
  // Coding patterns
  coding: [
    /code/i,
    /programming/i,
    /develop/i,
    /implement/i,
    /function/i,
    /algorithm/i,
    /debug/i,
    /refactor/i,
    /optimize/i,
    /typescript/i,
    /javascript/i,
    /python/i,
    /react/i,
    /api/i,
    /database/i,
    /sql/i,
    /frontend/i,
    /backend/i,
    /component/i,
    /fix.*bug/i,
    /write.*code/i,
  ],
  
  // Landing page patterns
  landingPage: [
    /landing page/i,
    /website/i,
    /webpage/i,
    /html/i,
    /css/i,
    /design.*page/i,
    /create.*page/i,
    /build.*page/i,
    /marketing page/i,
    /promotional page/i,
    /sales page/i,
  ],
  
  // Summarization patterns
  summarization: [
    /summarize/i,
    /summary/i,
    /title/i,
    /headline/i,
    /brief/i,
    /overview/i,
    /recap/i,
    /digest/i,
    /abstract/i,
    /key points/i,
    /main points/i,
    /tldr/i,
    /tl;dr/i,
    /condensed/i,
    /short version/i,
  ],
  
  // Vision and image processing patterns
  vision: [
    /image/i,
    /photo/i,
    /picture/i,
    /screenshot/i,
    /analyze.*image/i,
    /describe.*image/i,
    /what.*see/i,
    /what.*this/i,
    /identify/i,
    /recognize/i,
    /read.*text/i,
    /ocr/i,
    /extract.*text/i,
    /visual/i,
    /diagram/i,
    /chart/i,
    /graph/i,
  ],
  
  // Data analysis patterns for CSV/Excel files
  dataAnalysis: [
    /analyze.*data/i,
    /csv/i,
    /excel/i,
    /spreadsheet/i,
    /data.*analysis/i,
    /statistics/i,
    /trends/i,
    /insights/i,
    /correlations/i,
    /patterns/i,
    /summarize.*data/i,
    /dashboard/i,
    /metrics/i,
    /kpi/i,
    /report/i,
    /visualization/i,
    /pivot/i,
    /aggregate/i,
  ],
};

// Special task detection for internal operations
export function detectTaskType(
  prompt: string,
  context?: {
    isLandingPage?: boolean;
    isReport?: boolean;
    isTitleGeneration?: boolean;
    isConversationSummary?: boolean;
    isCodeGeneration?: boolean;
    isResearchTask?: boolean;
    hasImages?: boolean; // New parameter for image detection
    hasDataFiles?: boolean; // New parameter for CSV/Excel detection
  }
): keyof typeof MODELS {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for data files first - data analysis takes priority when files are present
  if (context?.hasDataFiles) {
    return 'DATA_ANALYSIS';
  }
  
  // Check for images second - vision takes priority for image tasks
  if (context?.hasImages) {
    return 'VISION';
  }
  
  // Check context flags first (most reliable)
  if (context?.isTitleGeneration || context?.isConversationSummary) {
    return 'SUMMARIZATION';
  }
  
  if (context?.isLandingPage) {
    return 'CODING_LANDING';
  }
  
  if (context?.isCodeGeneration) {
    return 'CODING_LANDING';
  }
  
  if (context?.isResearchTask) {
    return 'RESEARCH';
  }
  
  // Pattern-based detection
  
  // Check for data analysis requests
  if (TASK_PATTERNS.dataAnalysis.some(pattern => pattern.test(lowerPrompt))) {
    return 'DATA_ANALYSIS';
  }
  
  // Check for vision requests
  if (TASK_PATTERNS.vision.some(pattern => pattern.test(lowerPrompt))) {
    return 'VISION';
  }
  
  // Check for summarization first (often explicit)
  if (TASK_PATTERNS.summarization.some(pattern => pattern.test(lowerPrompt))) {
    return 'SUMMARIZATION';
  }
  
  // Check for landing page requests
  if (TASK_PATTERNS.landingPage.some(pattern => pattern.test(lowerPrompt))) {
    return 'CODING_LANDING';
  }
  
  // Check for coding requests
  if (TASK_PATTERNS.coding.some(pattern => pattern.test(lowerPrompt))) {
    return 'CODING_LANDING';
  }
  
  // Check for research requests
  if (TASK_PATTERNS.research.some(pattern => pattern.test(lowerPrompt))) {
    return 'RESEARCH';
  }
  
  // Default to general thinking model for complex conversations
  return 'GENERAL_THINKING';
}

// Get the appropriate model for a task
export function getModelForTask(
  prompt: string,
  context?: {
    isLandingPage?: boolean;
    isReport?: boolean;
    isTitleGeneration?: boolean;
    isConversationSummary?: boolean;
    isCodeGeneration?: boolean;
    isResearchTask?: boolean;
    hasImages?: boolean; // New parameter for image detection
    hasDataFiles?: boolean; // New parameter for CSV/Excel detection
    conversationTokens?: number; // Hint based on convo length
    needsSpeed?: boolean; // Prefer smaller faster models
  }
): string {
  const taskType = detectTaskType(prompt, context);
  const primary = MODELS[taskType];

  // Lightweight heuristics to bias selection based on conversation conditions
  // If very long conversation and not vision, prefer a model with larger context window
  // Do not override GPT-5 default; keep Groq as fallback path only.
  // If conversation is very long, we still keep GPT-5 but will expose fallbacks downstream.

  // If user prefers speed for simple asks, pick Gemma
  // Keep GPT-5 primary even when speed is requested; downstream can choose fallbacks if needed.

  return primary;
}

// Model metadata for UI display
export const MODEL_METADATA = {
  // Groq Models
  "groq/llama3-70b-8192": {
    label: "Llama 3 70B",
    description: "Meta's Llama 3 70B model via Groq for fast, high-quality responses across general tasks",
    category: "Universal",
    capabilities: ["thinking", "reasoning", "conversation", "research", "coding", "summarization", "tool-use"],
    icon: "🦙"
  },
  "groq/mixtral-8x7b-32768": {
    label: "Mixtral 8x7B",
    description: "Mixtral's MoE model via Groq with 32K context for research and data analysis",
    category: "Research",
    capabilities: ["thinking", "reasoning", "conversation", "research", "data-analysis", "summarization"],
    icon: "📊"
  },
  "groq/gemma-7b-it": {
    label: "Gemma 7B",
    description: "Google's Gemma 7B instruction-tuned model via Groq for efficient summarization",
    category: "Summarization",
    capabilities: ["reasoning", "conversation", "summarization"],
    icon: "💎"
  },
  "moonshotai/kimi-k2-instruct": {
    label: "Kimi K2",
    description: "Moonshot AI's Kimi K2 model via Groq for vision tasks",
    category: "Vision",
    capabilities: ["vision", "image-analysis", "reasoning", "conversation"],
    icon: "🌙"
  },
  // Legacy Models (kept for reference)
  "openai/gpt-5": {
    label: "GPT-5",
    description: "OpenAI's GPT-5 via OpenRouter. Default generalist.",
    category: "Universal",
    capabilities: ["thinking", "reasoning", "conversation", "research", "coding", "summarization", "tool-use", "vision"],
    icon: "🧠"
  },
  "openai/gpt-4-vision-preview": {
    label: "GPT-4 Vision",
    description: "OpenAI's vision model for image understanding",
    category: "Legacy",
    capabilities: ["vision", "image-analysis", "ocr", "reasoning", "conversation"],
    icon: "🔍"
  }
} as const;

// Get all available models for UI
export function getAllModels() {
  return Object.entries(MODELS).map(([taskType, modelId]) => ({
    value: modelId,
    taskType,
    ...(MODEL_METADATA as Record<string, any>)[modelId]
  }));
}

// Check if a model supports thinking mode
export function supportsThinking(modelId: string): boolean {
  // Both Gemini Flash and Kimi 2 support thinking mode
  return modelId === MODELS.GENERAL_THINKING || modelId === MODELS.CODING_LANDING;
}

// Get optimal parameters for each model
export function getModelParameters(modelId: string) {
  // Groq model parameters
  if (modelId.startsWith("groq/") || modelId.startsWith("moonshotai/")) {
    switch (modelId) {
      case "groq/llama3-70b-8192":
        return {
          temperature: 0.7,
          max_tokens: 8000,
          top_p: 0.9,
        };
      case "groq/mixtral-8x7b-32768":
        return {
          temperature: 0.7,
          max_tokens: 16000, // Conservative value for 32K context
          top_p: 0.9,
        };
      case "groq/gemma-7b-it":
        return {
          temperature: 0.8,
          max_tokens: 4000,
          top_p: 0.9,
        };
      case "moonshotai/kimi-k2-instruct":
        return {
          temperature: 0.6,
          max_tokens: 4096,
          top_p: 1.0,
        };
      default:
        // Default parameters for any other Groq model
        return {
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.9,
        };
    }
  }
  
  // Legacy OpenRouter models
  switch (modelId) {
    case "openai/gpt-5":
      return {
        temperature: 0.7,
        max_tokens: 12000,
        top_p: 0.9,
      };
    case "openai/gpt-4-vision-preview":
      return {
        temperature: 0.7,
        max_tokens: 12000,
        top_p: 0.9,
      };
    
    default:
      return {
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
      };
  }
} 

// Provide a prioritized list of fallback models if the primary fails
export function getFallbackModels(
  primary: string,
  opts?: { hasImages?: boolean; fast?: boolean }
): Array<string> {
  const fallbacks: Array<string> = [];
  const wantsVision = !!opts?.hasImages;
  const wantsFast = !!opts?.fast;

  // Prefer staying within Groq family first
  if (primary.startsWith("groq/")) {
    if (primary !== "groq/llama3-70b-8192") fallbacks.push("groq/llama3-70b-8192");
    if (primary !== "groq/mixtral-8x7b-32768") fallbacks.push("groq/mixtral-8x7b-32768");
    if (primary !== "groq/gemma-7b-it") fallbacks.push("groq/gemma-7b-it");
  }

  // For Moonshot models, use other Groq models as fallback
  if (primary.startsWith("moonshotai/")) {
    fallbacks.push("groq/llama3-70b-8192");
  }

  // For vision tasks
  if (wantsVision) {
    if (primary !== "moonshotai/kimi-k2-instruct") fallbacks.push("moonshotai/kimi-k2-instruct");
  }

  // For speed-optimized tasks
  if (wantsFast && primary !== "groq/gemma-7b-it") {
    fallbacks.push("groq/gemma-7b-it"); // Fastest Groq model
  }

  // Legacy fallbacks as last resort
  if (!primary.startsWith("openai/")) {
    fallbacks.push("openai/gpt-4o");
  }

  // Ensure we don't duplicate the primary
  return fallbacks.filter((m) => m !== primary);
}