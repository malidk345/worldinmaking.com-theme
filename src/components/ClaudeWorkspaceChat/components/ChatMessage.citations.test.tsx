import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../context/App', () => ({
  useAppActions: () => ({ addWindow: vi.fn() }),
}))

describe('ChatMessage inline numbered citations', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    Object.assign(globalThis, { ResizeObserver: class {
      observe() { return undefined }
      disconnect() { return undefined }
      unobserve() { return undefined }
    } })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders [P#] / [n] as small buttons that open the matching source; unknown ids stay inert', async () => {
    const { ChatMessage } = await import('./ChatMessage')
    const onOpenSources = vi.fn()
    const message: Message = {
      id: 'm1',
      role: 'assistant',
      content: 'Heidegger calls it Gestell [P2]. See also [1, 9] and `[2]` in code.',
      timestamp: '12:00',
      isTypingDone: true,
      citations: [
        { id: 1, kind: 'web', title: 'A site', url: 'https://a.example', snippet: '' },
        {
          id: 2,
          kind: 'paper',
          title: 'The Question Concerning Technology',
          url: 'https://doi.org/10.1234/qct',
          snippet: '',
          authors: ['Martin Heidegger'],
          year: 1977,
        },
      ],
    }
    act(() => {
      root.render(
        <ChatMessage message={message} modelOptions={[]} targetChatId="c1" onOpenSources={onOpenSources} typewriterSpeed="off" />
      )
    })
    const markers = Array.from(container.querySelectorAll<HTMLElement>('[data-citation-marker]'))
    expect(markers.map((m) => [m.tagName, m.textContent, m.dataset.citationMarker])).toEqual([
      ['BUTTON', 'Heidegger, 1977', '2'],
      ['BUTTON', 'A site', '1'],
      ['SPAN', 'P9', 'unknown'],
    ])
    expect(container.querySelector('code')?.textContent).toBe('[2]')
    act(() => markers[0].click())
    expect(onOpenSources).toHaveBeenCalledWith(message.citations, expect.anything(), 2)
  })
})
