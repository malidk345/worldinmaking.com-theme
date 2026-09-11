import React, { useState, useRef, useEffect } from 'react'
import {
  IconArrowRight,
  IconShuffle,
  IconAtSign,
  IconChevronDown,
  IconX,
  IconCode,
  IconSparkles,
  IconSearch,
} from '@posthog/icons'
import { ChatMode, ContextItem } from './maxTypes'

interface ChatInputProps {
  onSendMessage: (text: string, mode: ChatMode, contextTag?: string) => void
  attachedContext?: ContextItem | null
  onRemoveContext?: () => void
  onSelectContext?: (item: ContextItem) => void
  isLoading: boolean
}

const COMMAND_SUGGESTIONS = [
  { cmd: '/explain-event', desc: 'Explain telemetry event structure and properties' },
  { cmd: '/pageview', desc: 'Query $pageview navigation patterns' },
  { cmd: '/autocapture', desc: 'Analyze DOM click and form interaction logs' },
  { cmd: '/identify', desc: 'Check user identification and traits setup' },
  { cmd: '/clear', desc: 'Clear current chat history' },
]

const CONTEXT_OPTIONS: ContextItem[] = [
  {
    id: 'pageview',
    name: '$pageview',
    category: 'event',
    description: 'Tracks page load events & URLs',
  },
  {
    id: 'autocapture',
    name: '$autocapture',
    category: 'event',
    description: 'Tracks UI click interactions',
  },
  {
    id: 'identify',
    name: '$identify',
    category: 'person',
    description: 'Tracks user identity & traits',
  },
]

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  attachedContext,
  onRemoveContext,
  onSelectContext,
  isLoading,
}) => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ChatMode>('auto')
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [showCommandsDropdown, setShowCommandsDropdown] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false)
        setShowMentionDropdown(false)
        setShowCommandsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    if (val.startsWith('/')) {
      setShowCommandsDropdown(true)
    } else {
      setShowCommandsDropdown(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if ((!input.trim() && !attachedContext) || isLoading) return
    onSendMessage(input, mode, attachedContext?.name)
    setInput('')
    setShowCommandsDropdown(false)
  }

  const handleSelectCommand = (cmd: string) => {
    if (cmd === '/clear') {
      setInput('')
      onSendMessage('/clear', mode)
      setShowCommandsDropdown(false)
      return
    }
    setInput(`${cmd} `)
    setShowCommandsDropdown(false)
    textareaRef.current?.focus()
  }

  const handleSelectMention = (ctx: ContextItem) => {
    onSelectContext?.(ctx)
    setShowMentionDropdown(false)
  }

  return (
    <div ref={inputContainerRef} className="relative w-full max-w-2xl mx-auto px-4 pb-4 pt-2 font-sans">
      {/* Slash Commands Dropdown */}
      {showCommandsDropdown && (
        <div className="absolute bottom-full mb-2 left-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 font-mono">
            <span>Available Commands</span>
          </div>
          {COMMAND_SUGGESTIONS.map((item) => (
            <button
              key={item.cmd}
              onClick={() => handleSelectCommand(item.cmd)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer transition-colors"
            >
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{item.cmd}</span>
              <span className="text-[11px] text-slate-500">{item.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Rounded Input Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all p-3 space-y-2">
        <textarea
          ref={textareaRef}
          id="chat-input-textarea"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask follow-up or / for commands"
          rows={2}
          className="w-full resize-none border-0 focus:outline-none focus:ring-0 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent font-sans"
        />

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Mode Dropdown Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowModeDropdown(!showModeDropdown)
                  setShowMentionDropdown(false)
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <IconShuffle className="w-3.5 h-3.5 text-blue-600" />
                <span className="capitalize">{mode}</span>
                <IconChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showModeDropdown && (
                <div className="absolute left-0 bottom-full mb-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-30 py-1 text-xs">
                  <button
                    onClick={() => { setMode('auto'); setShowModeDropdown(false) }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <IconShuffle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Auto (Balanced)</span>
                  </button>
                  <button
                    onClick={() => { setMode('search'); setShowModeDropdown(false) }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <IconSearch className="w-3.5 h-3.5 text-slate-500" />
                    <span>Web Search</span>
                  </button>
                  <button
                    onClick={() => { setMode('analytics'); setShowModeDropdown(false) }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <IconCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>Deep Analytics</span>
                  </button>
                  <button
                    onClick={() => { setMode('fast'); setShowModeDropdown(false) }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <IconSparkles className="w-3.5 h-3.5 text-slate-500" />
                    <span>Fast Response</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mention Dropdown Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowMentionDropdown(!showMentionDropdown)
                  setShowModeDropdown(false)
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <IconAtSign className="w-3.5 h-3.5 text-slate-500" />
                <IconChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showMentionDropdown && (
                <div className="absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-30 py-1 text-xs">
                  <div className="px-3 py-1 text-[10px] text-slate-400 font-semibold uppercase">Attach Telemetry Context</div>
                  {CONTEXT_OPTIONS.map((ctx) => (
                    <button
                      key={ctx.id}
                      onClick={() => handleSelectMention(ctx)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-400 font-mono flex items-center justify-between cursor-pointer"
                    >
                      <span>{ctx.name}</span>
                      <span className="text-[10px] text-slate-400 font-sans">{ctx.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Attached Context Pill */}
            {attachedContext && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 text-xs font-mono rounded-lg">
                <IconCode className="w-3 h-3" />
                <span>{attachedContext.name}</span>
                <button
                  type="button"
                  onClick={onRemoveContext}
                  className="hover:text-blue-900 dark:hover:text-white p-0.5"
                >
                  <IconX className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Circular Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!input.trim() && !attachedContext) || isLoading}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              (input.trim() || attachedContext) && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <IconArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
