import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CodeView } from './CodeView';
import { BrowserView } from './BrowserView';
import { SearchResults } from './SearchResults';
import { DocumentEditor } from './DocumentEditor';
import { ProductionMCPIntegration } from './ProductionMCPIntegration';
import { IntegrationsPanel } from './IntegrationsPanel';
import { AgentBuilderInterface } from './AgentBuilderInterface';

export type FragmentType = 'code' | 'browser' | 'search' | 'document' | 'mcp' | 'integrations' | 'agent-builder';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  activeFragment: FragmentType | null;
  onFragmentChange: (fragment: FragmentType | null, data?: any) => void;
  fragmentData?: any;
  isTransitioning?: boolean;
}

// Beautiful loading animation component exactly as user provided
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
    color: 'white',
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
    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '60px', pointerEvents: 'none' }}>
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
                0 10px 20px 0 #fff inset,
                0 20px 30px 0 #f9c313 inset,
                0 60px 60px 0 #471eec inset;
            }
            50% {
              transform: rotate(270deg);
              box-shadow:
                0 10px 20px 0 #fff inset,
                0 20px 10px 0 #d60a47 inset,
                0 40px 60px 0 #311e80 inset;
            }
            100% {
              transform: rotate(450deg);
              box-shadow:
                0 10px 20px 0 #fff inset,
                0 20px 30px 0 #f9c313 inset,
                0 60px 60px 0 #471eec inset;
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

export function RightPanel({
  isOpen,
  onToggle,
  width,
  onWidthChange,
  activeFragment,
  onFragmentChange,
  fragmentData,
  isTransitioning
}: RightPanelProps) {
  const { isDarkMode } = useTheme();
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable resize on mobile
    e.preventDefault();
    setIsResizing(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  useEffect(() => {
    if (isMobile) return; // Skip resize logic on mobile
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 400;
      const maxWidth = Math.min(1400, window.innerWidth * 0.8);
      
      onWidthChange(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange, isMobile]);

  const renderContent = () => {
    if (!activeFragment || isTransitioning) {
      return <GeneratingLoadingAnimation isDarkMode={isDarkMode} />;
    }

    switch (activeFragment) {
      case 'code':
        return (
          <CodeView
            data={{
              code: fragmentData?.code || '',
              language: fragmentData?.language || 'javascript',
              filename: fragmentData?.title,
              isStreaming: fragmentData?.isStreaming
            }}
          />
        );
      case 'browser':
        return (
          <BrowserView
            data={{
              htmlContent: fragmentData?.htmlContent || '',
              title: fragmentData?.title || 'Preview',
              isStreaming: fragmentData?.isStreaming
            }}
          />
        );
      case 'search':
        return (
          <SearchResults
            data={{
              results: fragmentData?.results || [],
              query: fragmentData?.query
            }}
          />
        );
      case 'document':
        return (
          <DocumentEditor
            key={`doc-${fragmentData?.title || 'untitled'}`} // Force re-mount with different titles
            initialContent={fragmentData?.content || ''}
            title={fragmentData?.title || 'New Document'}
          />
        );
      case 'mcp':
        return <ProductionMCPIntegration />;
      case 'integrations':
        return <IntegrationsPanel onClose={() => onFragmentChange('integrations', null)} />;
      case 'agent-builder':
        return <AgentBuilderInterface conversationId={null} onTitleUpdate={() => {}} />;
      default:
        return null;
    }
  };

  const getFragmentTitle = () => {
    switch (activeFragment) {
      case 'code':
        return fragmentData?.title || 'Code View';
      case 'browser':
        return fragmentData?.title || 'Browser Preview';
      case 'search':
        return 'Search Results';
      case 'document':
        return 'Document Editor';
      case 'mcp':
        return 'MCP Integration';
      case 'integrations':
        return 'Integrations';
      case 'agent-builder':
        return 'Agent Builder';
      default:
        return 'Panel';
    }
  };

  const getFragmentIcon = () => {
    switch (activeFragment) {
      case 'code':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#10b981" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'browser':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#8b5cf6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'mcp':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#06b6d4" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'integrations':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'agent-builder':
        return (
          <svg className="w-4 h-4" fill="none" stroke="#06b6d4" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  if (!isOpen) return null;

  if (isMobile) {
    // Mobile: Full screen modal overlay
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          {/* Mobile Header */}
          <div className={`flex items-center justify-between p-4 border-b bg-background ${
            isDarkMode ? 'border-border' : 'border-border'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-muted`}>
                {getFragmentIcon()}
              </div>
              <h3 className={`font-semibold text-lg text-foreground`}>
                {getFragmentTitle()}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden bg-background">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Floating panel
  return (
    <div className="fixed top-0 right-0 h-full flex pointer-events-none" style={{ zIndex: 40 }}>
      {/* Resize handle */}
      <div
        className={`w-1 cursor-col-resize hover:bg-primary/50 transition-colors bg-transparent pointer-events-auto ${isResizing ? 'bg-primary' : ''}`}
        onMouseDown={handleMouseDown}
      />
      
      {/* Floating Panel Container */}
      <div className="h-full p-4 pl-2 pointer-events-none">
        <div
          ref={panelRef}
          className={`h-full pointer-events-auto bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden`}
          style={{ width: `${width}px` }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b border-border bg-background relative z-10`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-muted`}>
                {getFragmentIcon()}
              </div>
              <h3 className={`font-semibold text-lg text-foreground`}>
                {getFragmentTitle()}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className={`p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-hidden relative bg-background`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
