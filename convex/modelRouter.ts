import { v } from "convex/values";

// Model configurations with task-specific routing
export const MODELS = {
  // General default model via OpenRouter (base model)
  GENERAL_THINKING: "openai/gpt-oss-120b",

  // Research and analysis
  RESEARCH: "openai/gpt-oss-120b",

  // Landing pages and coding tasks
  CODING_LANDING: "openai/gpt-oss-120b",

  // Summarization and title generation
  SUMMARIZATION: "openai/gpt-oss-120b",

  // Vision-capable models (keep a vision-capable chat model; edits go to BFL directly)
  VISION: "openai/gpt-5",
  VISION_GPT: "openai/gpt-5",

  // Data analysis for CSV/Excel files
  DATA_ANALYSIS: "openai/gpt-oss-120b",
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
  }
): string {
  const taskType = detectTaskType(prompt, context);
  return MODELS[taskType];
}

// Model metadata for UI display
export const MODEL_METADATA = {
  "openai/gpt-oss-120b": {
    label: "GPT-OSS 120B",
    description: "OpenAI OSS 120B model via OpenRouter, used as the base model for conversation, coding, research, and more",
    category: "Universal",
    capabilities: ["thinking", "reasoning", "conversation", "research", "coding", "summarization", "tool-use"],
    icon: "⚙️"
  },
  "anthropic/claude-3.5-sonnet": {
    label: "Claude 3.5 Sonnet",
    description: "Advanced vision-capable model for image analysis, OCR, visual understanding, and data analysis",
    category: "Vision & Data",
    capabilities: ["vision", "image-analysis", "ocr", "reasoning", "conversation", "coding", "data-analysis", "csv-excel"],
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
    ...(MODEL_METADATA as Record<string, any>)[modelId]
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
    
    case MODELS.DATA_ANALYSIS:
      return {
        temperature: 0.3,
        max_tokens: 6000,
        top_p: 0.8,
      };
    
    default:
      return {
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
      };
  }
} 