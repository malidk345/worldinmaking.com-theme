import React from 'react'
export enum Language { Text = 'text', SQL = 'sql', JSON = 'json', Bash = 'bash', Python = 'python', Mermaid = 'mermaid' }
export function CodeSnippet({ children }: { children?: React.ReactNode; language?: Language; [k: string]: any }): JSX.Element {
    return React.createElement('pre', {
        style: { background: '#1e1e1e', color: '#d4d4d4', padding: '12px', borderRadius: '4px', overflow: 'auto', fontFamily: 'monospace', fontSize: '13px', margin: 0 }
    }, React.createElement('code', {}, children))
}
