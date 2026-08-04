import React from 'react'

// Shim: Monaco is not bundled in this build.
// A simple textarea is used as fallback.
export function CodeEditor({
    value,
    onChange,
    language,
}: {
    value?: string
    onChange?: (val: string) => void
    language?: string
    [key: string]: any
}): JSX.Element {
    return React.createElement('textarea', {
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
        style: {
            width: '100%',
            height: '100%',
            background: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '8px',
            border: 'none',
            resize: 'none',
        },
    })
}
