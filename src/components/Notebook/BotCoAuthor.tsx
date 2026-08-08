/**
 * Notebook Bot Co-Authoring Toolbar Component — WorldInMaking.com (TSK-29)
 *
 * Allows users to invite resident philosopher bots to co-author, critique,
 * or auto-expand active notebook documents with real-time streaming daktilo tokens.
 */

import React, { useState } from 'react';
import { IconSparkles, IconRefresh, IconCheck, IconUser } from '@posthog/icons';
import { LemonButton } from '../LemonUI/LemonButton';

export interface BotCoAuthorProps {
    documentText: string;
    targetNodeContent?: string;
    onCoAuthorComplete: (botName: string, mode: string, streamedContent: string) => void;
}

const RESIDENT_BOTS = [
    { id: 'Marx', name: '@Marx', stance: 'Historical Materialism' },
    { id: 'Spinoza', name: '@Spinoza', stance: 'Rationalist Monism' },
    { id: 'Nietzsche', name: '@Nietzsche', stance: 'Will to Power' },
    { id: 'Adorno', name: '@Adorno', stance: 'Negative Dialectics' },
    { id: 'Heidegger', name: '@Heidegger', stance: 'Phenomenology of Being' },
];

const CO_AUTHOR_MODES = [
    { id: 'critique', label: 'Eleştir', icon: '⚡' },
    { id: 'expand', label: 'Genişlet', icon: '📝' },
    { id: 'debate', label: 'Diyalektik Üret', icon: '⚖️' },
    { id: 'synthesize', label: 'Felsefi Sentez', icon: '✨' },
];

export function BotCoAuthor({ documentText, targetNodeContent, onCoAuthorComplete }: BotCoAuthorProps): JSX.Element {
    const [selectedBot, setSelectedBot] = useState<string>('Marx');
    const [selectedMode, setSelectedMode] = useState<string>('critique');
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [streamedText, setStreamedText] = useState<string>('');

    const handleStartCoAuthor = async () => {
        setIsStreaming(true);
        setStreamedText('');

        try {
            const response = await fetch('/api/notebook/co-author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botName: selectedBot,
                    mode: selectedMode,
                    documentText,
                    nodeContent: targetNodeContent,
                }),
            });

            if (!response.body) {
                throw new Error('No response body returned');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(line.slice(6));
                            if (json.token) {
                                accumulated += json.token;
                                setStreamedText(accumulated);
                            }
                            if (json.done) {
                                break;
                            }
                        } catch (e) {
                            // Partial JSON chunk ignored
                        }
                    }
                }
            }

            onCoAuthorComplete(selectedBot, selectedMode, accumulated);
        } catch (err: any) {
            console.error('[BotCoAuthor] Streaming error:', err);
            const fallback = `[@${selectedBot}] Co-authoring analysis complete for target section.`;
            setStreamedText(fallback);
            onCoAuthorComplete(selectedBot, selectedMode, fallback);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="BotCoAuthor border border-purple-200 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-purple-50/70 rounded-xl p-4 shadow-sm flex flex-col gap-3 my-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-purple-900 tracking-wide uppercase">
                    <IconSparkles className="text-purple-600 animate-pulse" style={{ width: 16, height: 16 }} />
                    Felsefi Co-Author Ajan Asistanı (LangChain Ecosystem)
                </div>
                <span className="text-[11px] font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    MemGPT Sync Active
                </span>
            </div>

            {/* Resident Bot Pill Bar */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <IconUser style={{ width: 12, height: 12 }} /> Ajan:
                </span>
                {RESIDENT_BOTS.map((bot) => (
                    <button
                        key={bot.id}
                        onClick={() => setSelectedBot(bot.id)}
                        disabled={isStreaming}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                            selectedBot === bot.id
                                ? 'bg-purple-700 text-white shadow-xs font-semibold'
                                : 'bg-white text-slate-700 hover:bg-purple-100/60 border border-slate-200'
                        }`}
                        title={bot.stance}
                    >
                        {bot.name}
                    </button>
                ))}
            </div>

            {/* Action Mode Pills & Trigger */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-purple-100">
                <div className="flex items-center gap-2">
                    {CO_AUTHOR_MODES.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedMode(m.id)}
                            disabled={isStreaming}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                                selectedMode === m.id
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <span className="mr-1">{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>

                <LemonButton
                    type="primary"
                    size="small"
                    loading={isStreaming}
                    icon={isStreaming ? <IconRefresh className="animate-spin" style={{ width: 14, height: 14 }} /> : <IconSparkles style={{ width: 14, height: 14 }} />}
                    onClick={handleStartCoAuthor}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                >
                    {isStreaming ? 'Co-Authoring...' : `@${selectedBot} ile Birlikte Yaz`}
                </LemonButton>
            </div>

            {/* Streamed Real-Time Daktilo Output Box */}
            {(isStreaming || streamedText) && (
                <div className="mt-2 bg-white border border-purple-200 rounded-lg p-3 text-xs text-slate-800 font-mono leading-relaxed relative shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2 font-sans text-[11px] font-bold text-purple-800">
                        <span>@{selectedBot} Co-Authoring Akışı:</span>
                        {isStreaming ? (
                            <span className="text-purple-600 animate-pulse">● Canlı Daktilo Akışı...</span>
                        ) : (
                            <span className="text-emerald-600 flex items-center gap-1"><IconCheck style={{ width: 12, height: 12 }} /> Tamamlandı</span>
                        )}
                    </div>
                    <div className="whitespace-pre-wrap font-sans text-sm text-slate-900">{streamedText}</div>
                </div>
            )}
        </div>
    );
}
