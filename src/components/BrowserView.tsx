import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface BrowserViewProps {
  data?: {
    url?: string;
    title?: string;
    content?: string;
    htmlContent?: string;
    isStreaming?: boolean;
  };
  onClose?: () => void;
}

// Beautiful loading animation component for HTML generation
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

export function BrowserView({ data, onClose }: BrowserViewProps) {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset error state when data changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(false);
  }, [data]);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current) {
      // Force iframe reload
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
        setIsLoading(false);
      }, 100);
    } else {
      // Simulate loading for srcDoc
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleOpenExternal = () => {
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const handleDownloadHTML = () => {
    if (data?.htmlContent) {
      const blob = new Blob([data.htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleOpenInNewTab = () => {
    if (data?.htmlContent) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(data.htmlContent);
        newWindow.document.close();
      }
    }
  };

  // Show loading animation while streaming - don't show partial content during generation
  if (data?.isStreaming) {
    return <GeneratingLoadingAnimation isDarkMode={isDarkMode} />;
  }

  if (!data?.url && !data?.htmlContent) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} p-8`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🌐</div>
          <p>No webpage to display</p>
          <p className="text-sm mt-2 opacity-75">
            Generate HTML content or provide a URL to view in the browser
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-neutral-900' : ''}`}>
      {/* Browser Controls */}
      <div className={`flex items-center gap-2 p-3 ${isDarkMode ? 'bg-neutral-800' : 'bg-neutral-50'} flex-shrink-0`}>
        {/* Traffic Light Buttons */}
        <div className="flex items-center gap-2 mr-3">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>

        {/* Navigation Controls */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={`p-2 ${isDarkMode ? 'hover:bg-neutral-700 text-gray-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'} rounded transition-colors disabled:opacity-50`}
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        {/* Address Bar */}
        <div className={`flex-1 px-3 py-2 text-sm font-mono ${isDarkMode ? 'bg-neutral-700 text-gray-300' : 'bg-white text-gray-700'} rounded truncate`}>
          {data.url || (data.htmlContent ? `${data.title || 'HTML Document'} (Sandbox)` : '')}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {data.htmlContent && (
            <>
              <button
                onClick={handleOpenInNewTab}
                className={`p-2 ${isDarkMode ? 'hover:bg-neutral-700 text-gray-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
                title="Open in New Tab"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button
                onClick={handleDownloadHTML}
                className={`p-2 ${isDarkMode ? 'hover:bg-neutral-700 text-gray-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
                title="Download HTML"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </>
          )}
          
          {data.url && (
            <button
              onClick={handleOpenExternal}
              className={`p-2 ${isDarkMode ? 'hover:bg-neutral-700 text-gray-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
              title="Open in External Browser"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}

          <button
            onClick={handleFullscreen}
            className={`p-2 ${isDarkMode ? 'hover:bg-neutral-700 text-gray-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              )}
            </svg>
          </button>

          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={`relative z-50 p-2 ${isDarkMode ? 'hover:bg-neutral-700 text-gray-300 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'} rounded transition-colors`}
              title="Close Browser View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-gray-400 bg-neutral-900' : 'text-gray-500 bg-neutral-50'}`}>
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        ) : hasError ? (
          <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-gray-400 bg-neutral-900' : 'text-gray-500 bg-neutral-50'}`}>
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="font-medium">Failed to load content</p>
              <p className="text-sm mt-2 opacity-75">
                There was an error loading the content
              </p>
              <button
                onClick={handleRefresh}
                className={`mt-4 px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                } transition-colors`}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : data.htmlContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={data.htmlContent}
            className="w-full h-full border-0"
            title={data.title || "HTML Document"}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            onLoad={() => setIsLoading(false)}
            onError={handleIframeError}
          />
        ) : data.url ? (
          <iframe
            ref={iframeRef}
            src={data.url}
            className="w-full h-full border-0"
            title={data.title || "Browser View"}
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
            onLoad={() => setIsLoading(false)}
            onError={handleIframeError}
            referrerPolicy="no-referrer"
          />
        ) : null}
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
