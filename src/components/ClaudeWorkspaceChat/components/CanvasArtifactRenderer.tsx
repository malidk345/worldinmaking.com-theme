import React, { useState, useMemo, useRef } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react'

import { CanvasSpec, CanvasNode, CanvasEdge, parseCanvasSpec } from '../../../lib/ai/visual-artifacts'
export type { CanvasSpec, CanvasNode, CanvasEdge }
export { parseCanvasSpec }

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string; badge: string }> = {
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-950/30',
    border: 'border-amber-500/30 dark:border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-300',
    glow: 'shadow-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
    border: 'border-emerald-500/30 dark:border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    glow: 'shadow-emerald-500/10',
    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-950/30',
    border: 'border-rose-500/30 dark:border-rose-500/40',
    text: 'text-rose-700 dark:text-rose-300',
    glow: 'shadow-rose-500/10',
    badge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
  blue: {
    bg: 'bg-sky-500/10 dark:bg-sky-950/30',
    border: 'border-sky-500/30 dark:border-sky-500/40',
    text: 'text-sky-700 dark:text-sky-300',
    glow: 'shadow-sky-500/10',
    badge: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-950/30',
    border: 'border-purple-500/30 dark:border-purple-500/40',
    text: 'text-purple-700 dark:text-purple-300',
    glow: 'shadow-purple-500/10',
    badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  },
  slate: {
    bg: 'bg-slate-500/10 dark:bg-slate-900/40',
    border: 'border-slate-500/30 dark:border-slate-500/40',
    text: 'text-slate-700 dark:text-slate-300',
    glow: 'shadow-slate-500/10',
    badge: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  },
}

