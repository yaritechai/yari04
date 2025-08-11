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
  onOpenFragment?: (fragment: string, data?: any) => void;
}

export function MessageInputModern({ 
  conversationId, 
  isGenerating, 
  onTitleUpdate, 
  defaultWebSearch = false,
  isFirstMessage = false,
  onConversationCreated,
  onOpenFragment
}: MessageInputModernProps) {
  const [webSearchEnabled, setWebSearchEnabled] = useState(defaultWebSearch);
  const { isDarkMode } = useTheme();
  
  const sendMessage = useMutation(api.messages.send);
  const createConversation = useMutation(api.conversations.create);
  const generateSmartTitle = useMutation(api.conversations.generateSmartTitle);
  const uploadFile = useMutation(api.files.generateUploadUrl);
  const editImage = useMutation(api.ai.editImage);
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
          // If user selects exactly one image file and message starts with [Edit: ...], call image edit
          if (
            files.length === 1 &&
            file.type.startsWith("image/") &&
            /^\[Edit:\s*.+\]/i.test(message.trim())
          ) {
            // Extract prompt inside [Edit: ...]
            const prompt = message.trim().replace(/^\[Edit:\s*(.+)\]$/i, "$1");
            const toBase64 = (blob: Blob) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            const b64 = await toBase64(file);
            // Kick off edit; when complete, the backend will send the assistant message with the image URL
            await editImage({ prompt, imageBase64: b64 });
          } else {
            // Generate upload URL and attach as usual
            const uploadUrl = await uploadFile();
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
      }

      // Determine if web search is enabled
      const requiresWebSearch = message.toLowerCase().includes('[search:') || webSearchEnabled;

      // Get user's actual timezone from browser
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Send the message
      await sendMessage({
        conversationId: currentConversationId,
        content: message,
        attachments: attachments.length > 0 ? attachments : undefined,
        requiresWebSearch,
        userTimezone,
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
          onOpenFragment={onOpenFragment}
          className="w-full"
        />
      </div>
    </div>
  );
}
