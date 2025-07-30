import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface Block {
  id: string;
  type: 'text' | 'heading' | 'list' | 'code' | 'quote' | 'divider' | 'image' | 'todo';
  content: string;
  level?: number; // for headings (1-3)
  style?: 'bullet' | 'numbered'; // for lists
  checked?: boolean; // for todos
  metadata?: any;
}

interface DocumentEditorProps {
  initialContent?: string;
  title?: string;
  onSave?: (content: string, title: string) => void;
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
  
  const saveDocument = useMutation(api.files.saveDocument);
  const containerRef = useRef<HTMLDivElement>(null);

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
        onSave?.(content, title);
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

    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleSave();
          break;
        case '1':
        case '2':
        case '3':
          e.preventDefault();
          updateBlock(blockId, { type: 'heading', level: parseInt(e.key) });
          break;
      }
    }
  };

  const focusBlock = (blockId: string) => {
    const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    if (element) {
      element.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
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
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b ${
        isDarkMode ? 'border-neutral-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`text-2xl font-bold bg-transparent border-none outline-none flex-1 ${
              isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            }`}
            placeholder="Untitled"
          />
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              Saving...
            </div>
          )}
          {lastSaved && !isSaving && (
            <div className="text-sm text-gray-500">
              Saved {formatTime(lastSaved)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            } disabled:opacity-50`}
          >
            Save
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
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

      {/* Editor Container */}
      <div ref={containerRef} className="flex-1 overflow-auto">
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

    const commonProps = {
      'data-block-id': block.id,
      contentEditable: block.type !== 'divider',
      suppressContentEditableWarning: true,
      onInput: handleContentChange,
      onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, block.id),
      onFocus,
      children: block.content,
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
              {block.style === 'bullet' ? '•' : '1.'}
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
      className={`group relative ${isDragged ? 'opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Handle */}
      {isHovered && (
        <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            className={`p-1 rounded cursor-grab active:cursor-grabbing ${
              isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      )}
      
      {renderBlockContent()}
    </div>
  );
}
