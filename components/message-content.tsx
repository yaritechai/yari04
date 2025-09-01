'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

export function MessageContent({ content, role }: MessageContentProps) {
  if (role === 'user') {
    return (
      <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%] ml-auto">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
