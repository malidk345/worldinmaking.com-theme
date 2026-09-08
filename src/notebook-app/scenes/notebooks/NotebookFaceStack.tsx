import type { NotebookFace } from './notebookFaces'

const MAX_VISIBLE = 3

export function NotebookFaceStack({
    faces,
    size = 24,
}: {
    faces: NotebookFace[]
    size?: number
}): JSX.Element | null {
    if (!faces.length) return null
    const visible = faces.slice(0, MAX_VISIBLE)
    const extra = faces.length - visible.length
    const overlap = Math.round(size * 0.38)

    return (
        <span className="inline-flex items-center shrink-0" aria-hidden={false}>
            {visible.map((face, index) => (
                <span
                    key={face.key}
                    title={`${face.name} · ${face.role}`}
                    className="rounded-full overflow-hidden shrink-0 ring-2 ring-white dark:ring-[#1e1f23]"
                    style={{
                        width: size,
                        height: size,
                        marginLeft: index === 0 ? 0 : -overlap,
                        zIndex: visible.length - index,
                        position: 'relative',
                    }}
                >
                    {face.avatar ? (
                        <img
                            src={face.avatar}
                            alt={face.name}
                            className="block w-full h-full object-cover rounded-full"
                            style={
                                face.avatar.includes('/philosophers/') ||
                                face.avatar.includes('pixel.png')
                                    ? { imageRendering: 'pixelated', objectFit: 'contain' }
                                    : undefined
                            }
                        />
                    ) : (
                        <svg
                            className="block w-full h-full bg-accent rounded-full"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 40 40"
                        >
                            <path d="M0 0h40v40H0z" />
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M21.19 6.57c-5.384-.696-9.938 3.89-9.93 10.343.013.1.026.229.042.378.045.443.11 1.067.262 1.67.883 3.445 2.781 6.077 6.305 7.132 3.117.938 5.86.04 8.14-2.242 3.008-3.016 3.805-8.039 1.891-12.047-1.36-2.844-3.484-4.82-6.71-5.234ZM2.5 40c-.64-1.852 1.119-6.454 2.947-7.61 2.48-1.563 5.076-2.942 7.671-4.32.48-.255.96-.51 1.438-.766.313-.164.899.008 1.29.188 2.827 1.242 5.624 1.25 8.468.03.492-.21 1.242-.241 1.695-.015 2.688 1.367 5.352 2.774 7.961 4.281 2.352 1.36 4.35 6.056 3.53 8.212h-35Z"
                                fill="#fff"
                            />
                        </svg>
                    )}
                </span>
            ))}
            {extra > 0 ? (
                <span className="ml-1 text-xs text-muted shrink-0">+{extra}</span>
            ) : null}
        </span>
    )
}
