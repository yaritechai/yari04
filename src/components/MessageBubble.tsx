import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../contexts/ThemeContext";
import { CodeBlock } from "./CodeBlock";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Download, ExternalLink, Search } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { FragmentType } from "./RightPanel";

interface MessageBubbleProps {
  message: {
    _id: Id<"messages">;
    role: "user" | "assistant";
    content: string;
    tokenCount?: number;
    _creationTime: number;
    isStreaming?: boolean;
    hasCodeBlocks?: boolean;
    hasHTMLContent?: boolean;
    searchResults?: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    hasPlainHTML?: boolean;
    reportData?: any;
    attachments?: Array<{
      fileId: Id<"_storage">;
      fileName: string;
      fileType: string;
      fileSize: number;
    }>;
    mcpCredentialRequest?: any;
  };
  showTokenCount?: boolean;
  onOpenFragment?: (type: FragmentType, data: any) => void;

  onMCPCredentialRequest?: (serverDetails: any) => void;
}

export function MessageBubble({ message, showTokenCount, onOpenFragment, onMCPCredentialRequest }: MessageBubbleProps) {
  const { isDarkMode } = useTheme();
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const user = useQuery(api.auth.loggedInUser);
  const generateReport = useAction(api.ai.generateReport);
  const detectReportRequest = useAction(api.ai.detectReportRequest);

  // Check if this message is a report request and auto-generate
  useEffect(() => {
    const checkForReportRequest = async () => {
      if (message.role === 'user' && !message.reportData && !isGeneratingReport) {
        try {
          const detection = await detectReportRequest({ message: message.content });
          
          if (detection.isReportRequest) {
            setIsGeneratingReport(true);
            
            const report = await generateReport({
              prompt: detection.extractedPrompt || message.content,
              reportType: detection.reportType || undefined,
            });

            // Auto-open the document editor with the generated report
            if (onOpenFragment && report) {
              setTimeout(() => {
                onOpenFragment('document', {
                  title: report.title,
                  content: report.content,
                  type: report.type
                });
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error processing report request:', error);
        } finally {
          setIsGeneratingReport(false);
        }
      }
    };

    checkForReportRequest();
  }, [message.content, message.role, message.reportData, isGeneratingReport, detectReportRequest, generateReport, onOpenFragment]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleOpenInFragment = (type: FragmentType, data: any) => {
    onOpenFragment?.(type, data);
  };

  // Auto-trigger search panel when search results are present
  const handleSearchResultsClick = () => {
    if (message.searchResults) {
      handleOpenInFragment('search', { results: message.searchResults });
    }
  };

  const getLanguageIcon = (language: string) => {
    const lang = language.toLowerCase();
    if (lang === 'html' || lang === 'xml') return '🌐';
    if (lang === 'javascript' || lang === 'js') return '⚡';
    if (lang === 'typescript' || lang === 'ts') return '🔷';
    if (lang === 'python' || lang === 'py') return '🐍';
    if (lang === 'css') return '🎨';
    if (lang === 'json') return '📋';
    if (lang === 'sql') return '🗃️';
    if (lang === 'bash' || lang === 'shell') return '💻';
    return '📄';
  };

  // Helper function to extract title from HTML
  const extractTitleFromHTML = (html: string): string | null => {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  };

  const renderContent = () => {
    const content = message.content;
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          div: ({ children, ...props }) => (
            <div 
              className={`prose prose-sm sm:prose-base max-w-none ${
                isDarkMode 
                  ? 'prose-invert prose-headings:text-gray-100 prose-p:text-gray-200 prose-strong:text-gray-100 prose-code:text-gray-200 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700' 
                  : 'prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-800'
              } ${message.role === 'user' ? (isDarkMode ? 'prose-headings:text-gray-100 prose-p:text-gray-100 prose-strong:text-gray-100 prose-code:text-gray-100 prose-pre:bg-neutral-700 prose-pre:text-gray-100' : 'prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-code:text-gray-900 prose-pre:bg-neutral-200 prose-pre:text-gray-900') : ''}`}
              {...props}
            >
              {children}
            </div>
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // Properly extract text content from children
            const extractTextContent = (children: any): string => {
              if (typeof children === 'string') {
                return children;
              }
              if (Array.isArray(children)) {
                return children.map(extractTextContent).join('');
              }
              if (children && typeof children === 'object' && children.props && children.props.children) {
                return extractTextContent(children.props.children);
              }
              return '';
            };
            
            const codeContent = extractTextContent(children).replace(/\n$/, '');
            
            if (!inline && language) {
              // Check if this is HTML content
              const isHTML = language.toLowerCase() === 'html' || 
                           codeContent.trim().startsWith('<!DOCTYPE html') ||
                           codeContent.includes('<html') ||
                           (codeContent.includes('<head>') && codeContent.includes('<body>'));

              // Auto-open right panel for HTML content (only if not already open)
              if (isHTML && onOpenFragment) {
                // Use requestAnimationFrame for better timing and avoid conflicts
                requestAnimationFrame(() => {
                  handleOpenInFragment('browser', {
                    htmlContent: codeContent,
                    title: extractTitleFromHTML(codeContent) || 'Generated HTML Document',
                    isStreaming: message.isStreaming
                  });
                });
              }

              return (
                <div className="my-3 sm:my-4">
                  {/* Code Badge */}
                  <div className="mb-2">
                    <button
                      onClick={() => {
                        if (isHTML) {
                          handleOpenInFragment('browser', {
                            htmlContent: codeContent,
                            title: extractTitleFromHTML(codeContent) || 'Generated HTML Document',
                            isStreaming: message.isStreaming
                          });
                        } else {
                          handleOpenInFragment('code', {
                            code: codeContent,
                            language: language,
                            isStreaming: message.isStreaming
                          });
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700/50' 
                          : message.role === 'user'
                          ? 'bg-primary-700/50 text-white hover:bg-primary-600/50 border border-primary-600/50'
                          : 'text-gray-700 hover:bg-gray-50 border border-gray-200/50'
                      } backdrop-blur-sm`}
                    >
                      <span className="text-sm">{getLanguageIcon(language)}</span>
                      <span className="font-medium">
                        {isHTML ? 'Generated HTML' : `${language.toUpperCase()} Code`}
                      </span>
                      <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>

                  {/* Code Block */}
                  <div className={`rounded-lg overflow-hidden ${
                    isDarkMode 
                      ? 'bg-gray-950 border border-gray-800' 
                      : message.role === 'user'
                      ? 'bg-neutral-200/50 border border-neutral-300'
                      : 'border border-gray-200'
                  }`}>
                    <CodeBlock
                      code={codeContent}
                      language={language}
                      onOpenInFragment={(data) => handleOpenInFragment('code', data)}
                      compact={true}
                    />
                  </div>
                </div>
              );
            }

            // Inline code
            return (
              <code 
                className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                  message.role === 'user'
                    ? isDarkMode
                      ? 'bg-neutral-700 text-gray-100'
                      : 'bg-neutral-200 text-gray-900'
                    : isDarkMode 
                    ? 'bg-gray-800 text-gray-200' 
                    : 'bg-gray-100 text-gray-800'
                }`} 
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            return <div>{children}</div>;
          },
          h1: ({ children }) => (
            <h1 className={`text-xl sm:text-2xl font-bold mb-3 ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-lg sm:text-xl font-bold mb-2 ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-base sm:text-lg font-bold mb-2 ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className={`mb-2 leading-relaxed ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className={`list-disc list-inside mb-2 space-y-1 ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal list-inside mb-2 space-y-1 ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 pl-4 py-2 my-2 italic ${
              message.role === 'user' 
                ? isDarkMode
                  ? 'border-neutral-400 text-gray-200' 
                  : 'border-neutral-400 text-gray-700'
                : isDarkMode 
                ? 'border-gray-600 text-gray-300' 
                : 'border-gray-300 text-gray-600'
            }`}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className={`min-w-full border-collapse ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className={`border px-3 py-2 text-left font-semibold ${
              isDarkMode 
                ? 'border-gray-700 bg-gray-800' 
                : message.role === 'user'
                ? 'border-primary-600/30 bg-primary-700/20 text-white'
                : 'border-gray-300 bg-gray-50'
            }`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border px-3 py-2 ${
              isDarkMode 
                ? 'border-gray-700' 
                : message.role === 'user'
                ? 'border-primary-600/30 text-white'
                : 'border-gray-300'
            }`}>
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className={`font-semibold ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </em>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`underline hover:no-underline transition-colors ${
                message.role === 'user' 
                  ? 'text-white hover:text-primary-200' 
                  : isDarkMode 
                  ? 'text-primary-400 hover:text-primary-300' 
                  : 'text-primary-600 hover:text-primary-700'
              }`}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // Don't render system messages
  if (message.role === 'system') {
    return null;
  }

  return (
    <div className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-3xl ${message.role === 'user' ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
          message.role === 'user'
            ? isDarkMode
              ? 'bg-neutral-800 text-gray-100 ml-auto border border-neutral-700'
              : 'bg-neutral-100 text-gray-900 ml-auto border border-neutral-200'
            : isDarkMode
            ? 'text-gray-100'
            : 'text-gray-900'
        }`}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 sm:mb-3 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                  message.role === 'user' 
                    ? isDarkMode 
                      ? 'bg-neutral-700/70' 
                      : 'bg-neutral-200/70'
                    : isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="font-medium truncate">{attachment.fileName}</span>
                  <span className="text-xs opacity-75 flex-shrink-0">
                    ({Math.round(attachment.fileSize / 1024)}KB)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Report Generation Indicator */}
          {isGeneratingReport && (
            <div className={`mb-3 p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-neutral-800/50 border-neutral-700' 
                : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                  isDarkMode ? 'border-gray-400' : 'border-gray-500'
                }`} />
                <span className="text-sm font-medium">Generating report</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="leading-relaxed">
            {renderContent()}
          </div>

          {/* Streaming indicator - OpenAI-style thinking animation */}
          {message.isStreaming && (
            <div className={`inline-flex items-center gap-3 mt-3 px-4 py-2 text-sm rounded-xl transition-all ${
              isDarkMode 
                ? 'bg-neutral-800/80 text-gray-300 border border-neutral-700/30' 
                : 'bg-white/80 text-gray-700 border border-neutral-200/50'
            } shadow-lg backdrop-blur-sm`}>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div 
                    key={i}
                    className={`w-2 h-2 rounded-full thinking-dot ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}
                  />
                ))}
              </div>
              <span className="font-medium">Thinking</span>
            </div>
          )}
        </div>

        {/* Enhanced Search Results Badges */}
        {message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-2 sm:mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <svg className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Researched from {message.searchResults.length} sources:
                </span>
              </div>
              
              {message.searchResults.slice(0, 3).map((result: any, index: number) => {
                const favicon = `https://www.google.com/s2/favicons?domain=${result.displayLink}&sz=16`;
                const truncatedUrl = result.displayLink.length > 20 
                  ? result.displayLink.substring(0, 20) + '...' 
                  : result.displayLink;
                
                return (
                  <button
                    key={index}
                    onClick={handleSearchResultsClick}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600' 
                        : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                    title={result.title}
                  >
                    <img 
                      src={favicon} 
                      alt="" 
                      className="w-3 h-3 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="truncate max-w-[80px]">{truncatedUrl}</span>
                  </button>
                );
              })}
              
              {message.searchResults.length > 3 && (
                <button
                  onClick={handleSearchResultsClick}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600' 
                      : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  +{message.searchResults.length - 3} more
                </button>
              )}
              
              <button
                onClick={handleSearchResultsClick}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                  isDarkMode 
                    ? 'bg-primary-900/30 text-primary-400 hover:bg-primary-900/50 border border-primary-700/50' 
                    : 'bg-primary-100 text-primary-600 hover:bg-primary-200 border border-primary-200'
                }`}
                title="View all sources in panel"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View all
              </button>
            </div>
          </div>
        )}

        {/* Message metadata */}
        <div className={`flex items-center gap-2 mt-2 text-xs ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        } ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(message._creationTime)}</span>
          {showTokenCount && message.tokenCount && (
            <>
              <span>•</span>
              <span>{message.tokenCount} tokens</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
