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
            ? 'bg-card text-muted-foreground border-border' 
            : 'bg-muted text-muted-foreground border-border'
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
                  ? 'hover:bg-muted text-muted-foreground hover:text-foreground' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            
            {onOpenInFragment && (
              <button
                onClick={handleOpenInFragment}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-muted text-muted-foreground hover:text-foreground' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Expand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Code Content */}
      <div className={`relative ${compact ? 'rounded-lg' : 'rounded-b-lg'} overflow-hidden`}>
        <pre className={`p-3 text-xs sm:text-sm font-mono overflow-x-auto scrollbar-thin ${
          isDarkMode 
            ? 'bg-card text-foreground' 
            : 'bg-card text-foreground'
        } ${compact ? 'max-h-48' : ''}`}>
          <code className="block">{code}</code>
        </pre>
        
        {/* Copy button overlay for compact mode */}
        {compact && (
          <button
            onClick={copyToClipboard}
            className={`absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all opacity-0 group-hover:opacity-100 ${
              isDarkMode 
                ? 'bg-card/90 text-muted-foreground hover:bg-muted' 
                : 'bg-card/90 text-muted-foreground hover:bg-muted'
            } backdrop-blur-sm border ${
              isDarkMode ? 'border-border' : 'border-border'
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
