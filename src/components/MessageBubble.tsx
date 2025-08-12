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
import { GeneratedImageCard } from "./GeneratedImageCard";
import PlanChecklist from "./PlanChecklist";

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
  const [imageLoadedMap, setImageLoadedMap] = useState<Record<string, boolean>>({});

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

  // Removed auto-open of search results to prevent right panel from re-opening after user closes it

  // Handler for opening content in document editor (canvas)
  const handleViewInCanvas = () => {
    // Convert message content to document format
    const documentBlocks = convertContentToBlocks(message.content);
    handleOpenInFragment('document', {
      title: extractTitleFromContent(message.content),
      content: JSON.stringify(documentBlocks),
    });
  };

  // Helper function to convert content to blocks
  const convertContentToBlocks = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      id: `block-${index + 1}`,
      type: 'text' as const,
      content: line.trim(),
      style: { bold: false, italic: false, underline: false, alignment: 'left' as const }
    }));
  };

  // Helper function to extract title from content
  const extractTitleFromContent = (content: string) => {
    const lines = content.split('\n');
    const firstLine = lines.find(line => line.trim());
    if (firstLine && firstLine.length > 0) {
      return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    }
    return 'Generated Content';
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

  // Determine a simple tool label from file type/name
  const getAttachmentLabel = (att: { fileName: string; fileType: string }) => {
    const name = (att.fileName || '').toLowerCase();
    const type = (att.fileType || '').toLowerCase();
    if (type.startsWith('image/')) return 'Image';
    if (type === 'text/csv' || name.endsWith('.csv')) return 'CSV';
    if (
      type === 'application/vnd.ms-excel' ||
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      name.endsWith('.xls') ||
      name.endsWith('.xlsx')
    ) return 'Table';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
    return 'File';
  };

  // Helper function to extract title from HTML
  const extractTitleFromHTML = (html: string): string | null => {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  };

  // Helper function to clean message content for display
  const cleanMessageContent = (content: string) => {
    if (message.role !== 'user') {
      return content; // Only clean user messages
    }
    
    // Remove search tags like [Search: query] and just show the query
    const searchMatch = content.match(/^\[Search:\s*(.+?)\]$/);
    if (searchMatch) {
      return searchMatch[1]; // Return just the search query without the brackets
    }
    
    return content; // Return original content if no search tag found
  };

  // Detect generated image URLs embedded by backend in the form: "Generated image: <url>"
  // Be permissive about placement (start, middle of line) and spacing
  const extractGeneratedImages = (content: string): { cleaned: string; urls: string[] } => {
    const urls: string[] = [];
    const pattern = /Generated\s+image:\s*(https?:\/\/\S+)/gi;
    let cleaned = content;
    cleaned = cleaned.replace(pattern, (_match, url) => {
      urls.push(url);
      return '';
    });
    return { cleaned, urls };
  };

  const renderContent = () => {
    const raw = cleanMessageContent(message.content);
    const { cleaned, urls } = extractGeneratedImages(raw);
    const isImageMessage = urls.length > 0;

    // Plan UI embed: detect tokens like "Plan created: [plan:<id>]"
    const planMatch = raw.match(/Plan created: \[plan:([a-z0-9]+)\]/i);
    
    return (
      <>
      {!isImageMessage && !planMatch && (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          div: ({ children, ...props }) => (
            <div 
              className={`prose prose-sm sm:prose-base w-full min-w-0 break-words overflow-hidden ${
                isDarkMode 
                  ? 'prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-muted-foreground prose-pre:bg-card prose-pre:border prose-pre:border-border' 
                  : 'prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-muted-foreground prose-pre:bg-card prose-pre:border prose-pre:border-border'
              } ${message.role === 'user' ? (isDarkMode ? 'prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground' : 'prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground') : ''}`}
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

              // Do not auto-open right panel for HTML; require explicit user action

              return (
                <div className="my-3 sm:my-4 w-full min-w-0">
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
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-all duration-200 break-words ${
                        isDarkMode 
                          ? 'bg-card/80 text-muted-foreground hover:bg-muted border border-border/50' 
                          : message.role === 'user'
                          ? 'bg-primary/50 text-primary-foreground hover:bg-primary/60 border border-primary/50'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/50'
                      } backdrop-blur-sm`}
                    >
                      <span className="text-sm flex-shrink-0">{getLanguageIcon(language)}</span>
                      <span className="font-medium truncate">
                        {isHTML ? 'Generated HTML' : `${language.toUpperCase()} Code`}
                      </span>
                      <svg className="w-3 h-3 opacity-60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>

                  {/* Code Block */}
                  <div className={`rounded-lg overflow-hidden w-full min-w-0 ${
                    isDarkMode 
                      ? 'bg-card border border-border' 
                      : message.role === 'user'
                      ? 'bg-muted border border-border'
                      : 'bg-card border border-border'
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
                className={`px-1.5 py-0.5 rounded text-sm font-mono break-words ${
                  message.role === 'user'
                    ? isDarkMode
                      ? 'bg-muted text-foreground'
                      : 'bg-muted text-foreground'
                    : isDarkMode 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`} 
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            return <div className="w-full min-w-0 overflow-hidden">{children}</div>;
          },
          h1: ({ children }) => (
            <h1 className={`text-xl sm:text-2xl font-bold mb-3 break-words ${
              message.role === 'user' ? 'text-foreground' : 'text-foreground'
            }`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-lg sm:text-xl font-bold mb-2 break-words ${
              message.role === 'user' ? 'text-foreground' : 'text-foreground'
            }`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-base sm:text-lg font-bold mb-2 break-words ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className={`mb-2 leading-relaxed break-words ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className={`list-disc list-inside mb-2 space-y-1 break-words ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal list-inside mb-2 space-y-1 break-words ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed break-words">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 pl-4 py-2 my-2 italic break-words ${
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
            <div className="overflow-x-auto my-2 w-full">
              <table className={`min-w-full border-collapse ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className={`border px-3 py-2 text-left font-semibold break-words ${
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
            <td className={`border px-3 py-2 break-words ${
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
            <strong className={`font-semibold break-words ${
              message.role === 'user' ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic break-words ${
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
              className={`underline hover:no-underline transition-colors break-words ${
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
        {cleaned}
      </ReactMarkdown>
      )}
      {/* Render generated images (ChatGPT-like card with blur skeleton) */}
      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {urls.map((url) => (
            <GeneratedImageCard key={url} url={url} />
          ))}
        </div>
      )}
      {planMatch && (
        <PlanChecklist planId={planMatch[1]} title={"Proposed Plan"} tasks={[]} />
      )}
      </>
    );
  };

  // Note: message.role is 'user' | 'assistant' in this component's props

  return (
    <div className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`max-w-[85%] sm:max-w-3xl ${message.role === 'user' ? '' : 'w-full'} min-w-0 ${message.role === 'user' ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 break-words overflow-hidden ${
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
            <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => {
                const label = getAttachmentLabel(attachment);
                return (
                  <div
                    key={index}
                    className={`inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs ${
                      isDarkMode ? 'border-neutral-700/70 bg-neutral-800/60 text-gray-200' : 'border-gray-300/70 bg-white text-gray-800'
                    }`}
                    title={attachment.fileName}
                  >
                    <span className={`px-2 py-0.5 rounded-md ${
                      isDarkMode ? 'bg-neutral-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>{label}</span>
                    <a
                      href={`/files/download?id=${attachment.fileId}&name=${encodeURIComponent(attachment.fileName)}&type=${encodeURIComponent(attachment.fileType)}`}
                      title="Download"
                      className={`ml-1 flex-shrink-0 inline-flex items-center justify-center rounded-md h-7 w-7 ${
                        isDarkMode ? 'hover:bg-neutral-900 border border-neutral-700/70' : 'hover:bg-gray-50 border border-gray-300/70'
                      }`}
                      download
                    >
                      <Download className={`w-4 h-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} />
                    </a>
                  </div>
                );
              })}
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
          <div className="leading-relaxed break-words overflow-hidden min-w-0 w-full">
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
                <span className={`text-xs break-words ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                    className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors min-w-0 max-w-[120px] ${
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
                    <span className="truncate">{truncatedUrl}</span>
                  </button>
                );
              })}
              
              {message.searchResults.length > 3 && (
                <button
                  onClick={handleSearchResultsClick}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors flex-shrink-0 ${
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
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors flex-shrink-0 ${
                  isDarkMode 
                    ? 'bg-primary-900/30 text-primary-400 hover:bg-primary-900/50 border border-primary-700/50' 
                    : 'bg-primary-100 text-primary-600 hover:bg-primary-200 border border-primary-200'
                }`}
                title="View all sources in panel"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View all
              </button>
            </div>
          </div>
        )}

        {/* View in Canvas Button - for assistant messages with substantial content */}
        {message.role === 'assistant' && !message.isStreaming && message.content && message.content.length > 200 && !message.content.includes('Generated image:') && (
          <div className="mt-2 sm:mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleViewInCanvas}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors flex-shrink-0 ${
                  isDarkMode 
                    ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border border-purple-700/50' 
                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                }`}
                title="Open in document editor"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View in Canvas
              </button>
            </div>
          </div>
        )}

        {/* Message metadata */}
        <div className={`flex items-center gap-2 mt-2 text-xs break-words ${
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
