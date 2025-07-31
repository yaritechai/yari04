import { v } from "convex/values";

// Model configurations with task-specific routing
export const MODELS = {
  // General model - moonshotai/kimi-k2 for most conversations
  GENERAL_THINKING: "moonshotai/kimi-k2",
  
  // Research and analysis tasks - moonshotai/kimi-k2 with tool support
  RESEARCH: "moonshotai/kimi-k2",
  
  // Landing pages and coding tasks - moonshotai/kimi-k2 for tool compatibility
  CODING_LANDING: "moonshotai/kimi-k2",
  
  // Summarization and title generation - moonshotai/kimi-k2 for all tasks
  SUMMARIZATION: "moonshotai/kimi-k2",
  
  // Vision-capable models for image processing
  VISION: "anthropic/claude-3.5-sonnet", // Claude has excellent vision capabilities
  VISION_GPT: "openai/gpt-4-vision-preview", // Alternative vision model
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
  }
): keyof typeof MODELS {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for images first - vision takes priority
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
  }
): string {
  const taskType = detectTaskType(prompt, context);
  return MODELS[taskType];
}

// Model metadata for UI display
export const MODEL_METADATA = {
  "moonshotai/kimi-k2": {
    label: "Moonshot AI Kimi-K2",
    description: "Advanced AI model with tool support for research, coding, conversations, and more",
    category: "Universal",
    capabilities: ["thinking", "reasoning", "conversation", "research", "coding", "summarization", "tool-use"],
    icon: "🌙"
  },
  "anthropic/claude-3.5-sonnet": {
    label: "Claude 3.5 Sonnet",
    description: "Advanced vision-capable model for image analysis, OCR, and visual understanding",
    category: "Vision",
    capabilities: ["vision", "image-analysis", "ocr", "reasoning", "conversation", "coding"],
    icon: "👁️"
  },
  "openai/gpt-4-vision-preview": {
    label: "GPT-4 Vision",
    description: "OpenAI's vision model for image understanding and multimodal interactions",
    category: "Vision",
    capabilities: ["vision", "image-analysis", "ocr", "reasoning", "conversation"],
    icon: "🔍"
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
    
    case MODELS.VISION:
      return {
        temperature: 0.5,
        max_tokens: 4000,
        top_p: 0.9,
      };
    
    case MODELS.VISION_GPT:
      return {
        temperature: 0.5,
        max_tokens: 4000,
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