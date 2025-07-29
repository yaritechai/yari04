import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface DocumentCanvasProps {
  data?: {
    title?: string;
    content?: string;
    type?: 'text' | 'markdown' | 'drawing';
  };
}

export function DocumentCanvas({ data }: DocumentCanvasProps) {
  const { isDarkMode } = useTheme();
  const [content, setContent] = useState(data?.content || '');
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (data?.content) {
      setContent(data.content);
    }
  }, [data?.content]);

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save the content
    console.log('Saving content:', content);
  };

  const handleCancel = () => {
    setContent(data?.content || '');
    setIsEditing(false);
  };

  if (!data) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} p-8`}>
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <p>No document to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Document Actions */}
      <div className={`flex items-center justify-between p-3 ${isDarkMode ? '' : 'border-gray-200 border-b'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {data.type || 'text'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className={`px-3 py-1.5 text-sm ${isDarkMode ? 'hover:bg-neutral-900 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${isDarkMode ? 'hover:bg-neutral-900 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full h-full resize-none border-0 outline-none ${isDarkMode ? 'bg-transparent text-gray-300' : 'bg-transparent text-gray-800'} font-mono text-sm leading-relaxed`}
            placeholder="Start typing..."
            autoFocus
          />
        ) : (
          <div className={`whitespace-pre-wrap font-mono text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            {content || (
              <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} italic`}>
                No content yet. Click Edit to add content.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
