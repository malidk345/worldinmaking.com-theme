import React, { useState, useEffect } from 'react'
import { loadByokConfigs, saveByokConfig, removeByokKey, type ByokProviderConfig } from '../../lib/byok-vault'
import { Lock, Check, X, ExternalLink, Sparkles } from 'lucide-react'

interface ApiKeysModalProps {
    isOpen: boolean
    onClose: () => void
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({ isOpen, onClose }) => {
    const [configs, setConfigs] = useState<Record<string, ByokProviderConfig>>({})
    const [savedMsg, setSavedMsg] = useState<string | null>(null)
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})

    useEffect(() => {
        if (isOpen) {
            setConfigs(loadByokConfigs())
        }
    }, [isOpen])

    if (!isOpen) return null

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
                setTestResults((prev) => ({ ...prev, [providerId]: { ok: true, message: 'Doğrulandı ✓' } }))
                // Automatically enable and save valid key
                const updated = { ...conf, enabled: true, status: 'valid' as const }
                saveByokConfig(updated)
                setConfigs(loadByokConfigs())
            } else {
                setTestResults((prev) => ({ ...prev, [providerId]: { ok: false, message: data.error || 'Doğrulama başarısız' } }))
            }
        } catch (e) {
            setTestResults((prev) => ({ ...prev, [providerId]: { ok: false, message: 'Bağlantı hatası' } }))
        } finally {
            setTestingId(null)
        }
    }

    const handleSave = (providerId: string) => {
        const conf = configs[providerId]
        if (conf) {
            saveByokConfig(conf)
            setSavedMsg(`${conf.name} anahtarı kaydedildi.`)
            setTimeout(() => setSavedMsg(null), 3000)
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
        setSavedMsg(`${providerId.toUpperCase()} anahtarı kaldırıldı.`)
        setTimeout(() => setSavedMsg(null), 3000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c202a] text-[#2d3748] dark:text-[#e2e8f0] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-[#e2e8f0] dark:border-[#333d4f] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] dark:border-[#333d4f] bg-[#f8fafc] dark:bg-[#181b24]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight">Kendi API Anahtarını Kullan (BYOK)</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Özel ve kurumsal API anahtarlarınızı doğrudan tarayıcınızda güvenle saklayın.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
                    {savedMsg && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            <span>{savedMsg}</span>
                        </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                        <strong>🔒 Sıfır Sunucu Kaydı:</strong> Girdiğiniz özel API anahtarları asla sunucularımızda saklanmaz. Sadece tarayıcınızın yerel hafızasında tutulur ve doğrudan ilgili LLM sağlayıcısına iletilir.
                    </div>

                    {Object.values(configs).map((conf) => (
                        <div
                            key={conf.providerId}
                            className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#202532] space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <span>{conf.name}</span>
                                    {conf.enabled && conf.apiKey ? (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                            Aktif
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                            Devre Dışı
                                        </span>
                                    )}
                                </div>
                                {testResults[conf.providerId] && (
                                    <span
                                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                            testResults[conf.providerId].ok
                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                        }`}
                                    >
                                        {testResults[conf.providerId].message}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    placeholder={`${conf.name} API Key (örn. sk-...)`}
                                    value={conf.apiKey || ''}
                                    onChange={(e) => handleKeyChange(conf.providerId, e.target.value)}
                                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181b24] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                                {conf.apiKey.trim() && (
                                    <button
                                        type="button"
                                        disabled={testingId === conf.providerId}
                                        onClick={() => handleTestKey(conf.providerId)}
                                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 transition active:scale-95 disabled:opacity-50"
                                    >
                                        {testingId === conf.providerId ? 'Test ediliyor…' : 'Test Et'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSave(conf.providerId)}
                                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
                                >
                                    Kaydet
                                </button>
                                {conf.apiKey && (
                                    <button
                                        onClick={() => handleRemove(conf.providerId)}
                                        className="px-3 py-2 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 transition"
                                    >
                                        Sil
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-[#e2e8f0] dark:border-[#333d4f] bg-[#f8fafc] dark:bg-[#181b24] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ApiKeysModal
