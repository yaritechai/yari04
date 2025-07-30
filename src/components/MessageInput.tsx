import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ModelRoutingInfo } from './ModelRoutingInfo';
import { useTheme } from "../contexts/ThemeContext";

interface MessageInputProps {
  conversationId: Id<"conversations">;
  isGenerating: boolean;
  onTitleUpdate: (title: string) => void;
  defaultWebSearch?: boolean;
  isFirstMessage?: boolean;
}

export function MessageInput({ 
  conversationId, 
  isGenerating, 
  onTitleUpdate,
  defaultWebSearch = false,
  isFirstMessage = false
}: MessageInputProps) {
  const { isDarkMode } = useTheme();
  const [input, setInput] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(defaultWebSearch);
  const [attachments, setAttachments] = useState<Array<{
    fileId: Id<"_storage">;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showModelRoutingInfo, setShowModelRoutingInfo] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  const conversation = useQuery(api.conversations.get, { conversationId });
  const sendMessage = useMutation(api.messages.send);
  const generateSmartTitle = useMutation(api.conversations.generateSmartTitle);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateConversationSettings = useMutation(api.conversations.updateSettings);

  // Updated model options - Now using intelligent task-based routing
  const modelOptions = [
    { value: "z-ai/glm-4.5-air", label: "GLM-4.5 Air", description: "Advanced thinking & reasoning", category: "General" },
    { value: "z-ai/glm-4-32b", label: "GLM-4 32B", description: "Deep research & analysis", category: "Research" },
    { value: "z-ai/glm-4.5", label: "GLM-4.5", description: "Coding & web development", category: "Development" },
    { value: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Fast summarization & titles", category: "Efficiency" },
    // Legacy options for manual selection
    { value: "openai/gpt-4o", label: "GPT-4o", description: "Most capable (legacy)", category: "Legacy" },
    { value: "openai/gpt-4o-mini", label: "GPT-4o Mini", description: "Fast & efficient (legacy)", category: "Legacy" },
  ];

  const currentModel = conversation?.model || "z-ai/glm-4.5-air";
  const currentModelInfo = modelOptions.find(m => m.value === currentModel) || modelOptions[0];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && isFirstMessage) {
      textareaRef.current.focus();
    }
  }, [isFirstMessage]);

  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelSelector]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const messageContent = input.trim();
    const messageAttachments = [...attachments];
    
    setInput("");
    setAttachments([]);
    setShowOptions(false);

    try {
      // Get user's actual timezone from browser
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const result = await sendMessage({
        conversationId,
        content: messageContent,
        requiresWebSearch: webSearchEnabled,
        userTimezone,
        attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
      });

      // Generate smart title if this is the first message
      if (isFirstMessage) {
        await generateSmartTitle({
          conversationId,
          firstMessage: messageContent,
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        // Generate upload URL
        const uploadUrl = await generateUploadUrl();
        
        // Upload file
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await response.json();

        // Add to attachments
        setAttachments(prev => [...prev, {
          fileId: storageId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }]);
      } catch (error) {
        console.error("File upload failed:", error);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleModelChange = async (modelValue: string) => {
    try {
      await updateConversationSettings({
        conversationId,
        model: modelValue,
      });
      setShowModelSelector(false);
    } catch (error) {
      console.error("Failed to update model:", error);
    }
  };

  const stopGeneration = () => {
    // This would need to be implemented in the backend
    console.log("Stop generation requested");
  };

  // Group models by category
  const groupedModels = modelOptions.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = [];
    }
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, typeof modelOptions>);

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-gray-700 max-w-32 truncate">{attachment.fileName}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Container */}
        <div 
          ref={containerRef}
          className={`relative ${isDarkMode ? 'bg-neutral-800/20' : 'bg-white/20'} border border-neutral-300/50 rounded-2xl shadow-sm transition-all duration-200 backdrop-blur-sm ${
            input.trim() || showOptions ? 'border-neutral-400/70 shadow-md' : 'hover:border-neutral-400/50'
          }`}
        >
          {/* Options Bar */}
          {showOptions && (
            <div className={`flex items-center justify-between px-4 py-2 border-b ${isDarkMode ? 'border-neutral-700/50 bg-neutral-800/10' : 'border-neutral-200/50 bg-neutral-50/30'} rounded-t-2xl`}>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webSearchEnabled}
                    onChange={(e) => setWebSearchEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1"
                  />
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Web search</span>
                </label>
              </div>

              {/* Model Selector */}
              <div className="relative" ref={modelSelectorRef}>
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isGenerating}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{currentModelInfo.label}</span>
                  <svg className={`w-4 h-4 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Model Dropdown */}
                {showModelSelector && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-2">Select AI Model</div>
                      {Object.entries(groupedModels).map(([category, models]) => (
                        <div key={category} className="mb-3 last:mb-0">
                          <div className="text-xs font-medium text-gray-400 px-2 py-1 uppercase tracking-wide">
                            {category}
                          </div>
                          {models.map((model) => (
                            <button
                              key={model.value}
                              onClick={() => handleModelChange(model.value)}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors ${
                                currentModel === model.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{model.label}</div>
                                  <div className="text-xs text-gray-500">{model.description}</div>
                                </div>
                                {currentModel === model.value && (
                                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-end gap-2 p-3">
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isGenerating}
              title="Attach files"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowOptions(true)}
                placeholder={
                  isFirstMessage 
                    ? "Message ChatGPT"
                    : "Message ChatGPT"
                }
                className="w-full resize-none border-0 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 text-base leading-6 max-h-[200px] min-h-[24px] py-0"
                rows={1}
                disabled={isGenerating}
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent'
                }}
              />
            </div>

            {/* Options Button */}
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                showOptions 
                  ? 'text-gray-700 bg-gray-100' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="More options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Send/Stop Button */}
            {isGenerating ? (
              <button
                onClick={stopGeneration}
                className="flex-shrink-0 p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                title="Stop generating"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                  input.trim()
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-2">
          <span>Intelligent model routing enabled.</span>
          <button
            onClick={() => setShowModelRoutingInfo(true)}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            Learn more
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,text/*,.pdf,.doc,.docx"
        />

        {/* Model Routing Info Modal */}
        <ModelRoutingInfo 
          isOpen={showModelRoutingInfo} 
          onClose={() => setShowModelRoutingInfo(false)} 
        />
      </div>
    </div>
  );
}
