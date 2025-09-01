import React from 'react';

export function Response({ children }: { children: React.ReactNode }) {
  return <div className="prose prose-sm max-w-none">{children}</div>;
}


