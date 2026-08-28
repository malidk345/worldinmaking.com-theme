import React, { useState, useEffect } from 'react'
import { loadByokConfigs, saveByokConfig, removeByokKey, type ByokProviderConfig } from '../../../lib/byok-vault'
import { Key, ChevronDown, ChevronUp, Check, X, Shield, Sparkles } from 'lucide-react'

export const ByokSidebarPanel: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [configs, setConfigs] = useState<Record<string, ByokProviderConfig>>({})
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})
    const [savedId, setSavedId] = useState<string | null>(null)

    useEffect(() => {
        setConfigs(loadByokConfigs())

        const handleUpdate = () => {
            setConfigs(loadByokConfigs())
        }
        window.addEventListener('wim_byok_updated', handleUpdate)
        return () => window.removeEventListener('wim_byok_updated', handleUpdate)
    }, [])

    const activeCount = Object.values(configs).filter((c) => c.enabled && c.apiKey.trim()).length

    const handleKeyChange = (providerId: string, value: string) => {
        setTestResults((prev) => {
            const next = { ...prev }
            delete next[providerId]
            return next
        })
        setConfigs((prev) => {
            const current = prev[providerId]
            if (!current) return prev
            return {
                ...prev,
                [providerId]: {
                    ...current,
                    apiKey: value,
                    enabled: value.trim().length > 0,
                },
            }
        })
    }

    const handleTestKey = async (providerId: string) => {
        const conf = configs[providerId]
        if (!conf || !conf.apiKey.trim()) return
        setTestingId(providerId)
        try {
            const res = await fetch('/api/byok/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId, apiKey: conf.apiKey.trim() }),
            })
            const data = await res.json()
            if (data.valid) {
                setTestResults((prev) => ({ ...prev, [providerId]: { ok: true, message: 'Verified ✓' } }))
                const updated = { ...conf, enabled: true, status: 'valid' as const }
                saveByokConfig(updated)
                setConfigs(loadByokConfigs())
                setSavedId(providerId)
                setTimeout(() => setSavedId(null), 2500)
            } else {
                setTestResults((prev) => ({
                    ...prev,
                    [providerId]: { ok: false, message: data.error || 'Invalid API Key' },
                }))
            }
        } catch {
            setTestResults((prev) => ({ ...prev, [providerId]: { ok: false, message: 'Connection error' } }))
        } finally {
            setTestingId(null)
        }
    }

    const handleSave = (providerId: string) => {
        const conf = configs[providerId]
        if (conf) {
            saveByokConfig(conf)
            setSavedId(providerId)
            setTimeout(() => setSavedId(null), 2500)
        }
    }

    const handleRemove = (providerId: string) => {
        removeByokKey(providerId)
        setTestResults((prev) => {
            const next = { ...prev }
            delete next[providerId]
            return next
        })
        setConfigs(loadByokConfigs())
    }

    return (
        <div className="border-t border-primary/40 pt-2 px-2 pb-2 font-sans">
            {/* Accordion Header */}
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-secondary hover:bg-accent hover:text-primary transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-muted" />
                    <span className="font-medium">Custom API Keys (BYOK)</span>
                    {activeCount > 0 && (
                        <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold">
                            {activeCount} active
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-muted" />}
            </button>

            {/* Expandable Body */}
            {isExpanded && (
                <div className="mt-2 space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                    <div className="rounded-md border border-primary/30 bg-secondary/20 p-2 text-[11px] text-secondary leading-relaxed flex items-start gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Keys are stored locally on this device with zero server persistence and forwarded directly to the LLM provider.</span>
                    </div>

                    {Object.values(configs).map((conf) => {
                        const hasKey = Boolean(conf.apiKey && conf.apiKey.trim())
                        const result = testResults[conf.providerId]
                        const isSaved = savedId === conf.providerId

                        return (
                            <div
                                key={conf.providerId}
                                className="rounded-md border border-primary/40 bg-primary/40 p-2 space-y-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-primary">{conf.name}</span>
                                    {conf.enabled && hasKey ? (
                                        <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-medium">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="rounded bg-secondary/30 text-muted px-1.5 py-0.2 text-[9px]">
                                            Default
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <input
                                        type="password"
                                        placeholder={`${conf.name} API Key...`}
                                        value={conf.apiKey || ''}
                                        onChange={(e) => handleKeyChange(conf.providerId, e.target.value)}
                                        className="w-full rounded border border-primary/50 bg-secondary/30 px-2 py-1 text-[11px] font-mono text-primary placeholder:text-muted focus:border-primary focus:outline-none"
                                    />

                                    {result && (
                                        <div
                                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                result.ok
                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                            }`}
                                        >
                                            {result.message}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1 pt-0.5">
                                        {hasKey && (
                                            <button
                                                type="button"
                                                disabled={testingId === conf.providerId}
                                                onClick={() => handleTestKey(conf.providerId)}
                                                className="flex-1 rounded border border-primary/40 bg-secondary/40 hover:bg-accent px-2 py-0.8 text-[10px] font-medium text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {testingId === conf.providerId ? 'Testing...' : 'Test'}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleSave(conf.providerId)}
                                            className="flex-1 rounded border border-primary/40 bg-secondary/40 hover:bg-accent px-2 py-0.8 text-[10px] font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            {isSaved ? 'Saved ✓' : 'Save'}
                                        </button>

                                        {hasKey && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(conf.providerId)}
                                                className="rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 px-1.5 py-0.8 text-[10px] transition-colors cursor-pointer"
                                                title="Remove key"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
