import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { X, Save, Type, List, Hash, Quote, Code, Minus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface Block {
  id: string;
  type: 'text' | 'heading' | 'list' | 'todo' | 'quote' | 'code' | 'divider';
  content: string;
  level?: number; // For headings (1, 2, 3)
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    alignment?: 'left' | 'center' | 'right';
  };
}

interface DocumentEditorProps {
  initialContent?: string;
  title?: string;
  onSave?: (content: string) => void;
  onClose?: () => void;
}

export function DocumentEditor({ initialContent = '', title: initialTitle = 'Untitled Document', onSave, onClose }: DocumentEditorProps) {
  const { isDarkMode } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 'block-1', type: 'text', content: '' }
  ]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  
  const saveDocument = useMutation(api.files.saveDocument);
  const containerRef = useRef<HTMLDivElement>(null);
  const formatToolbarRef = useRef<HTMLDivElement>(null);

  // Parse initialContent if provided as JSON blocks (for real-time streaming)
  useEffect(() => {
    if (initialContent && initialContent.trim()) {
      try {
        // Try to parse as JSON blocks first (from streaming)
        const parsedBlocks = JSON.parse(initialContent);
        if (Array.isArray(parsedBlocks) && parsedBlocks.length > 0) {
          // Only update if the content is actually different to prevent unnecessary re-renders
          const currentContent = JSON.stringify(blocks);
          const newContent = JSON.stringify(parsedBlocks);
          if (currentContent !== newContent) {
            setBlocks(parsedBlocks);
          }
          return;
        }
      } catch {
        // If not valid JSON, treat as plain text and convert to blocks
        const textBlocks = initialContent.split('\n\n').map((paragraph, index) => ({
          id: `block-${index + 1}`,
          type: 'text' as const,
          content: paragraph.trim(),
          style: { bold: false, italic: false, underline: false, alignment: 'left' as const }
        })).filter(block => block.content);
        
        if (textBlocks.length > 0) {
          // Only update if we have meaningful content
          const hasContent = textBlocks.some(block => block.content.length > 0);
          if (hasContent) {
            setBlocks(textBlocks);
          }
        }
      }
    } else if (blocks.length === 1 && blocks[0].content === '') {
      // Ensure we always have at least one empty block for editing
      setBlocks([{ id: 'block-1', type: 'text', content: '', style: { bold: false, italic: false, underline: false, alignment: 'left' as const } }]);
    }
  }, [initialContent]);

  // Listen for real-time content updates (streaming) - simplified
  useEffect(() => {
    // We don't need additional logic here since initialContent useEffect handles updates
    return () => {};
  }, []);

  // Enhanced formatting toolbar
  const formatCurrentBlock = useCallback((format: string, value?: any) => {
    if (!focusedBlockId) return;
    
    const currentBlock = blocks.find(b => b.id === focusedBlockId);
    if (!currentBlock) return;
    
    const updatedStyle = { ...currentBlock.style };
    
    switch (format) {
      case 'bold':
        updatedStyle.bold = !updatedStyle.bold;
        break;
      case 'italic':
        updatedStyle.italic = !updatedStyle.italic;
        break;
      case 'underline':
        updatedStyle.underline = !updatedStyle.underline;
        break;
      case 'align':
        updatedStyle.alignment = value;
        break;
    }
    
    updateBlock(focusedBlockId, { style: updatedStyle });
  }, [focusedBlockId, blocks]);

  // Handle text selection for formatting
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setSelectedText(selection.toString());
      setShowFormatToolbar(true);
      
      // Position toolbar near selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSlashMenuPosition({ x: rect.left, y: rect.top - 50 });
    } else {
      setShowFormatToolbar(false);
      setSelectedText('');
    }
  }, []);

  // Global keyboard event listener for shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is within the document editor
      if (!containerRef.current?.contains(e.target as Node)) return;
      
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case '1':
          case '2':
          case '3':
            if (focusedBlockId) {
              e.preventDefault();
              updateBlock(focusedBlockId, { type: 'heading', level: parseInt(e.key) });
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [focusedBlockId]);

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (blocks.length > 0 && (blocks.some(b => b.content) || title !== 'Untitled Document')) {
        await handleSave(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [blocks, title]);

  const handleSave = async (manual = true) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const content = JSON.stringify(blocks);
      await saveDocument({
        title,
        content,
        type: 'document'
      });
      setLastSaved(new Date());
      if (manual) {
        onSave?.(content);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
  }, []);

  const insertBlock = useCallback((afterBlockId: string, newBlock: Partial<Block>) => {
    const newBlockWithId = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: 'text' as const,
      content: '',
      ...newBlock
    };
    
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterBlockId);
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlockWithId);
      return newBlocks;
    });
    
    return newBlockWithId.id;
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      if (prev.length === 1) {
        return [{ id: 'block-1', type: 'text', content: '' }];
      }
      return prev.filter(b => b.id !== blockId);
    });
  }, []);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setBlocks(prev => {
      const newBlocks = [...prev];
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      return newBlocks;
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Handle Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (block.content.trim() === '') {
        // Convert empty block to text
        updateBlock(blockId, { type: 'text' });
      } else {
        // Create new block
        const newBlockId = insertBlock(blockId, { type: 'text' });
        setTimeout(() => focusBlock(newBlockId), 0);
      }
    }
    
    // Handle Backspace on empty block
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      if (currentIndex > 0) {
        deleteBlock(blockId);
        const prevBlock = blocks[currentIndex - 1];
        setTimeout(() => focusBlock(prevBlock.id), 0);
      }
    }

    // Handle slash command
    if (e.key === '/' && block.content === '') {
      e.preventDefault();
      setShowSlashMenu(true);
      setFocusedBlockId(blockId);
      
      // Position slash menu
      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      setSlashMenuPosition({ x: rect.left, y: rect.bottom });
    }

    // Handle Escape to close slash menu
    if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  const focusBlock = (blockId: string) => {
    const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    if (element) {
      element.focus();
      setFocusedBlockId(blockId);
      // Move cursor to end
      setTimeout(() => {
        const range = document.createRange();
        const sel = window.getSelection();
        if (element.firstChild) {
          range.setStart(element.firstChild, element.textContent?.length || 0);
        } else {
          range.setStart(element, 0);
        }
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 0);
    }
  };

  const slashCommands = [
    { key: 'text', label: 'Text', icon: '📝', description: 'Plain text paragraph' },
    { key: 'h1', label: 'Heading 1', icon: '📰', description: 'Big section heading' },
    { key: 'h2', label: 'Heading 2', icon: '📄', description: 'Medium section heading' },
    { key: 'h3', label: 'Heading 3', icon: '📃', description: 'Small section heading' },
    { key: 'bullet', label: 'Bullet List', icon: '•', description: 'Create a bulleted list' },
    { key: 'numbered', label: 'Numbered List', icon: '1.', description: 'Create a numbered list' },
    { key: 'todo', label: 'Todo', icon: '☐', description: 'Track a task with checkbox' },
    { key: 'quote', label: 'Quote', icon: '❝', description: 'Capture a quote or reference' },
    { key: 'code', label: 'Code', icon: '⌨️', description: 'Code snippet with syntax highlighting' },
    { key: 'divider', label: 'Divider', icon: '━', description: 'Visual divider or separator' },
  ];

  const handleSlashCommand = (command: string) => {
    if (!focusedBlockId) return;
    
    const updates: Partial<Block> = {};
    
    switch (command) {
      case 'h1':
      case 'h2':
      case 'h3':
        updates.type = 'heading';
        updates.level = parseInt(command.slice(1));
        break;
      case 'bullet':
        updates.type = 'list';
        updates.style = 'bullet';
        break;
      case 'numbered':
        updates.type = 'list';
        updates.style = 'numbered';
        break;
      case 'todo':
        updates.type = 'todo';
        updates.checked = false;
        break;
      case 'quote':
        updates.type = 'quote';
        break;
      case 'code':
        updates.type = 'code';
        break;
      case 'divider':
        updates.type = 'divider';
        updates.content = '---';
        break;
      default:
        updates.type = 'text';
    }
    
    updateBlock(focusedBlockId, updates);
    setShowSlashMenu(false);
    setTimeout(() => focusBlock(focusedBlockId), 0);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      ref={containerRef}
      className={`h-full flex flex-col ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Enhanced Header with Formatting Toolbar */}
      <div className={`p-6 border-b ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`text-2xl font-bold bg-transparent border-none outline-none flex-1 ${
              isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            }`}
            placeholder="Document title..."
          />
          <div className="flex items-center gap-2">
            {/* Save Status */}
            {isSaving ? (
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Saving...
              </span>
            ) : lastSaved ? (
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
            
            {/* Action Buttons */}
            <button
              onClick={() => handleSave(true)}
              className={`p-2 rounded transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              }`}
              title="Save document"
            >
              <Save className="w-4 h-4" />
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
                title="Close document"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Formatting Toolbar */}
        <div className={`flex items-center gap-1 p-2 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <button
            onClick={() => formatCurrentBlock('bold')}
            className={`p-2 rounded transition-colors ${
              focusedBlockId && blocks.find(b => b.id === focusedBlockId)?.style?.bold
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
            }`}
            title="Bold (Ctrl/Cmd + B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => formatCurrentBlock('italic')}
            className={`p-2 rounded transition-colors ${
              focusedBlockId && blocks.find(b => b.id === focusedBlockId)?.style?.italic
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
            }`}
            title="Italic (Ctrl/Cmd + I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => formatCurrentBlock('underline')}
            className={`p-2 rounded transition-colors ${
              focusedBlockId && blocks.find(b => b.id === focusedBlockId)?.style?.underline
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
            }`}
            title="Underline (Ctrl/Cmd + U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          
          <div className={`w-px h-6 mx-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
          
          <button
            onClick={() => formatCurrentBlock('align', 'left')}
            className={`p-2 rounded transition-colors ${
              focusedBlockId && blocks.find(b => b.id === focusedBlockId)?.style?.alignment === 'left'
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => formatCurrentBlock('align', 'center')}
            className={`p-2 rounded transition-colors ${
              focusedBlockId && blocks.find(b => b.id === focusedBlockId)?.style?.alignment === 'center'
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => formatCurrentBlock('align', 'right')}
            className={`p-2 rounded transition-colors ${
              focusedBlockId && blocks.find(b => b.id === focusedBlockId)?.style?.alignment === 'right'
                ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Help Text */}
          {blocks.length === 1 && blocks[0].content === '' && (
            <div className={`mb-8 p-6 rounded-lg border-2 border-dashed ${
              isDarkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Welcome to your document! ✨
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <p className="mb-2">Try typing <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">/</code> to see all available block types</p>
                <p>Or use keyboard shortcuts: <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">Cmd+1</code> for H1, <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">Cmd+2</code> for H2, etc.</p>
              </div>
            </div>
          )}

          {/* Blocks */}
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <BlockComponent
                key={block.id}
                block={block}
                isDarkMode={isDarkMode}
                onUpdate={updateBlock}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocusedBlockId(block.id)}
                onDelete={() => deleteBlock(block.id)}
                isDragged={draggedBlockId === block.id}
                onDragStart={() => setDraggedBlockId(block.id)}
                onDragEnd={() => setDraggedBlockId(null)}
                onDrop={(fromIndex, toIndex) => moveBlock(fromIndex, toIndex)}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slash Menu */}
      {showSlashMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowSlashMenu(false)}
          />
          <div 
            className={`fixed z-20 w-80 max-h-96 overflow-y-auto rounded-lg shadow-lg border ${
              isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200'
            }`}
            style={{
              left: slashMenuPosition.x,
              top: slashMenuPosition.y,
            }}
          >
            <div className="p-2">
              {slashCommands.map((command) => (
                <button
                  key={command.key}
                  onClick={() => handleSlashCommand(command.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-left ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  <span className="text-lg">{command.icon}</span>
                  <div>
                    <div className="font-medium">{command.label}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {command.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Block Component
interface BlockComponentProps {
  block: Block;
  isDarkMode: boolean;
  onUpdate: (blockId: string, updates: Partial<Block>) => void;
  onKeyDown: (e: React.KeyboardEvent, blockId: string) => void;
  onFocus: () => void;
  onDelete: () => void;
  isDragged: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
  index: number;
}

function BlockComponent({
  block,
  isDarkMode,
  onUpdate,
  onKeyDown,
  onFocus,
  onDelete,
  isDragged,
  onDragStart,
  onDragEnd,
  onDrop,
  index
}: BlockComponentProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    onUpdate(block.id, { content });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    onDrop(fromIndex, index);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart();
  };

  const renderBlockContent = () => {
    const baseClasses = `outline-none min-h-[1.5rem] ${
      isDarkMode ? 'text-gray-200' : 'text-gray-800'
    }`;

    // Enhanced styling based on block style
    const getAlignmentClass = () => {
      if (!block.style?.alignment) return 'text-left';
      return `text-${block.style.alignment}`;
    };

    const getStyleClasses = () => {
      let classes = '';
      if (block.style?.bold) classes += ' font-bold';
      if (block.style?.italic) classes += ' italic';
      if (block.style?.underline) classes += ' underline';
      return classes;
    };

    const commonProps = {
      'data-block-id': block.id,
      contentEditable: block.type !== 'divider',
      suppressContentEditableWarning: true,
      onInput: handleContentChange,
      onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, block.id),
      onFocus,
      children: block.content,
      className: `${baseClasses} ${getAlignmentClass()} ${getStyleClasses()}`
    };

    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.level || 1}` as keyof JSX.IntrinsicElements;
        const headingSizes = {
          1: 'text-3xl font-bold',
          2: 'text-2xl font-semibold', 
          3: 'text-xl font-medium'
        };
        return (
          <HeadingTag
            className={`${baseClasses} ${headingSizes[block.level as keyof typeof headingSizes] || headingSizes[1]} mb-2`}
            {...commonProps}
          />
        );

      case 'list':
        return (
          <div className="flex items-start gap-2">
            <span className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {block.style?.alignment === 'center' ? '•' : block.style?.alignment === 'right' ? '1.' : '•'}
            </span>
            <div className={`${baseClasses} flex-1`} {...commonProps} />
          </div>
        );

      case 'todo':
        return (
          <div className="flex items-start gap-3">
            <button
              onClick={() => onUpdate(block.id, { checked: !block.checked })}
              className={`mt-1 w-4 h-4 border-2 rounded flex items-center justify-center ${
                block.checked 
                  ? 'bg-blue-500 border-blue-500' 
                  : isDarkMode 
                    ? 'border-gray-500 hover:border-gray-400' 
                    : 'border-gray-400 hover:border-gray-500'
              }`}
            >
              {block.checked && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <div 
              className={`${baseClasses} flex-1 ${block.checked ? 'line-through opacity-60' : ''}`} 
              {...commonProps} 
            />
          </div>
        );

      case 'quote':
        return (
          <div className={`border-l-4 pl-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <div className={`${baseClasses} italic`} {...commonProps} />
          </div>
        );

      case 'code':
        return (
          <div className={`rounded-lg p-4 font-mono text-sm ${
            isDarkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-gray-100 border border-gray-200'
          }`}>
            <div className={baseClasses} {...commonProps} />
          </div>
        );

      case 'divider':
        return (
          <div className={`h-px my-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        );

      default:
        return <div className={`${baseClasses} leading-relaxed`} {...commonProps} />;
    }
  };

  return (
    <div 
      className={`group relative transition-all duration-200 ${
        isDragged ? 'opacity-50' : ''
      } ${isHovered ? 'bg-opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Enhanced Drag Handle */}
      <div className={`
        absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-8
        ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity cursor-grab
        ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
      `}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 5h2v2H9zm0 6h2v2H9zm0 6h2v2H9zm6-12h2v2h-2zm0 6h2v2h-2zm0 6h2v2h-2z"/>
        </svg>
      </div>

      {/* Real-time Streaming Indicator */}
      {/* isStreamingBlock && (
        <div className={`absolute right-2 top-2 z-10 flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
          isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
        }`}>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Streaming</span>
        </div>
      ) */}

      {/* Block Actions */}
      {isHovered && (
        <div className={`absolute right-2 top-2 flex items-center gap-1 ${
          /* isStreamingBlock ? 'top-8' : '' */ ''
        }`}>
          <button
            onClick={onDelete}
            className={`p-1 rounded transition-colors ${
              isDarkMode 
                ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300' 
                : 'hover:bg-red-100 text-red-500 hover:text-red-600'
            }`}
            title="Delete block"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Block Content */}
      {renderBlockContent()}
    </div>
  );
}
