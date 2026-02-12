import React from 'react'

interface CodeBlockProps {
    code: string
    language?: string
    className?: string
}

export default function CodeBlock({ code, language = 'text', className = '' }: CodeBlockProps): JSX.Element {
    return (
        <pre className={`bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto text-sm font-mono ${className}`}>
            <code className={`language-${language}`}>{code}</code>
        </pre>
    )
}
