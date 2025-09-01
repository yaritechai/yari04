import React from 'react';

export function Message({ from, children }: { from: 'user' | 'assistant' | string; children: React.ReactNode }) {
  const align = from === 'user' ? 'items-end' : 'items-start';
  return <div className={`flex ${align}`}><div className="max-w-full w-full">{children}</div></div>;
}

export function MessageContent({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border p-3">{children}</div>;
}