export function CanvasArtifactRenderer({ content }: { content: string | unknown }): JSX.Element {
  const spec = useMemo(() => parseCanvasSpec(content), [content])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const draggingNodeRef = useRef<{ id: string; startMouseX: number; startMouseY: number; startNodeX: number; startNodeY: number } | null>(null)

  if (!spec || !spec.nodes || spec.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-muted">
        <div>
          <Layers className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="font-medium">No canvas data found.</p>
          <p className="text-xs opacity-75">Provide nodes and edges in the canvas specification.</p>
        </div>
      </div>
    )
  }

  const nodes = spec.nodes.map((node) => {
    const offset = offsets[node.id] || { x: 0, y: 0 }
    return {
      ...node,
      currentX: (node.x || 0) + offset.x,
      currentY: (node.y || 0) + offset.y,
    }
  })

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = nodeMap.get(nodeId)
    if (!node) return
    draggingNodeRef.current = {
      id: nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: offsets[nodeId]?.x || 0,
      startNodeY: offsets[nodeId]?.y || 0,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingNodeRef.current) return
      const dx = moveEvent.clientX - draggingNodeRef.current.startMouseX
      const dy = moveEvent.clientY - draggingNodeRef.current.startMouseY
      setOffsets((prev) => ({
        ...prev,
        [nodeId]: {
          x: draggingNodeRef.current!.startNodeX + dx,
          y: draggingNodeRef.current!.startNodeY + dy,
        },
      }))
    }

    const handleMouseUp = () => {
      draggingNodeRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Calculate canvas bounding box
  const minX = Math.min(...nodes.map((n) => n.currentX), 0)
  const minY = Math.min(...nodes.map((n) => n.currentY), 0)
  const maxX = Math.max(...nodes.map((n) => n.currentX + 260), 1000)
  const maxY = Math.max(...nodes.map((n) => n.currentY + 160), 700)
  const width = Math.max(maxX - minX + 200, 1200)
  const height = Math.max(maxY - minY + 200, 900)

  return (
    <div className="relative h-full w-full overflow-hidden bg-primary select-none font-sans">
      <TransformWrapper
        initialScale={0.85}
        minScale={0.2}
        maxScale={2.5}
        limitToBounds={false}
        centerOnInit={true}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Top Info & Floating Controls */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/90 px-3 py-1.5 backdrop-blur-md shadow-sm">
              <Layers className="h-4 w-4 text-muted" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-primary">{spec.title || 'Canvas'}</span>
                {spec.description && <span className="text-[10px] text-muted line-clamp-1 max-w-xs">{spec.description}</span>}
              </div>
              <span className="ml-2 rounded bg-accent/60 px-1.5 py-0.5 text-[10px] font-mono text-muted border border-primary/10">
                {nodes.length} nodes
              </span>
            </div>

            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/90 p-1 backdrop-blur-md shadow-sm">
              <button
                type="button"
                onClick={() => zoomIn()}
                title="Zoom In"
                className="flex size-7 items-center justify-center rounded text-muted hover:text-primary hover:bg-accent cursor-pointer transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                title="Zoom Out"
                className="flex size-7 items-center justify-center rounded text-muted hover:text-primary hover:bg-accent cursor-pointer transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                title="Reset View"
                className="flex size-7 items-center justify-center rounded text-muted hover:text-primary hover:bg-accent cursor-pointer transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Canvas World */}
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
              <div
                style={{ width: `${width}px`, height: `${height}px` }}
                className="relative bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] cursor-grab active:cursor-grabbing"
              >
                {/* SVG Edges Layer */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-visible">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" className="text-secondary/70" />
                    </marker>
                  </defs>

                  {spec.edges.map((edge, index) => {
                    const fromNode = nodeMap.get(edge.from)
                    const toNode = nodeMap.get(edge.to)
                    if (!fromNode || !toNode) return null

                    const startX = fromNode.currentX + 130
                    const startY = fromNode.currentY + 45
                    const endX = toNode.currentX + 130
                    const endY = toNode.currentY + 45

                    const dx = endX - startX
                    const dy = endY - startY
                    const cx1 = startX + dx * 0.4
                    const cy1 = startY
                    const cx2 = startX + dx * 0.6
                    const cy2 = endY

                    const isSelected = selectedNodeId === edge.from || selectedNodeId === edge.to

                    return (
                      <g key={`edge-${index}`}>
                        <path
                          d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          strokeDasharray={edge.style === 'dashed' ? '6,4' : edge.style === 'dotted' ? '2,4' : undefined}
                          className={`${
                            isSelected
                              ? 'text-amber-500 dark:text-amber-400 opacity-100 drop-shadow'
                              : 'text-primary/30 dark:text-primary/20 opacity-80'
                          } transition-all duration-150`}
                          markerEnd="url(#arrow)"
                        />
                        {edge.label && (
                          <text
                            x={(startX + endX) / 2}
                            y={(startY + endY) / 2 - 8}
                            textAnchor="middle"
                            className="fill-muted text-[10px] font-medium tracking-wide pointer-events-none select-none bg-primary px-1"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>

                {/* Nodes Layer */}
                {nodes.map((node) => {
                  const theme = COLOR_MAP[node.color || 'slate'] || COLOR_MAP.slate
                  const isSelected = selectedNodeId === node.id

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: `${node.currentX}px`,
                        top: `${node.currentY}px`,
                        width: '260px',
                      }}
                      onMouseDown={(e) => handleMouseDown(node.id, e)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedNodeId(isSelected ? null : node.id)
                      }}
                      className={`group rounded-xl border p-3.5 transition-all duration-150 cursor-move backdrop-blur-md shadow-xs ${
                        theme.bg
                      } ${theme.border} ${theme.glow} ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-primary scale-[1.02] shadow-md z-30'
                          : 'hover:scale-[1.01] hover:shadow z-10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-xs font-semibold ${theme.text} truncate`}>{node.label}</span>
                        </div>
                        {node.type && (
                          <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${theme.badge}`}>
                            {node.type}
                          </span>
                        )}
                      </div>

                      {node.description && (
                        <p className="text-xs text-primary/80 dark:text-primary/70 line-clamp-3 leading-relaxed mb-2">
                          {node.description}
                        </p>
                      )}

                      {node.tags && node.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-primary/10">
                          {node.tags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] text-muted bg-primary/40 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
