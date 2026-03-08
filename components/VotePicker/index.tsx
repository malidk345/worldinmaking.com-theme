"use client"

import React, { useRef, useState } from 'react'
import './styles.css'

interface VotePickerProps {
    count: number
    onIncrement: () => void
    onDecrement: () => void
    /** Highlights the pill when the user has already voted */
    active?: boolean
    disabled?: boolean
    className?: string
}

export default function VotePicker({
    count,
    onIncrement,
    onDecrement,
    active = false,
    disabled = false,
    className = '',
}: VotePickerProps) {
    // Track the previous count so we can animate direction
    const prevRef = useRef(count)
    const [animKey, setAnimKey] = useState(0)
    const [animDir, setAnimDir] = useState<'up' | 'down'>('up')

    // Called right before we update; derive direction from counts
    const triggerAnim = (next: number) => {
        setAnimDir(next > prevRef.current ? 'up' : 'down')
        prevRef.current = next
        setAnimKey(k => k + 1)
    }

    const handleIncrement = () => {
        triggerAnim(count + 1)
        onIncrement()
    }

    const handleDecrement = () => {
        triggerAnim(count - 1)
        onDecrement()
    }

    return (
        <div
            className={`vote-picker${active ? ' vote-picker--active' : ''}${className ? ' ' + className : ''}`}
            data-active={active || undefined}
        >
            {/* − button */}
            <button
                type="button"
                aria-label="remove vote"
                className="vote-picker__btn vote-picker__btn--left"
                onClick={handleDecrement}
                disabled={disabled}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    width="12" height="12">
                    <path d="M5 12h14" />
                </svg>
            </button>

            {/* Animated number */}
            <div className="vote-picker__track" aria-live="polite" aria-atomic="true">
                <span
                    key={animKey}
                    className={`vote-picker__num vote-picker__num--${animDir}`}
                >
                    {count}
                </span>
            </div>

            {/* + button */}
            <button
                type="button"
                aria-label="upvote"
                className="vote-picker__btn vote-picker__btn--right"
                onClick={handleIncrement}
                disabled={disabled}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    width="12" height="12">
                    <path d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
        </div>
    )
}
