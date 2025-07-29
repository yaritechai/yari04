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
  onFragmentChange: (fragment: FragmentType, data?: any) => void;
  fragmentData?: any;
}

export function RightPanel({
  isOpen,
  onToggle,
  width,
  onWidthChange,
  activeFragment,
  onFragmentChange,
  fragmentData
}: RightPanelProps) {
  const { isDarkMode } = useTheme();
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 320;
      const maxWidth = Math.min(800, window.innerWidth * 0.6);
      
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
  }, [isResizing, onWidthChange]);

  const renderContent = () => {
    if (!activeFragment) return null;

    switch (activeFragment) {
      case 'code':
        return (
          <CodeView
            data={{
              code: fragmentData?.code || '',
              language: fragmentData?.language || 'javascript',
              filename: fragmentData?.title
            }}
          />
        );
      case 'browser':
        return (
          <BrowserView
            data={{
              htmlContent: fragmentData?.htmlContent || '',
              title: fragmentData?.title || 'Preview'
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
            initialContent={fragmentData?.content || ''}
            title={fragmentData?.title || 'New Document'}
            onClose={() => onFragmentChange('document', null)}
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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'browser':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'mcp':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'integrations':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'agent-builder':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full flex" style={{ zIndex: 1000 }}>
      {/* Resize handle */}
      <div
        className={`w-1 cursor-col-resize hover:bg-[#f9c313]/50 transition-colors bg-transparent ${isResizing ? 'bg-[#f9c313]' : ''}`}
        onMouseDown={handleMouseDown}
      />
      
      {/* Floating Panel Container */}
      <div className="h-full p-4 pl-2">
        <div
          ref={panelRef}
          className={`h-full ${
            isDarkMode ? 'bg-neutral-900' : 'bg-white'
          } rounded-2xl shadow-2xl border ${
            isDarkMode ? 'border-neutral-800' : 'border-gray-200'
          } flex flex-col overflow-hidden`}
          style={{ width: `${width}px` }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'
              }`}>
                {getFragmentIcon()}
              </div>
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {getFragmentTitle()}
              </h3>
            </div>
            <button
              onClick={onToggle}
              className={`p-2 rounded-xl transition-all hover:scale-105 ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-neutral-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-hidden ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
