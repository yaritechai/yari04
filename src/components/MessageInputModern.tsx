import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PromptInputBox } from "./ui/ai-prompt-box";
import { useTheme } from "../contexts/ThemeContext";

interface MessageInputModernProps {
  conversationId: Id<"conversations"> | null;
  isGenerating: boolean;
  onTitleUpdate: (title: string) => void;
  defaultWebSearch?: boolean;
  isFirstMessage?: boolean;
  onConversationCreated?: (conversationId: Id<"conversations">) => void;
}

export function MessageInputModern({ 
  conversationId, 
  isGenerating, 
  onTitleUpdate, 
  defaultWebSearch = false,
  isFirstMessage = false,
  onConversationCreated
}: MessageInputModernProps) {
  const [webSearchEnabled, setWebSearchEnabled] = useState(defaultWebSearch);
  const { isDarkMode } = useTheme();
  
  const sendMessage = useMutation(api.messages.send);
  const createConversation = useMutation(api.conversations.create);
  const generateSmartTitle = useMutation(api.conversations.generateSmartTitle);
  const uploadFile = useMutation(api.files.generateUploadUrl);
  const preferences = useQuery(api.preferences.get, {}) || {};

  const handleSend = async (message: string, files?: File[]) => {
    if (!message.trim() && (!files || files.length === 0)) return;

    let currentConversationId = conversationId;

    // Create new conversation if none exists
    if (!currentConversationId) {
      currentConversationId = await createConversation({
        title: "New Chat",
        model: (preferences as any).defaultModel || "gpt-4o-mini",
        systemPrompt: (preferences as any).systemPrompt,
        temperature: (preferences as any).temperature,
      });
      
      // Notify parent component about the new conversation
      onConversationCreated?.(currentConversationId);
    }

    try {
      // Handle file uploads
      let attachments: Array<{ fileId: Id<"_storage">; fileName: string; fileType: string; fileSize: number }> = [];
      
      if (files && files.length > 0) {
        for (const file of files) {
          // Generate upload URL
          const uploadUrl = await uploadFile();
          
          // Upload file
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          
          if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
          }
          
          const { storageId } = await result.json();
          
          attachments.push({
            fileId: storageId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          });
        }
      }

      // Determine if web search is enabled
      const requiresWebSearch = message.toLowerCase().includes('[search:') || webSearchEnabled;

      // Send the message
      await sendMessage({
        conversationId: currentConversationId,
        content: message,
        attachments: attachments.length > 0 ? attachments : undefined,
        requiresWebSearch,
      });

      // Generate smart title for first message
      if (isFirstMessage && message.trim()) {
        await generateSmartTitle({
          conversationId: currentConversationId,
          firstMessage: message.trim(),
        });
      }

    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleWebSearchToggle = (enabled: boolean) => {
    setWebSearchEnabled(enabled);
  };

  return (
    <div className="w-full px-4 pb-4">
      <div className="max-w-4xl mx-auto">
        <PromptInputBox
          onSend={handleSend}
          isLoading={isGenerating}
          placeholder={conversationId ? "Type your message..." : "Start a new conversation..."}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={handleWebSearchToggle}
          className="w-full"
        />
      </div>
    </div>
  );
}
