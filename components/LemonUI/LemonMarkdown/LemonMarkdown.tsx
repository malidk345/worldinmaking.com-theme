import React, { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../lemon-ui.css';

export interface LemonMarkdownProps {
  children?: ReactNode;
  markdown?: string;
  className?: string;
}

export function LemonMarkdown({ children, markdown, className = '' }: LemonMarkdownProps) {
  const content = markdown || (typeof children === 'string' ? children : null);

  return (
    <div className={`LemonMarkdown ${className}`}>
      {content ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      ) : (
        children
      )}
    </div>
  );
}
