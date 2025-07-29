import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface DocumentEditorProps {
  initialContent?: string;
  title?: string;
  onSave?: (content: string, title: string) => void;
  onClose?: () => void;
}

export function DocumentEditor({ initialContent = '', title: initialTitle = 'Untitled Report', onSave, onClose }: DocumentEditorProps) {
  const { isDarkMode } = useTheme();
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const saveDocument = useMutation(api.files.saveDocument);

  // Auto-save functionality
  useEffect(() => {
    if (!content && !title) return;
    
    const timer = setTimeout(async () => {
      if (content || title !== 'Untitled Report') {
        await handleSave(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title]);

  const handleSave = async (manual = true) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await saveDocument({
        title,
        content,
        type: 'report'
      });
      setLastSaved(new Date());
      if (manual) {
        onSave?.(content, title);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = () => {
    if (contentRef.current) {
      setContent(contentRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleSave();
          break;
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
      }
    }

    // Handle Enter key for new lines and formatting
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // If we're in a heading, create a new paragraph
        if (parentElement?.tagName.match(/^H[1-6]$/)) {
          e.preventDefault();
          document.execCommand('formatBlock', false, 'p');
        }
      }
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
    handleContentChange();
  };

  const insertHeading = (level: number) => {
    formatText('formatBlock', `h${level}`);
  };

  const insertList = (type: 'ul' | 'ol') => {
    formatText(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${
        isDarkMode ? '' : ''
      }`}>
        <div className="flex items-center gap-3 flex-1">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`text-lg font-semibold bg-transparent border-none outline-none flex-1 ${
              isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            }`}
            placeholder="Document title..."
          />
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
              Saving...
            </div>
          )}
          {lastSaved && !isSaving && (
            <div className="text-sm text-gray-500">
              Saved at {formatTime(lastSaved)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-primary-900/30 text-primary-400 hover:bg-primary-900/50'
                : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
            } disabled:opacity-50`}
          >
            Save
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-neutral-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center gap-1 p-3 ${
        isDarkMode ? '' : ''
      }`}>
        {/* Text formatting */}
        <div className="flex items-center gap-1 mr-3">
          <button
            onClick={() => formatText('bold')}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
            title="Bold (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </button>
          <button
            onClick={() => formatText('italic')}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
            title="Italic (Ctrl+I)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4l4 16M6 8h12M4 16h12" />
            </svg>
          </button>
          <button
            onClick={() => formatText('underline')}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
            title="Underline (Ctrl+U)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a4 4 0 014 4v4a4 4 0 11-8 0v-4a4 4 0 014-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18h8" />
            </svg>
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 mr-3">
          <button
            onClick={() => insertHeading(1)}
            className={`px-2 py-1 text-sm font-semibold rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            H1
          </button>
          <button
            onClick={() => insertHeading(2)}
            className={`px-2 py-1 text-sm font-semibold rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            H2
          </button>
          <button
            onClick={() => insertHeading(3)}
            className={`px-2 py-1 text-sm font-semibold rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertList('ul')}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => insertList('ol')}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6">
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          className={`min-h-full outline-none prose prose-lg max-w-none ${
            isDarkMode 
              ? 'prose-invert prose-headings:text-gray-100 prose-p:text-gray-200 prose-strong:text-gray-100 prose-em:text-gray-200 prose-ul:text-gray-200 prose-ol:text-gray-200 prose-li:text-gray-200' 
              : 'prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-em:text-gray-800'
          }`}
          dangerouslySetInnerHTML={{ __html: content }}
          style={{
            lineHeight: '1.7',
            fontSize: '16px',
          }}
        />
        {!content && !isEditing && (
          <div className={`text-lg ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} pointer-events-none`}>
            Start writing your report...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between p-3 text-sm ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <div className="flex items-center gap-4">
          <span>{content.replace(/<[^>]*>/g, '').length} characters</span>
          <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Ctrl+S to save</span>
        </div>
      </div>
    </div>
  );
}
