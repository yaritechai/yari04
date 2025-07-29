import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface CodeBlockProps {
  code: string;
  language: string;
  onOpenInFragment?: (data: { code: string; language: string }) => void;
  compact?: boolean;
}

export function CodeBlock({ code, language, onOpenInFragment, compact = false }: CodeBlockProps) {
  const { isDarkMode } = useTheme();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleOpenInFragment = () => {
    onOpenInFragment?.({ code, language });
  };

  return (
    <div className={`relative group ${compact ? '' : 'my-3 sm:my-4'}`}>
      {/* Header */}
      {!compact && (
        <div className={`flex items-center justify-between px-3 py-2 text-xs font-medium border-b ${
          isDarkMode 
            ? 'bg-gray-800 text-gray-300 border-gray-700' 
            : 'bg-gray-100 text-gray-700 border-gray-200'
        }`}>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="ml-2">{language}</span>
          </span>
          
          <div className="flex items-center gap-1">
            <button
              onClick={copyToClipboard}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
              }`}
              title="Copy code"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            
            {onOpenInFragment && (
              <button
                onClick={handleOpenInFragment}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                }`}
                title="Open in panel"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Code Content */}
      <div className={`relative ${compact ? 'rounded-lg' : 'rounded-b-lg'} overflow-hidden`}>
        <pre className={`p-3 text-xs sm:text-sm font-mono overflow-x-auto scrollbar-thin ${
          isDarkMode 
            ? 'bg-gray-900 text-gray-100' 
            : 'bg-gray-50 text-gray-900'
        } ${compact ? 'max-h-48' : ''}`}>
          <code className="block">{code}</code>
        </pre>
        
        {/* Copy button overlay for compact mode */}
        {compact && (
          <button
            onClick={copyToClipboard}
            className={`absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all opacity-0 group-hover:opacity-100 ${
              isDarkMode 
                ? 'bg-gray-800/90 text-gray-300 hover:bg-gray-700' 
                : 'bg-white/90 text-gray-700 hover:bg-gray-100'
            } backdrop-blur-sm border ${
              isDarkMode ? 'border-gray-600' : 'border-gray-200'
            }`}
            title="Copy code"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
