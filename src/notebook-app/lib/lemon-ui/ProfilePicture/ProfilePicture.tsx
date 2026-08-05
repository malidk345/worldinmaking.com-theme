import React from 'react'

export interface ProfilePictureProps {
    user?: {
        first_name?: string
        last_name?: string
        email?: string
        avatar_url?: string
    } | null
    name?: string
    email?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    showName?: boolean
    className?: string
    title?: string
    index?: number
}

const LETTERMARK_COLORS = [
    { bg: '#1d4ed8', text: '#ffffff' }, // Blue
    { bg: '#5925dc', text: '#ffffff' }, // Purple
    { bg: '#b42318', text: '#ffffff' }, // Red
    { bg: '#12b76a', text: '#ffffff' }, // Green
    { bg: '#f79009', text: '#ffffff' }, // Orange
    { bg: '#0891b2', text: '#ffffff' }, // Cyan
    { bg: '#c026d3', text: '#ffffff' }, // Pink
    { bg: '#475569', text: '#ffffff' }, // Slate
    { bg: '#059669', text: '#ffffff' }, // Emerald
    { bg: '#d97706', text: '#ffffff' }, // Amber
    { bg: '#7c3aed', text: '#ffffff' }, // Violet
    { bg: '#db2777', text: '#ffffff' }, // Rose
]

function getInitialLetter(str?: string): string {
    if (!str || !str.trim()) return '?'
    const clean = str.trim()
    return clean.charAt(0).toUpperCase()
}

function getColorForString(str: string): { bg: string; text: string } {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % LETTERMARK_COLORS.length
    return LETTERMARK_COLORS[index]
}

const SIZE_MAP = {
    xs: { dim: 'w-4 h-4', font: 'text-[10px]' },
    sm: { dim: 'w-4.5 h-4.5', font: 'text-[11px]' },
    md: { dim: 'w-6 h-6', font: 'text-xs' },
    lg: { dim: 'w-8 h-8', font: 'text-sm' },
    xl: { dim: 'w-10 h-10', font: 'text-base' },
}

export function ProfilePicture({
    user,
    name: nameProp,
    email: emailProp,
    size = 'md',
    showName = false,
    className = '',
    title,
    index,
}: ProfilePictureProps): JSX.Element {
    const displayName = user
        ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'User'
        : nameProp || emailProp || 'User'

    const email = user?.email || emailProp
    const avatarUrl = user?.avatar_url
    const initial = getInitialLetter(displayName)

    const colorScheme = typeof index === 'number'
        ? LETTERMARK_COLORS[index % LETTERMARK_COLORS.length]
        : getColorForString(displayName + (email || ''))

    const sizeStyles = SIZE_MAP[size] || SIZE_MAP.md

    const pictureElement = (
        <span
            className={`ProfilePicture ${size} inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 ${sizeStyles.dim} ${sizeStyles.font} ${className}`}
            style={{
                backgroundColor: avatarUrl ? 'transparent' : colorScheme.bg,
                color: colorScheme.text,
            }}
            title={title || (email ? `${displayName} <${email}>` : displayName)}
        >
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        // Hide broken portrait; parent keeps lettermark via empty src swap
                        const img = e.currentTarget
                        img.style.display = 'none'
                        const parent = img.parentElement
                        if (parent && !parent.dataset.fallback) {
                            parent.dataset.fallback = '1'
                            parent.style.backgroundColor = colorScheme.bg
                            parent.appendChild(document.createTextNode(initial))
                        }
                    }}
                />
            ) : (
                initial
            )}
        </span>
    )

    if (!showName) {
        return pictureElement
    }

    return (
        <div className="profile-package" title={email ? `${displayName} <${email}>` : displayName}>
            {pictureElement}
            <span className="profile-name">
                {displayName}
            </span>
        </div>
    )
}
