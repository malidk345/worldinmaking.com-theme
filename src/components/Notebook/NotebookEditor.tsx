import React, { useState } from 'react'
import {
    IconPlus,
    IconShare,
    IconTrash,
    IconNotebook,
    IconGraph,
    IconCode,
    IconCheckCircle,
    IconSparkles,
    IconEllipsis,
    IconPencil,
} from '@posthog/icons'
import { LemonButton } from '../LemonUI/LemonButton'
import { LemonCard } from '../LemonUI/LemonCard'
import { LemonTag } from '../LemonUI/LemonTag'
import { LemonInput } from '../LemonUI/LemonInput'
import { LemonDivider } from '../LemonUI/LemonDivider'

export interface NotebookNode {
    id: string
    type: 'text' | 'heading' | 'ai_prompt' | 'chart' | 'code' | 'todo'
    content: string
    data?: any
}

export function NotebookEditor(): JSX.Element {
    const [title, setTitle] = useState('Untitled Notebook')
    const [editingTitle, setEditingTitle] = useState(false)
    const [nodes, setNodes] = useState<NotebookNode[]>([
        {
            id: '1',
            type: 'heading',
            content: 'Q3 Product Analytics & Growth Strategy',
        },
        {
            id: '2',
            type: 'text',
            content:
                'This notebook synthesizes telemetry data from $pageview events and user retention cohorts to guide the upcoming roadmap.',
        },
        {
            id: '3',
            type: 'ai_prompt',
            content: 'Max AI Prompt: What are the top drop-off points in our checkout funnel?',
            data: {
                aiResponse:
                    'Drop-off analysis reveals 34.2% exit at the billing address step due to form validation timeouts.',
            },
        },
        {
            id: '4',
            type: 'chart',
            content: 'Weekly Active Users (Retention)',
            data: {
                total: '24,520 WAU',
                change: '+14.2%',
            },
        },
        {
            id: '5',
            type: 'code',
            content:
                'select event, count() from events where timestamp > now() - interval 7 day group by event order by count() desc limit 5',
        },
        {
            id: '6',
            type: 'todo',
            content: 'Review conversion metrics with core team',
            data: { done: true },
        },
    ])

    const addNode = (type: NotebookNode['type']) => {
        const newNode: NotebookNode = {
            id: String(Date.now()),
            type,
            content:
                type === 'heading'
                    ? 'New Section Heading'
                    : type === 'code'
                    ? 'SELECT * FROM events LIMIT 10'
                    : type === 'ai_prompt'
                    ? 'Ask Max AI...'
                    : 'New notebook entry...',
            data: type === 'todo' ? { done: false } : undefined,
        }
        setNodes((prev) => [...prev, newNode])
    }

    const deleteNode = (id: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== id))
    }

    return (
        <div className="NotebookEditor flex flex-col h-full w-full bg-[#f9f9f8] text-[#1d1f26] font-sans">
            {/* ── Notebook Top Action Bar (PostHog exact replicate) ── */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                    <IconNotebook className="text-blue-600" style={{ width: 20, height: 20 }} />
                    {editingTitle ? (
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => setEditingTitle(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                            autoFocus
                            className="font-bold text-lg border-b border-blue-500 outline-none bg-transparent px-1"
                        />
                    ) : (
                        <div
                            onClick={() => setEditingTitle(true)}
                            className="font-bold text-lg text-slate-900 cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded flex items-center gap-2 group"
                        >
                            <span>{title}</span>
                            <IconPencil
                                className="text-slate-400 opacity-0 group-hover:opacity-100"
                                style={{ width: 14, height: 14 }}
                            />
                        </div>
                    )}
                    <LemonTag type="muted" size="small">
                        Draft
                    </LemonTag>
                </div>

                <div className="flex items-center gap-2">
                    <LemonButton type="secondary" size="small" icon={<IconShare style={{ width: 14, height: 14 }} />}>
                        Share
                    </LemonButton>
                    <LemonButton
                        type="primary"
                        size="small"
                        icon={<IconPlus style={{ width: 14, height: 14 }} />}
                        onClick={() => addNode('text')}
                    >
                        Add Entry
                    </LemonButton>
                </div>
            </header>

            {/* ── Notebook Main Canvas ── */}
            <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
                <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col gap-6">
                    {nodes.map((node) => (
                        <div
                            key={node.id}
                            className="group relative flex flex-col gap-2 p-2 hover:bg-slate-50/60 rounded-lg transition-colors"
                        >
                            {/* Delete button on hover */}
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                                <button
                                    onClick={() => deleteNode(node.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                                    title="Delete block"
                                >
                                    <IconTrash style={{ width: 14, height: 14 }} />
                                </button>
                            </div>

                            {/* Heading Node */}
                            {node.type === 'heading' && (
                                <h2 className="text-2xl font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                                    {node.content}
                                </h2>
                            )}

                            {/* Text Node */}
                            {node.type === 'text' && (
                                <p className="text-slate-700 text-base leading-relaxed">{node.content}</p>
                            )}

                            {/* AI Prompt Block */}
                            {node.type === 'ai_prompt' && (
                                <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-4 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 font-semibold text-xs text-purple-700">
                                        <IconSparkles style={{ width: 14, height: 14 }} />
                                        Max AI Analysis
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">{node.content}</div>
                                    {node.data?.aiResponse && (
                                        <div className="bg-white border border-purple-100 rounded-lg p-3 text-xs text-slate-700 mt-1">
                                            {node.data.aiResponse}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Insight / Chart Block */}
                            {node.type === 'chart' && (
                                <LemonCard className="border border-slate-200 p-4 rounded-xl bg-white shadow-xs">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-sm flex items-center gap-2">
                                            <IconGraph className="text-blue-600" style={{ width: 16, height: 16 }} />
                                            {node.content}
                                        </div>
                                        <LemonTag type="primary" size="small">
                                            Insight
                                        </LemonTag>
                                    </div>
                                    <div className="flex items-baseline gap-3 my-2">
                                        <span className="text-xl font-extrabold">{node.data?.total}</span>
                                        <span className="text-xs font-bold text-emerald-600">{node.data?.change}</span>
                                    </div>
                                </LemonCard>
                            )}

                            {/* Code / HogQL Block */}
                            {node.type === 'code' && (
                                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1 text-[11px]">
                                        <span>HogQL Query</span>
                                        <IconCode style={{ width: 14, height: 14 }} />
                                    </div>
                                    <code>{node.content}</code>
                                </div>
                            )}

                            {/* Todo / Checklist Block */}
                            {node.type === 'todo' && (
                                <div className="flex items-center gap-3 py-1">
                                    <input
                                        type="checkbox"
                                        defaultChecked={node.data?.done}
                                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                    />
                                    <span
                                        className={`text-sm ${
                                            node.data?.done ? 'line-through text-slate-400' : 'text-slate-800'
                                        }`}
                                    >
                                        {node.content}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Block Toolbar at bottom */}
                    <div className="flex items-center gap-2 pt-6 border-t border-slate-100">
                        <span className="text-xs text-slate-400 font-medium">Add Block:</span>
                        <LemonButton type="secondary" size="xsmall" onClick={() => addNode('heading')}>
                            + Heading
                        </LemonButton>
                        <LemonButton type="secondary" size="xsmall" onClick={() => addNode('text')}>
                            + Text
                        </LemonButton>
                        <LemonButton type="secondary" size="xsmall" onClick={() => addNode('ai_prompt')}>
                            + AI Analysis
                        </LemonButton>
                        <LemonButton type="secondary" size="xsmall" onClick={() => addNode('chart')}>
                            + Chart
                        </LemonButton>
                        <LemonButton type="secondary" size="xsmall" onClick={() => addNode('code')}>
                            + Code
                        </LemonButton>
                        <LemonButton type="secondary" size="xsmall" onClick={() => addNode('todo')}>
                            + Checklist
                        </LemonButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
