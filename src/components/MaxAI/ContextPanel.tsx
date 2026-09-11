import React, { useState } from 'react'
import { X, Code, Tag, Database, Copy, Check, ArrowRight } from 'lucide-react'
import { ContextItem } from './maxTypes'

interface ContextPanelProps {
  isOpen: boolean
  onClose: () => void
  onAttachContext: (item: ContextItem) => void
}

const AVAILABLE_CONTEXTS: ContextItem[] = [
  {
    id: 'pageview',
    name: '$pageview',
    category: 'event',
    description: 'Tracks when users view pages in your application. Captures URL, path, referrer, and user agent.',
    samplePayload: {
      event: '$pageview',
      distinct_id: 'usr_89234912',
      properties: {
        $current_url: 'https://posthog.com/insights',
        $host: 'posthog.com',
        $pathname: '/insights',
        $browser: 'Chrome 124',
        $os: 'iOS 17.5',
        $viewport_width: 390,
        $viewport_height: 844,
        timestamp: '2026-07-31T18:20:00.000Z',
      },
    },
  },
  {
    id: 'autocapture',
    name: '$autocapture',
    category: 'event',
    description: 'Automatically captures DOM element interactions like button clicks, link clicks, and form submissions.',
    samplePayload: {
      event: '$autocapture',
      distinct_id: 'usr_89234912',
      properties: {
        $event_type: 'click',
        $el_text: 'Open in context panel',
        $tag_name: 'button',
        $elements_chain: 'button.btn-primary > span',
        $pathname: '/dashboards',
        timestamp: '2026-07-31T18:21:10.000Z',
      },
    },
  },
  {
    id: 'identify',
    name: '$identify',
    category: 'person',
    description: 'Associates telemetry events with a specific user profile and sets user traits.',
    samplePayload: {
      event: '$identify',
      distinct_id: 'user@example.com',
      properties: {
        email: 'user@example.com',
        name: 'PostHog User',
        plan: 'Growth Pro',
        org_id: 'org_881273',
        timestamp: '2026-07-31T18:22:05.000Z',
      },
    },
  },
]

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen,
  onClose,
  onAttachContext,
}) => {
  const [selectedContext, setSelectedContext] = useState<ContextItem>(AVAILABLE_CONTEXTS[0])
  const [copiedCode, setCopiedCode] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'schema'>('overview')

  if (!isOpen) return null

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedContext.samplePayload, null, 2))
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div id="context-panel" className="fixed inset-y-0 right-0 z-30 w-full sm:w-96 bg-light dark:bg-dark border-l border-accent-light dark:border-accent-dark shadow-xl flex flex-col transition-all duration-300 font-sans">
      <div className="flex items-center justify-between px-4 py-3 border-b border-accent-light dark:border-accent-dark bg-accent-light/50 dark:bg-accent-dark/50">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue" />
          <h3 className="font-bold text-sm text-primary font-rounded">Context Explorer</h3>
        </div>
        <button
          id="btn-close-context-panel"
          onClick={onClose}
          className="p-1 opacity-60 hover:opacity-100 hover:bg-accent-light dark:hover:bg-accent-dark rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-accent-light/30 dark:bg-accent-dark/30 border-b border-accent-light dark:border-accent-dark flex gap-1.5 overflow-x-auto">
        {AVAILABLE_CONTEXTS.map((item) => (
          <button
            key={item.id}
            id={`ctx-item-${item.id}`}
            onClick={() => setSelectedContext(item)}
            className={`px-2.5 py-1 text-xs font-code rounded-md border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              selectedContext.id === item.id
                ? 'bg-blue/10 text-blue border-blue/30 font-semibold'
                : 'bg-light dark:bg-dark text-primary border-accent-light dark:border-accent-dark hover:bg-accent-light dark:hover:bg-accent-dark'
            }`}
          >
            <Tag className="w-3 h-3 text-blue" />
            {item.name}
          </button>
        ))}
      </div>

      <div className="flex border-b border-accent-light dark:border-accent-dark px-3 bg-light dark:bg-dark text-xs font-button">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-blue text-blue font-semibold'
              : 'border-transparent text-primary opacity-60 hover:opacity-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('payload')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'payload'
              ? 'border-blue text-blue font-semibold'
              : 'border-transparent text-primary opacity-60 hover:opacity-100'
          }`}
        >
          Sample Payload
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'schema'
              ? 'border-blue text-blue font-semibold'
              : 'border-transparent text-primary opacity-60 hover:opacity-100'
          }`}
        >
          Properties Schema
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans">
        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-accent-light dark:bg-accent-dark border border-accent-light dark:border-accent-dark rounded-lg">
              <span className="inline-block px-1.5 py-0.5 mb-1.5 text-[10px] font-bold tracking-wide uppercase bg-blue/10 text-blue rounded font-rounded">
                {selectedContext.category}
              </span>
              <h4 className="font-code font-bold text-sm text-primary mb-1">{selectedContext.name}</h4>
              <p className="opacity-80 leading-relaxed font-sans">{selectedContext.description}</p>
            </div>

            <div className="p-3 bg-accent-light/50 dark:bg-accent-dark/50 rounded-lg border border-accent-light dark:border-accent-dark">
              <h5 className="font-bold text-primary mb-2 font-rounded">Key Properties</h5>
              <ul className="space-y-1.5 font-code text-[11px]">
                {Object.keys(selectedContext.samplePayload?.properties || {}).map((prop) => (
                  <li key={prop} className="flex items-center justify-between py-0.5 border-b border-accent-light/30 dark:border-accent-dark/30 last:border-0">
                    <span className="text-blue">{prop}</span>
                    <span className="opacity-50 font-sans text-[10px]">
                      {typeof selectedContext.samplePayload?.properties[prop]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'payload' && (
          <div className="relative font-code">
            <button
              onClick={handleCopyPayload}
              className="absolute top-2 right-2 p-1.5 bg-dark text-light hover:bg-dark/80 rounded border border-accent-dark text-[10px] flex items-center gap-1 cursor-pointer font-sans"
            >
              {copiedCode ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
            <pre className="p-3 bg-dark text-blue-300 rounded-lg text-[11px] font-code overflow-x-auto leading-relaxed border border-accent-dark">
              {JSON.stringify(selectedContext.samplePayload, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-2 text-xs font-sans">
            <div className="flex items-center gap-1.5 text-primary font-medium mb-1">
              <Code className="w-3.5 h-3.5 text-blue" />
              <span className="font-bold font-rounded">Event Code Example</span>
            </div>
            <pre className="p-3 bg-dark text-light rounded-lg text-[11px] font-code overflow-x-auto border border-accent-dark">
{`posthog.capture('${selectedContext.name}', {
  $current_url: window.location.href,
  $host: window.location.host,
  $pathname: window.location.pathname
});`}
            </pre>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-accent-light dark:border-accent-dark bg-accent-light/40 dark:bg-accent-dark/40 font-button">
        <button
          id="btn-attach-to-chat"
          onClick={() => {
            onAttachContext(selectedContext)
            onClose()
          }}
          className="w-full py-2 px-3 bg-blue hover:bg-blue/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs font-button"
        >
          <span>Attach {selectedContext.name} to Chat</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
