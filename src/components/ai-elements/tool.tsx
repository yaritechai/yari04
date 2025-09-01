import React, { useState } from 'react';

export function Tool({ children, defaultOpen }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border rounded-lg">
      <div>{React.Children.map(children, (child: any) => {
        if (child && child.type && (child.type as any).displayName === 'ToolContent') {
          return open ? child : null;
        }
        if (child && child.type && (child.type as any).displayName === 'ToolHeader') {
          return React.cloneElement(child, { onToggle: () => setOpen((o) => !o) });
        }
        return child;
      })}</div>
    </div>
  );
}

export function ToolHeader({ type, state, onToggle, className }: { type: string; state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'; onToggle?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onToggle} className={`w-full flex items-center justify-between px-3 py-2 ${className || ''}`}>
      <span className="font-medium">{type}</span>
      <span className="text-xs rounded px-2 py-1 border">{state}</span>
    </button>
  );
}
ToolHeader.displayName = 'ToolHeader';

export function ToolContent({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-3">{children}</div>;
}
ToolContent.displayName = 'ToolContent';

export function ToolInput({ input }: { input: unknown }) {
  return (
    <div className="text-xs bg-muted rounded p-2 mb-2">
      <pre className="overflow-x-auto">{JSON.stringify(input, null, 2)}</pre>
    </div>
  );
}

export function ToolOutput({ output, errorText }: { output?: React.ReactNode; errorText?: string }) {
  if (errorText) {
    return <div className="text-sm text-red-600">{errorText}</div>;
  }
  return <div className="text-sm">{output}</div>;
}


