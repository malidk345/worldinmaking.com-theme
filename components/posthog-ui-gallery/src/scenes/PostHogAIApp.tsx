import React, { useState } from 'react'
import {
  LemonButton,
  LemonInput,
  LemonTag,
  LemonBadge,
  LemonDivider,
  ProfilePicture,
  LemonSegmentedButton,
} from '../components/lemon-ui'
import {
  IconSearch,
  IconInfo,
  IconGear,
  IconPlus,
  IconChevronRight,
  IconChevronDown,
  IconLink,
  IconExternal,
} from '../components/icons'

export interface AIMessage {
  id: string
  sender: 'user' | 'ai'
  authorName: string
  timestamp: string
  content: string
  reasoningSteps?: string[]
  vizQuery?: {
    event: string
    breakdown: string
    dateRange: string
    data: { label: string; count: number; percentage: string }[]
  }
  suggestions?: string[]
}

export interface PostHogAIAppProps {
  onBack?: () => void
}

export function PostHogAIApp({ onBack }: PostHogAIAppProps = {}): JSX.Element {
  const [inputPrompt, setInputPrompt] = useState('')
  const [reasoningExpanded, setReasoningExpanded] = useState(true)

  // 1:1 Monorepo Mock Replica matching PostHog's exact Storybook story: scenes-app-posthog-ai--thread
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'human-1',
      sender: 'user',
      authorName: "You (Paul D'Amora)",
      timestamp: '2023-01-28 14:00',
      content: 'What are my most popular pages?',
    },
    {
      id: 'ai-thread-1',
      sender: 'ai',
      authorName: 'Max (PostHog AI)',
      timestamp: '2023-01-28 14:00',
      reasoningSteps: [
        'Picking relevant events and properties ($pageview, $current_url)',
        'Generating trends query breakdown by $current_url over last 30 days',
      ],
      vizQuery: {
        event: '$pageview',
        breakdown: '$current_url',
        dateRange: '-30d',
        data: [
          { label: '/docs/getting-started', count: 14250, percentage: '100%' },
          { label: '/pricing', count: 9840, percentage: '69.0%' },
          { label: '/blog/posthog-vs-mixpanel', count: 6420, percentage: '45.0%' },
          { label: '/changelog/3000-ui', count: 3810, percentage: '26.7%' },
        ],
      },
      content:
        'Here is the breakdown of your most popular pages over the last 30 days based on `$pageview` event volume.\n\n`/docs/getting-started` is leading with **14,250** total views, followed closely by `/pricing` (**9,840** views).',
      suggestions: [
        'Filter out internal team traffic',
        'Break down by referral domain',
        'Create a Notebook from this query',
      ],
    },
  ])

  const handleSendPrompt = (promptText?: string) => {
    const text = (promptText || inputPrompt).trim()
    if (!text) return

    const userMsg: AIMessage = {
      id: `human-${Date.now()}`,
      sender: 'user',
      authorName: "You (Paul D'Amora)",
      timestamp: 'Just now',
      content: text,
    }

    const aiMsg: AIMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      authorName: 'Max (PostHog AI)',
      timestamp: 'Just now',
      reasoningSteps: [
        `Analyzing query scope for "${text}"`,
        'Executing HogQL query on ClickHouse events table',
      ],
      content: `Ran query for **"${text}"**.\n\nData processing succeeded. Event counts and user engagement trends are healthy.`,
      suggestions: ['View raw SQL', 'Save to Dashboard'],
    }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInputPrompt('')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-3000)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Glassmorphism Blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 78, 0, 0.16) 0%, rgba(245, 78, 0, 0) 70%)',
          filter: 'blur(65px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '15%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '920px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          zIndex: 1,
        }}
      >
        <div
          className="posthog-glass-panel"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <header
            className="posthog-glass"
            style={{
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {onBack && (
                <LemonButton size="small" type="tertiary" onClick={onBack}>
                  ← Back
                </LemonButton>
              )}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-posthog-3000-50, #f5f5f4)',
                  border: '1px solid var(--border-3000)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}
              >
                🦔
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-title)' }}>
                    Max (PostHog AI)
                  </span>
                  <LemonBadge status="success" />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Storybook: <code>scenes-app-posthog-ai--thread</code>
                </div>
              </div>
            </div>

            <LemonTag type="highlight">PostHog AI Thread</LemonTag>
          </header>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.sender === 'ai' && <span style={{ fontSize: '1rem' }}>🦔</span>}
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{msg.authorName}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{msg.timestamp}</span>
                  {msg.sender === 'user' && <ProfilePicture name="Paul D'Amora" email="paul@posthog.com" size="xs" />}
                </div>

                {/* AI Reasoning Step Box */}
                {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                  <div
                    className="posthog-glass"
                    style={{
                      borderRadius: 'var(--radius)',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.375rem',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      onClick={() => setReasoningExpanded(!reasoningExpanded)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span>🧠</span>
                        <span>AI Reasoning Steps ({msg.reasoningSteps.length})</span>
                      </div>
                      <span>{reasoningExpanded ? '▲' : '▼'}</span>
                    </div>

                    {reasoningExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {msg.reasoningSteps.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-3000)' }}>
                            <span style={{ color: 'var(--color-accent, #1d4ed8)', fontWeight: 700 }}>✓</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Trends Visualization Card */}
                {msg.vizQuery && (
                  <div
                    className="posthog-glass"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                      border: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                        📊 Trends Query: {msg.vizQuery.event} breakdown by {msg.vizQuery.breakdown}
                      </div>
                      <LemonTag type="option">{msg.vizQuery.dateRange}</LemonTag>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {msg.vizQuery.data.map((item) => (
                        <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.label}</span>
                            <span><strong>{item.count.toLocaleString()}</strong> ({item.percentage})</span>
                          </div>
                          <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: item.percentage,
                                backgroundColor: 'var(--color-accent, #1d4ed8)',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Content */}
                <div
                  className="posthog-glass"
                  style={{
                    padding: '0.875rem 1.125rem',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    color: 'var(--text-3000)',
                    border: msg.sender === 'user' ? '1px solid var(--color-accent, #1d4ed8)' : '1px solid rgba(0,0,0,0.08)',
                    backgroundColor: msg.sender === 'user' ? 'rgba(29, 78, 216, 0.04)' : 'rgba(255, 255, 255, 0.78)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {msg.suggestions.map((sug) => (
                      <LemonButton
                        key={sug}
                        size="xsmall"
                        type="tertiary"
                        onClick={() => handleSendPrompt(sug)}
                        style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.7)' }}
                      >
                        ✨ {sug}
                      </LemonButton>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Fixed Input Bar at Bottom */}
          <div
            className="posthog-glass"
            style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <LemonInput
                  placeholder="Ask PostHog AI anything about your events, HogQL, or session recordings..."
                  value={inputPrompt}
                  onChange={setInputPrompt}
                  onPressEnter={() => handleSendPrompt()}
                />
              </div>
              <LemonButton
                type="primary"
                disabled={!inputPrompt.trim()}
                onClick={() => handleSendPrompt()}
              >
                Send
              </LemonButton>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              <span>Model: <strong>Claude 3.5 Sonnet (HogAI Engine)</strong></span>
              <span>Press Enter to send</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
