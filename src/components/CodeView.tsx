import React, { useState } from "react";
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
    color: isDarkMode ? 'white' : '#374151',
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
    <div className="flex-1 flex items-center justify-center p-8">
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
                0 10px 20px 0 ${isDarkMode ? '#fff' : '#6b7280'} inset,
                0 20px 30px 0 ${isDarkMode ? '#ad5fff' : '#8b5cf6'} inset,
                0 60px 60px 0 ${isDarkMode ? '#471eec' : '#7c3aed'} inset;
            }
            50% {
              transform: rotate(270deg);
              box-shadow:
                0 10px 20px 0 ${isDarkMode ? '#fff' : '#6b7280'} inset,
                0 20px 10px 0 ${isDarkMode ? '#d60a47' : '#dc2626'} inset,
                0 40px 60px 0 ${isDarkMode ? '#311e80' : '#6366f1'} inset;
            }
            100% {
              transform: rotate(450deg);
              box-shadow:
                0 10px 20px 0 ${isDarkMode ? '#fff' : '#6b7280'} inset,
                0 20px 30px 0 ${isDarkMode ? '#ad5fff' : '#8b5cf6'} inset,
                0 60px 60px 0 ${isDarkMode ? '#471eec' : '#7c3aed'} inset;
            }
          }

          @keyframes loader-letter-anim {
            0%, 100% {
              opacity: 0.4;
              transform: translateY(0);
            }
            20% {
              opacity: 1;
              transform: scale(1.15);
            }
            40% {
              opacity: 0.7;
              transform: translateY(0);
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

  // Show loading animation while streaming - don't show partial content during generation
  if (data?.isStreaming) {
    return <GeneratingLoadingAnimation isDarkMode={isDarkMode} />;
  }

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
        <div className="flex items-center gap-2">
          {canPreview() && (
            <button
              onClick={handleTogglePreview}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${isDarkMode ? 'hover:bg-neutral-800 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
              title={isPreviewMode ? "Show Code" : "Show Preview"}
            >
              {isPreviewMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Code
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </>
              )}
            </button>
          )}
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
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={`relative z-50 p-1.5 rounded transition-colors ${
                isDarkMode 
                  ? 'hover:bg-neutral-800 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
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
      <div className="flex-1 overflow-auto scrollbar-thin">
        {isPreviewMode && canPreview() ? (
          // Preview Mode - render as HTML
          <div className="h-full">
            <iframe
              srcDoc={data.code}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title="Code Preview"
            />
          </div>
        ) : (
          // Code Mode - show syntax highlighted code
          <pre className={`p-4 text-sm font-mono leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            <code>{data.code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
