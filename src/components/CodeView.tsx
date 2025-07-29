import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface CodeViewProps {
  data?: {
    code?: string;
    language?: string;
    filename?: string;
  };
}

export function CodeView({ data }: CodeViewProps) {
  const { isDarkMode } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (data?.code) {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!data?.code) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} p-8`}>
        <div className="text-center">
          <div className="text-4xl mb-4">💻</div>
          <p>No code to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Code Actions */}
      <div className={`flex items-center justify-between p-3 ${isDarkMode ? 'border-neutral-700 border-b' : 'border-gray-200 border-b'}`}>
        <div className="flex items-center gap-2">
          {data.filename && (
            <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {data.filename}
            </span>
          )}
          {data.language && (
            <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-neutral-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {data.language}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${isDarkMode ? 'hover:bg-neutral-800 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <pre className={`p-4 text-sm font-mono leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
          <code>{data.code}</code>
        </pre>
      </div>
    </div>
  );
}
