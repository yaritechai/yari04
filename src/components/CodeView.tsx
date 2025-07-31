import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface CodeViewProps {
  data?: {
    code?: string;
    language?: string;
    filename?: string;
    isStreaming?: boolean;
  };
  onClose?: () => void;
}

// Beautiful loading animation component
const GeneratingLoadingAnimation = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const loaderWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '180px',
    height: '180px',
    fontFamily: '"Inter", sans-serif',
    fontSize: '1.2em',
    fontWeight: 300,
    color: 'var(--foreground)',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    userSelect: 'none'
  };

  const loaderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    animation: 'loader-rotate 2s linear infinite',
    zIndex: 0
  };

  const letterStyle: React.CSSProperties = {
    display: 'inline-block',
    opacity: 0.4,
    transform: 'translateY(0)',
    animation: 'loader-letter-anim 2s infinite',
    zIndex: 1,
    borderRadius: '50ch',
    border: 'none'
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background rounded-lg">
      <div style={loaderWrapperStyle}>
        <span style={{...letterStyle, animationDelay: '0s'}}>G</span>
        <span style={{...letterStyle, animationDelay: '0.1s'}}>e</span>
        <span style={{...letterStyle, animationDelay: '0.2s'}}>n</span>
        <span style={{...letterStyle, animationDelay: '0.3s'}}>e</span>
        <span style={{...letterStyle, animationDelay: '0.4s'}}>r</span>
        <span style={{...letterStyle, animationDelay: '0.5s'}}>a</span>
        <span style={{...letterStyle, animationDelay: '0.6s'}}>t</span>
        <span style={{...letterStyle, animationDelay: '0.7s'}}>i</span>
        <span style={{...letterStyle, animationDelay: '0.8s'}}>n</span>
        <span style={{...letterStyle, animationDelay: '0.9s'}}>g</span>
        <div style={loaderStyle}></div>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes loader-rotate {
            0% {
              transform: rotate(90deg);
              box-shadow:
                0 10px 20px 0 var(--muted-foreground) inset,
                0 20px 30px 0 #f9c313 inset,
                0 60px 60px 0 #fef9c3 inset;
            }
            50% {
              transform: rotate(270deg);
              box-shadow:
                0 10px 20px 0 var(--muted-foreground) inset,
                0 20px 10px 0 #eab308 inset,
                0 40px 60px 0 #f9c313 inset;
            }
            100% {
              transform: rotate(450deg);
              box-shadow:
                0 10px 20px 0 var(--muted-foreground) inset,
                0 20px 30px 0 #f9c313 inset,
                0 60px 60px 0 #fef9c3 inset;
            }
          }
          
          @keyframes loader-letter-anim {
            0%, 100% {
              opacity: 0.4;
              transform: translateY(0);
            }
            50% {
              opacity: 1;
              transform: translateY(-10px);
              color: #f9c313;
              text-shadow: 0 0 10px rgba(249, 195, 19, 0.5);
            }
          }
        `
      }} />
    </div>
  );
};

export function CodeView({ data, onClose }: CodeViewProps) {
  const { isDarkMode } = useTheme();
  const [copied, setCopied] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const codeContentRef = useRef<HTMLDivElement>(null);
  const preElementRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (data?.isStreaming && codeContentRef.current) {
      const scrollToBottom = () => {
        if (codeContentRef.current) {
          codeContentRef.current.scrollTop = codeContentRef.current.scrollHeight;
        }
      };
      
      // Scroll immediately and then periodically while streaming
      scrollToBottom();
      const interval = setInterval(scrollToBottom, 100);
      
      return () => clearInterval(interval);
    }
  }, [data?.isStreaming, data?.code]);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (data?.code && !data?.isStreaming && preElementRef.current) {
      preElementRef.current.scrollTop = preElementRef.current.scrollHeight;
    }
  }, [data?.code, data?.isStreaming]);

  const handleCopy = async () => {
    if (data?.code) {
      try {
        await navigator.clipboard.writeText(data.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  const canPreview = () => {
    const lang = data?.language?.toLowerCase();
    return lang === 'html' || lang === 'css' || lang === 'javascript' || lang === 'js' || 
           (data?.code && (data.code.includes('<html') || data.code.includes('<!DOCTYPE')));
  };

  const handleTogglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClose) {
      onClose();
    }
  };

  if (!data?.code && !data?.isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 md:p-8 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">💻</div>
          <p className="text-sm md:text-base">No code to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-background rounded-lg overflow-hidden">
      {/* Show loading animation while streaming */}
      {data?.isStreaming && <GeneratingLoadingAnimation isDarkMode={isDarkMode} />}
      
      {/* Code Actions Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <div className="px-2 py-1 text-xs font-mono rounded-md bg-muted text-muted-foreground flex-shrink-0">
            {data?.language || 'text'}
          </div>
          {data?.filename && (
            <span className="text-sm text-foreground truncate">
              {data.filename}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {canPreview() && (
            <button
              onClick={handleTogglePreview}
              className={`px-2 md:px-3 py-1.5 text-xs rounded-md transition-colors ${
                isPreviewMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
              title={isPreviewMode ? "Show code" : "Preview HTML"}
            >
              {isPreviewMode ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
          
          <button
            onClick={handleCopy}
            disabled={!data?.code}
            className={`px-2 md:px-3 py-1.5 text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              copied
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            }`}
            title="Copy code"
          >
            {copied ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          
          {onClose && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Close code view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Code Content */}
      {!data?.isStreaming && data?.code && (
        <div 
          ref={codeContentRef}
          className="flex-1 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border rounded-b-lg"
        >
          {isPreviewMode && canPreview() ? (
            // Preview Mode - render as HTML
            <div className="h-full rounded-b-lg overflow-hidden">
              <iframe
                srcDoc={data.code}
                className="w-full h-full border-0 rounded-b-lg"
                sandbox="allow-scripts allow-same-origin"
                title="Code Preview"
              />
            </div>
          ) : (
            // Code Mode - show syntax highlighted code
            <pre 
              ref={preElementRef}
              className="p-3 md:p-4 text-xs md:text-sm font-mono leading-relaxed text-foreground bg-background m-0 h-full overflow-auto rounded-b-lg"
              style={{ 
                tabSize: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              <code className="block">{data.code}</code>
            </pre>
          )}
        </div>
      )}
      
      {/* Streaming indicator when code is being generated */}
      {data?.isStreaming && data?.code && (
        <div 
          ref={codeContentRef}
          className="flex-1 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border rounded-b-lg relative"
        >
          <pre 
            ref={preElementRef}
            className="p-3 md:p-4 text-xs md:text-sm font-mono leading-relaxed text-foreground bg-background m-0 h-full overflow-auto rounded-b-lg"
            style={{ 
              tabSize: 2,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            <code className="block">{data.code}</code>
            {/* Streaming cursor */}
            <span className="inline-block w-2 h-4 ml-1 animate-pulse rounded-sm" style={{
              backgroundColor: '#f9c313',
              boxShadow: '0 0 8px rgba(249, 195, 19, 0.6)'
            }}></span>
          </pre>
        </div>
      )}
    </div>
  );
}
