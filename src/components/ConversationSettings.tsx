import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../contexts/ThemeContext";

interface ConversationSettingsProps {
  conversation: {
    _id: Id<"conversations">;
    title: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
  };
  onClose: () => void;
}

export function ConversationSettings({ conversation, onClose }: ConversationSettingsProps) {
  const [title, setTitle] = useState(conversation.title);
  const [model, setModel] = useState(conversation.model || "openai/gpt-5");
  const [systemPrompt, setSystemPrompt] = useState(conversation.systemPrompt || "");
  const [temperature, setTemperature] = useState(conversation.temperature || 0.7);
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const updateConversation = useMutation(api.conversations.update);

  // Updated model options - GPT-5 primary via OpenRouter
  const modelOptions = [
    { value: "openai/gpt-5", label: "GPT-5", description: "Primary model via OpenRouter" },
    { value: "z-ai/glm-4.5-air", label: "GLM-4.5 Air", description: "Advanced thinking & reasoning" },
    { value: "z-ai/glm-4-32b", label: "GLM-4 32B", description: "Deep research & analysis" },
    { value: "z-ai/glm-4.5", label: "GLM-4.5", description: "Coding & web development" },
    { value: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Fast summarization & titles" },
    // Legacy options
    { value: "openai/gpt-4o", label: "GPT-4o", description: "Most capable model (legacy)" },
    { value: "openai/gpt-4o-mini", label: "GPT-4o Mini", description: "Fast and efficient (legacy)" },
  ];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateConversation({
        conversationId: conversation._id,
        title: title.trim() || "Untitled Chat",
        model,
        systemPrompt: systemPrompt.trim() || undefined,
        temperature,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Conversation Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conversation Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-700 text-white placeholder-gray-400"
              placeholder="Enter conversation title"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-700 text-white"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Choose the AI model that best fits your needs. Different models have different capabilities and costs.
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>More Focused (0)</span>
              <span>Balanced (1)</span>
              <span>More Creative (2)</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Lower values make responses more focused and deterministic. Higher values make them more creative and varied.
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-gray-700 text-white placeholder-gray-400"
              placeholder="Enter custom instructions for the AI (optional)"
            />
            <p className="text-xs text-gray-400 mt-1">
              System prompts help define the AI's behavior and personality for this conversation.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-gray-750">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
