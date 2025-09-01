"use node";

// Groq API client for streaming completions
export async function streamGroqCompletion({
  model,
  messages,
  temperature,
  max_tokens,
  top_p,
  apiKey,
}: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
  top_p: number;
  apiKey: string;
}) {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required");
  }

  // Extract the actual model name from the model string
  // Format can be either "groq/model-name" or just "model-name"
  const actualModel = model.includes("/") ? model.split("/")[1] : model;
  
  console.log(`🚀 Streaming response from Groq API with model: ${actualModel}`);
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages,
      model: actualModel,
      temperature,
      max_completion_tokens: max_tokens,
      top_p,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errorText}`);
  }

  return response;
}

// Check if a model should use Groq API
export function shouldUseGroq(modelId: string): boolean {
  return modelId.startsWith("groq/") || modelId.startsWith("moonshotai/");
}
