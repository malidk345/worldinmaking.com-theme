import React, { useState } from 'react'
import {
  IconCopy,
  IconCheck,
  IconThumbsUp,
  IconThumbsDown,
  IconRefresh,
  IconEye,
  IconDocument,
  IconExternal,
  IconX,
} from '@posthog/icons'
import { Message } from './maxTypes'
import { ThinkingProcess } from './ThinkingProcess'

interface MessageItemProps {
  message: Message
  onRetry?: (messageId: string) => void
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRetry,
  onFeedback,
}) => {
  const [copied, setCopied] = useState(false)
  const [showPayloadModal, setShowPayloadModal] = useState(false)

  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g)

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n')
        let language = 'text'
        if (lines[0] && !lines[0].includes(' ') && lines[0].length < 15) {
          language = lines[0]
          lines.shift()
        }
        const codeContent = lines.join('\n')
        return (
          <div key={index} className="my-2.5 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 font-code text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-slate-400 text-[11px] font-code border-b border-slate-700">
              <span className="font-semibold uppercase tracking-wider">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(codeContent)}
                className="hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 text-xs font-code text-blue-300 overflow-x-auto leading-relaxed">
              <code>{codeContent}</code>
            </pre>
          </div>
        )
      }

      return (
        <div key={index} className="space-y-2 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans">
          {part.split('\n\n').map((paragraph, pIdx) => {
            if (!paragraph.trim()) return null
            return (
              <p key={pIdx}>
                {paragraph.split('\n').map((line, lIdx) => (
                  <React.Fragment key={lIdx}>
                    {lIdx > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </p>
            )
          })}
        </div>
      )
    })
  }

  if (isUser) {
    return (
      <div id={`msg-${message.id}`} className="flex flex-col items-end my-3 space-y-1 max-w-xl ml-auto font-sans">
        {message.contextTag && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-mono mb-0.5">
            <IconDocument className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-[11px]">With 1 event ({message.contextTag})</span>
          </div>
        )}

        <div className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl shadow-sm text-sm font-medium leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div id={`msg-${message.id}`} className="flex flex-col items-start my-4 max-w-2xl mr-auto space-y-2 w-full font-sans">
      {message.thinkingSteps && message.thinkingSteps.length > 0 && (
        <ThinkingProcess
          steps={message.thinkingSteps}
          thinkingTimeMs={message.thinkingTimeMs}
        />
      )}

      <div className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 font-sans">
        {renderFormattedText(message.content)}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Sources:</span>
            {message.sources.map((src, i) => (
              <a
                key={i}
                href={src.uri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
              >
                {src.title}
                <IconExternal className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-1.5 px-1 text-slate-400 text-xs">
        <button
          id={`btn-copy-${message.id}`}
          onClick={handleCopy}
          title="Copy response"
          className="p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          {copied ? <IconCheck className="w-4 h-4 text-blue-600" /> : <IconCopy className="w-4 h-4" />}
        </button>

        <button
          id={`btn-thumbs-up-${message.id}`}
          onClick={() => onFeedback?.(message.id, 'up')}
          title="Helpful"
          className={`p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer ${
            message.feedback === 'up' ? 'text-blue-600' : ''
          }`}
        >
          <IconThumbsUp className="w-4 h-4" />
        </button>

        <button
          id={`btn-thumbs-down-${message.id}`}
          onClick={() => onFeedback?.(message.id, 'down')}
          title="Not helpful"
          className={`p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer ${
            message.feedback === 'down' ? 'text-rose-600' : ''
          }`}
        >
          <IconThumbsDown className="w-4 h-4" />
        </button>

        <button
          id={`btn-retry-${message.id}`}
          onClick={() => onRetry?.(message.id)}
          title="Retry message"
          className="p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <IconRefresh className="w-4 h-4" />
        </button>

        <button
          id={`btn-inspect-${message.id}`}
          onClick={() => setShowPayloadModal(true)}
          title="View raw payload"
          className="p-1 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <IconEye className="w-4 h-4" />
        </button>
      </div>

      {showPayloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 font-mono">Message Metadata Payload</span>
              <button
                onClick={() => setShowPayloadModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-blue-400 text-xs font-mono max-h-80 overflow-y-auto">
              {JSON.stringify(
                {
                  id: message.id,
                  timestamp: message.timestamp,
                  contextTag: message.contextTag,
                  sources: message.sources,
                  content: message.content,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
