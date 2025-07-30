import { v } from "convex/values";

// Model configurations with task-specific routing
export const MODELS = {
  // General model - switchpoint/router for most conversations
  GENERAL_THINKING: "switchpoint/router",
  
  // Research and analysis tasks - use regular GPT-4o 
  RESEARCH: "openai/gpt-4o",
  
  // Landing pages and coding tasks - use latest GPT-4o
  CODING_LANDING: "openai/gpt-4o-2024-08-06",
  
  // Summarization and title generation - ultra fast
  SUMMARIZATION: "openai/gpt-4o-mini",
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
  }
): keyof typeof MODELS {
  const lowerPrompt = prompt.toLowerCase();
  
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
  }
): string {
  const taskType = detectTaskType(prompt, context);
  return MODELS[taskType];
}

// Model metadata for UI display
export const MODEL_METADATA = {
  "switchpoint/router": {
    label: "Switchpoint Router",
    description: "Intelligent model routing for optimal responses",
    category: "General",
    capabilities: ["thinking", "reasoning", "conversation", "routing"],
    icon: "🎯"
  },
  "openai/gpt-4o": {
    label: "GPT-4o Research", 
    description: "Deep research & analysis",
    category: "Research",
    capabilities: ["research", "analysis", "long-context"],
    icon: "🔬"
  },
  "openai/gpt-4o-2024-08-06": {
    label: "GPT-4o Code",
    description: "Coding & web development",
    category: "Development", 
    capabilities: ["coding", "web-dev", "landing-pages"],
    icon: "💻"
  },
  "openai/gpt-4o-mini": {
    label: "GPT-4o Mini",
    description: "Ultra-fast summarization",
    category: "Efficiency",
    capabilities: ["summarization", "titles", "speed"],
    icon: "⚡"
  }
} as const;

// Get all available models for UI
export function getAllModels() {
  return Object.entries(MODELS).map(([taskType, modelId]) => ({
    value: modelId,
    taskType,
    ...MODEL_METADATA[modelId]
  }));
}

// Check if a model supports thinking mode
export function supportsThinking(modelId: string): boolean {
  return modelId === MODELS.GENERAL_THINKING;
}

// Get optimal parameters for each model
export function getModelParameters(modelId: string) {
  switch (modelId) {
    case MODELS.GENERAL_THINKING:
      return {
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
      };
    
    case MODELS.RESEARCH:
      return {
        temperature: 0.3,
        max_tokens: 8000,
        top_p: 0.8,
      };
    
    case MODELS.CODING_LANDING:
      return {
        temperature: 0.2,
        max_tokens: 6000,
        top_p: 0.85,
      };
    
    case MODELS.SUMMARIZATION:
      return {
        temperature: 0.1,
        max_tokens: 1000,
        top_p: 0.7,
      };
    
    default:
      return {
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
      };
  }
} 