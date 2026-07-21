import React from 'react';
import { LemonButton } from '../LemonUI/LemonButton/LemonButton';
import { IconCopy, IconCheck } from '@posthog/icons';

export interface CodeSnippetProps {
  children: string;
  language?: string;
  className?: string;
  wrap?: boolean;
}

export function CodeSnippet({ children, language = 'javascript', className = '', wrap = false }: CodeSnippetProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`CodeSnippet relative border border-[var(--border-3000)] rounded bg-[var(--color-accent-3000)] p-3 font-mono text-xs ${className}`}>
      <div className="absolute top-2 right-2">
        <LemonButton
          icon={copied ? <IconCheck className="size-3.5 text-emerald-500" /> : <IconCopy className="size-3.5" />}
          size="xsmall"
          type="tertiary"
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </LemonButton>
      </div>
      <pre className={`overflow-x-auto pr-16 ${wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
        <code className={`language-${language}`}>{children}</code>
      </pre>
    </div>
  );
}
