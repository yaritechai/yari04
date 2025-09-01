import React from 'react';

export function PromptInput({ onSubmit, className, children }: { onSubmit?: (e: React.FormEvent) => void; className?: string; children: React.ReactNode }) {
  return <form onSubmit={onSubmit} className={className}>{children}</form>;
}

export function PromptInputTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full border rounded px-3 py-2 ${props.className || ''}`} />;
}

export function PromptInputSubmit({ status, disabled, className }: { status?: 'ready' | 'streaming'; disabled?: boolean; className?: string }) {
  return <button type="submit" disabled={disabled} className={`px-3 py-2 bg-blue-600 text-white rounded ${className || ''}`}>{status === 'streaming' ? '…' : 'Send'}</button>;
}


