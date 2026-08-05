import { motion, type PanInfo } from 'framer-motion'

type ResizeChange = { x: boolean } | { y: boolean } | { x: boolean; y: boolean }

interface WindowResizeHandlesProps {
    onResize: (info: PanInfo, change: ResizeChange, left: boolean) => void
    onResizeEnd: () => void
}

export default function WindowResizeHandles({ onResize, onResizeEnd }: WindowResizeHandlesProps) {
    const handle = (
        direction: 'x' | 'y' | true,
        change: ResizeChange,
        className: string,
        left = false
    ) => (
        <motion.div
            aria-hidden
            className={`absolute z-30 touch-none ${className}`}
            drag={direction}
            dragMomentum={false}
            dragElastic={0}
            onPointerDown={(event) => event.stopPropagation()}
            onDrag={(_, info) => onResize(info, change, left)}
            onDragEnd={onResizeEnd}
        />
    )

    return (
        <>
            {handle('x', { x: true }, 'right-0 top-3 bottom-3 w-1 cursor-ew-resize')}
            {handle('x', { x: true }, 'left-0 top-3 bottom-3 w-1 cursor-ew-resize', true)}
            {handle('y', { y: true }, 'left-3 right-3 bottom-0 h-1 cursor-ns-resize')}
            {handle(true, { x: true, y: true }, 'right-0 bottom-0 size-3 cursor-nwse-resize')}
            {handle(true, { x: true, y: true }, 'left-0 bottom-0 size-3 cursor-nesw-resize', true)}
        </>
    )
}
