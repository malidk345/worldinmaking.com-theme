import Avatar from 'components/Squeak/components/Avatar'
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
                    className="rounded-full overflow-hidden border border-primary bg-primary inline-flex shrink-0"
                    style={{
                        width: size,
                        height: size,
                        marginLeft: index === 0 ? 0 : -overlap,
                        zIndex: visible.length - index,
                        boxShadow: '0 0 0 1px rgb(var(--bg, 255 255 255))',
                    }}
                >
                    <Avatar className="size-full" image={face.avatar || null} />
                </span>
            ))}
            {extra > 0 ? (
                <span className="ml-1 text-xs text-muted shrink-0">+{extra}</span>
            ) : null}
        </span>
    )
}
