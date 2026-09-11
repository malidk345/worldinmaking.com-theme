import React, { useState, useRef, useEffect } from 'react'
import {
  IconExternal,
  IconSidePanel,
  IconThumbsUp,
  IconThumbsDown,
  IconCopy,
  IconRefresh,
  IconEye,
  IconChevronDown,
  IconArrowRight,
  IconAtSign,
  IconShuffle,
  IconPlus,
  IconX,
  IconSparkles,
  IconSearch,
  IconCode,
} from '@posthog/icons'
import { LemonButton, LemonTag, LemonBanner, LemonCard } from '../LemonUI'

export interface PostHogOfficialStorybookAppProps {
  onClose?: () => void
}

export function PostHogOfficialStorybookApp({ onClose }: PostHogOfficialStorybookAppProps): JSX.Element {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState('Auto')
  const [showContextPicker, setShowContextPicker] = useState(false)
  const [activeContexts, setActiveContexts] = useState<string[]>([])
  const [showBanner, setShowBanner] = useState(true)

  const threadRef = useRef<HTMLDivElement>(null)

  const handleSend = (overrideText?: string) => {
    const textToSend = overrideText || input
    if (!textToSend.trim() || loading) return

    const userMsg = {
      id: `human-${Date.now()}`,
      type: 'human',
      contextBadge: activeContexts.length > 0 ? `With ${activeContexts.length} item` : undefined,
      content: textToSend.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!overrideText) setInput('')
    setLoading(true)

    setTimeout(() => {
      const aiMsg = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `Analyzed query **"${textToSend}"** with PostHog telemetry engine.\n\nHere is the HogQL analysis & event schema query:\n\`\`\`sql\nSELECT properties.$current_url, count(*)\nFROM events\nWHERE event = '$pageview'\nGROUP BY properties.$current_url\nORDER BY count(*) DESC\nLIMIT 10\n\`\`\``,
        reasoning: [
          'Matched telemetry tag against PostHog event dictionary',
          'Evaluated property bindings ($current_url, $pathname)',
          'Generated optimized HogQL query execution plan',
        ],
      }
      setMessages((prev) => [...prev, aiMsg])
      setLoading(false)
    }, 1200)
  }

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, loading])

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f4f3] dark:bg-[#18191c] text-[#1d1f26] dark:text-[#f0f0f0] font-sans select-none relative overflow-hidden">
      {/* ── Official Storybook Header Bar (`ChatHeader`) ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#23252e] border-b border-[var(--lemon-border)] flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--lemon-text-primary)]">
          <span className="font-bold font-rounded">PostHog AI</span>
          <span className="text-xs text-[var(--lemon-text-muted)] font-mono">/ New chat</span>
        </div>

        <div className="flex items-center gap-2">
          <LemonButton
            type="secondary"
            size="small"
            sideIcon={<IconExternal style={{ width: 14, height: 14 }} />}
            onClick={() => {
              if (typeof window !== 'undefined') navigator.clipboard.writeText(window.location.href)
            }}
          >
            Copy link
          </LemonButton>
          <LemonButton
            type="secondary"
            size="small"
            sideIcon={<IconSidePanel style={{ width: 14, height: 14 }} />}
          >
            Open in context panel
          </LemonButton>
          {onClose && (
            <LemonButton
              type="tertiary"
              size="small"
              icon={<IconX style={{ width: 14, height: 14 }} />}
              onClick={onClose}
            />
          )}
        </div>
      </div>

      {/* ── Thread & Intro Area ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col items-center" ref={threadRef}>
        <div className="w-full max-w-2xl flex flex-col gap-6 items-center">
          {/* Official Storybook Intro Section */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 w-full">
              {/* PostHog Logomark Icon */}
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center text-xl font-bold font-mono shadow-xs">
                🦔
              </div>

              {/* Headline & Subheadline from Intro.tsx */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-rounded text-[var(--lemon-text-primary)]">
                  What would you like to build or analyze today?
                </h2>
                <div className="text-xs text-[var(--lemon-text-muted)] italic">
                  Build something people want.
                </div>
              </div>

              {/* Official AI Liability Notice Banner */}
              {showBanner && (
                <div className="w-full max-w-lg mt-2">
                  <LemonBanner type="ai" onClose={() => setShowBanner(false)}>
                    PostHog AI uses third-party LLM providers. Your data will not be used for training third-party models.
                  </LemonBanner>
                </div>
              )}

              {/* Suggestions Row from Suggestions.tsx */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full pt-3">
                {[
                  { label: 'Analyze web traffic', icon: '📈', query: 'Show me $pageview telemetry trends for the last 7 days' },
                  { label: 'Debug DOM click logs', icon: '🔍', query: 'Query $autocapture button clicks on main landing page' },
                  { label: 'User identification', icon: '👤', query: 'How do I bind user traits with $identify in HogQL?' },
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug.query)}
                    className="p-3 bg-white dark:bg-[#23252e] border border-[var(--lemon-border)] hover:border-blue-500 rounded-xl text-left shadow-xs transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 group"
                  >
                    <span className="text-base">{sug.icon}</span>
                    <span className="text-xs font-semibold text-[var(--lemon-text-primary)] group-hover:text-blue-600 transition-colors">
                      {sug.label}
                    </span>
                    <span className="text-[10px] text-[var(--lemon-text-muted)] line-clamp-1">
                      {sug.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Listing */}
          {messages.map((msg) => (
            <div key={msg.id} className={`w-full flex flex-col ${msg.type === 'human' ? 'items-end' : 'items-start'}`}>
              {/* Human Message Bubble */}
              {msg.type === 'human' && (
                <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
                  {msg.contextBadge && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-white dark:bg-[#23252e] border border-[var(--lemon-border)] px-2 py-0.5 rounded-md shadow-2xs font-mono">
                      <span>📄</span>
                      <span>{msg.contextBadge}</span>
                    </div>
                  )}
                  <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm font-medium">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* AI Response Card */}
              {msg.type === 'ai' && (
                <div className="flex flex-col gap-2 max-w-[95%] w-full">
                  {/* Reasoning Trace */}
                  {msg.reasoning && (
                    <div className="bg-[var(--lemon-bg-alt)] border border-[var(--lemon-border)] rounded-xl p-3 text-xs space-y-1 font-mono">
                      <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-[11px] uppercase tracking-wider">
                        <IconSparkles className="w-3.5 h-3.5" />
                        <span>Reasoning Trace</span>
                      </div>
                      {msg.reasoning.map((step: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-[var(--lemon-text-secondary)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#23252e] border border-[var(--lemon-border)] rounded-2xl p-5 text-sm text-[var(--lemon-text-primary)] leading-relaxed shadow-xs space-y-3 font-sans">
                    {msg.content.split('```').map((chunk: string, i: number) => {
                      if (i % 2 === 1) {
                        return (
                          <div key={i} className="my-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 font-code text-xs">
                            <div className="px-3 py-1.5 bg-slate-800 text-slate-400 text-[10px] font-mono border-b border-slate-700">
                              SQL / HogQL
                            </div>
                            <pre className="p-3 text-xs font-mono text-blue-300 overflow-x-auto">
                              <code>{chunk.replace(/^sql\n/, '')}</code>
                            </pre>
                          </div>
                        )
                      }
                      return <p key={i}>{chunk}</p>
                    })}
                  </div>

                  {/* AI Action Icons */}
                  <div className="flex items-center gap-2 text-[var(--lemon-text-muted)] px-1 pt-1">
                    <button className="hover:text-[var(--lemon-text-primary)] transition-colors p-1 rounded hover:bg-[var(--lemon-bg-muted)]" title="Helpful">
                      <IconThumbsUp style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="hover:text-[var(--lemon-text-primary)] transition-colors p-1 rounded hover:bg-[var(--lemon-bg-muted)]" title="Unhelpful">
                      <IconThumbsDown style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="hover:text-[var(--lemon-text-primary)] transition-colors p-1 rounded hover:bg-[var(--lemon-bg-muted)]" title="Copy response">
                      <IconCopy style={{ width: 14, height: 14 }} />
                    </button>
                    <button className="hover:text-[var(--lemon-text-primary)] transition-colors p-1 rounded hover:bg-[var(--lemon-bg-muted)]" title="Regenerate">
                      <IconRefresh style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[var(--lemon-text-muted)] text-xs py-2 font-mono">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>PostHog AI is analyzing telemetry data…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Official Storybook Question Input Container (`QuestionInput`) ── */}
      <div className="p-4 sm:p-6 flex justify-center flex-shrink-0">
        <div className="w-full max-w-2xl bg-white dark:bg-[#23252e] border border-[var(--lemon-border-strong)] rounded-2xl p-4 shadow-md flex flex-col gap-3 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask follow-up or type / for commands..."
            rows={2}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-[var(--lemon-text-primary)] placeholder-[var(--lemon-text-muted)] font-sans"
          />

          {/* Bottom Toolbar inside QuestionInput */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--lemon-border)]">
            <div className="flex items-center gap-2 relative">
              <LemonButton
                type="secondary"
                size="xsmall"
                sideIcon={<IconChevronDown style={{ width: 12, height: 12 }} />}
                icon={<IconShuffle style={{ width: 13, height: 13 }} />}
              >
                {selectedMode}
              </LemonButton>

              <LemonButton
                type="secondary"
                size="xsmall"
                sideIcon={<IconChevronDown style={{ width: 12, height: 12 }} />}
                icon={<IconAtSign style={{ width: 13, height: 13 }} />}
                onClick={() => setShowContextPicker((v) => !v)}
              >
                Add context
              </LemonButton>

              {/* Active Context Chips */}
              {activeContexts.map((ctx, i) => (
                <LemonTag key={i} type="completion" size="small" onClose={() => setActiveContexts(activeContexts.filter((_, idx) => idx !== i))}>
                  {ctx}
                </LemonTag>
              ))}

              {/* Context Picker Dropdown */}
              {showContextPicker && (
                <LemonCard className="absolute left-16 bottom-full mb-2 w-52 p-2 flex flex-col gap-1 z-50 text-xs shadow-xl">
                  <div className="text-[10px] font-bold text-[var(--lemon-text-muted)] uppercase px-2 py-1">Attach Telemetry Context</div>
                  <button
                    className="text-left px-2 py-1.5 hover:bg-[var(--lemon-bg-muted)] rounded flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setActiveContexts((prev) => [...prev, '$pageview'])
                      setShowContextPicker(false)
                    }}
                  >
                    $pageview event
                  </button>
                  <button
                    className="text-left px-2 py-1.5 hover:bg-[var(--lemon-bg-muted)] rounded flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setActiveContexts((prev) => [...prev, '$autocapture'])
                      setShowContextPicker(false)
                    }}
                  >
                    $autocapture event
                  </button>
                  <button
                    className="text-left px-2 py-1.5 hover:bg-[var(--lemon-bg-muted)] rounded flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setActiveContexts((prev) => [...prev, '$identify'])
                      setShowContextPicker(false)
                    }}
                  >
                    $identify person
                  </button>
                </LemonCard>
              )}
            </div>

            {/* Circular Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                input.trim()
                  ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 shadow-sm'
                  : 'bg-[var(--lemon-bg-muted)] text-[var(--lemon-text-muted)] cursor-not-allowed'
              }`}
            >
              <IconArrowRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
