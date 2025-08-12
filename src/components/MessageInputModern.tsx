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
  const sendMessageNoStream = useMutation(api.messages.sendWithoutStreaming);
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
          // Always upload the file so it is attached to the conversation for history & model context
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

      // Determine if web search is enabled
      const requiresWebSearch = message.toLowerCase().includes('[search:') || webSearchEnabled;

      // If the intent is Edit (via [Edit: ...]) and exactly one image was attached, also call editImage explicitly.
      const editMatch = message.trim().match(/^\[Edit:\s*(.+)\]$/i);
      if (editMatch && attachments.length === 1 && attachments[0].fileType.startsWith('image/')) {
        // Convert the attached image to base64 for the edit API
        // We use the original File as well if available in `files` argument
        if (files && files.length === 1 && files[0].type.startsWith('image/')) {
          const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const b64 = await toBase64(files[0]);
          await editImage({ prompt: editMatch[1], imageBase64: b64 });
        }
      }

      // Get user's actual timezone from browser
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Send the message
      const isEditIntent = /^\[Edit:\s*.+\]$/i.test(message.trim());
      if (isEditIntent) {
        // Log the user message without triggering assistant streaming; the edit API will produce the assistant output
        await sendMessageNoStream({
          conversationId: currentConversationId,
          content: message,
          attachments: attachments.length > 0 ? attachments : undefined,
          userTimezone,
        });
      } else {
        await sendMessage({
          conversationId: currentConversationId,
          content: message,
          attachments: attachments.length > 0 ? attachments : undefined,
          requiresWebSearch,
          userTimezone,
        });
      }

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
