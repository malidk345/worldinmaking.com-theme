import React from 'react';
import { CodeSnippet } from './CodeSnippet';

export interface JSONViewerProps {
  src: Record<string, unknown> | Array<unknown>;
  className?: string;
}

export function JSONViewer({ src, className = '' }: JSONViewerProps) {
  const formattedJson = JSON.stringify(src, null, 2);

  return (
    <CodeSnippet language="json" className={className}>
      {formattedJson}
    </CodeSnippet>
  );
}
