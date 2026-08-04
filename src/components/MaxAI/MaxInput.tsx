import React, { useRef } from 'react'
import clsx from 'clsx'
import { IconSparkles } from '@posthog/icons'
import { LemonButton } from 'components/LemonUI/LemonButton'
import { LemonInput } from 'components/LemonUI/LemonInput'

interface MaxInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    loading?: boolean
    disabled?: boolean
    placeholder?: string
}

export function MaxInput({
    value,
    onChange,
    onSubmit,
    loading = false,
    disabled = false,
    placeholder = 'Ask anything about your product, data, or philosophy…',
}: MaxInputProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null)

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!disabled && !loading && value.trim()) {
                onSubmit()
            }
        }
    }

    return (
        <div className="MaxInput">
            <LemonInput
                inputRef={inputRef}
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                fullWidth
                size="medium"
                disabled={disabled || loading}
                suffix={
                    <LemonButton
                        type="primary"
                        size="small"
                        disabled={!value.trim() || loading}
                        loading={loading}
                        onClick={onSubmit}
                        icon={<IconSparkles style={{ width: 14, height: 14 }} />}
                        noPadding={false}
                        style={{ marginRight: -6 }}
                    >
                        Ask
                    </LemonButton>
                }
            />
            <div className="MaxInput__hint">
                <span>
                    Press <kbd>Enter</kbd> to send
                </span>
            </div>
        </div>
    )
}
