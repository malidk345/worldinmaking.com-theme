import { test, expect } from '@playwright/test'
import {
  classifyChatStreamError,
  isAbortError,
  isTransientNetworkError,
  shouldSilentRetryChatStream,
  chatStreamErrorTelemetryProps,
} from '../src/lib/chat-stream-errors'

test.describe('chat-stream-errors classifier', () => {
  test('abort never becomes connection / network', () => {
    expect(isAbortError(new DOMException('The operation was aborted.', 'AbortError'))).toBe(true)
    expect(isAbortError('client-stop')).toBe(true)
    expect(isAbortError({ name: 'AbortError', message: 'aborted' })).toBe(true)
    expect(isAbortError({ code: 20, message: 'Aborted' })).toBe(true)

    const fromAbort = classifyChatStreamError({
      err: new DOMException('The operation was aborted.', 'AbortError'),
    })
    expect(fromAbort.kind).toBe('abort')
    expect(fromAbort.title).toBe('')
    expect(fromAbort.isTransientNetwork).toBe(false)

    expect(
      shouldSilentRetryChatStream({
        classified: fromAbort,
        hadPublicText: false,
        attempt: 0,
      })
    ).toBe(false)
  })

  test('maps HTTP status + known codes to distinct kinds', () => {
    expect(classifyChatStreamError({ httpStatus: 429, code: 'QUOTA_EXCEEDED' }).kind).toBe('quota')
    expect(
      classifyChatStreamError({
        httpStatus: 503,
        code: 'QUOTA_UNAVAILABLE',
        message: '[app] Inquiry quota could not be verified.',
      }).kind
    ).toBe('quota')
    expect(classifyChatStreamError({ httpStatus: 401 }).kind).toBe('auth')
    expect(classifyChatStreamError({ httpStatus: 403, code: 'FORBIDDEN' }).kind).toBe('auth')
    expect(classifyChatStreamError({ httpStatus: 504 }).kind).toBe('timeout')
    expect(classifyChatStreamError({ httpStatus: 502 }).kind).toBe('server')
    expect(classifyChatStreamError({ httpStatus: 500 }).kind).toBe('server')
    expect(classifyChatStreamError({ httpStatus: 503 }).kind).toBe('server')
    expect(classifyChatStreamError({ code: 'PROVIDER_UNAVAILABLE' }).kind).toBe('provider')
    expect(classifyChatStreamError({ code: 'EMPTY_REPLY' }).kind).toBe('provider')
    expect(classifyChatStreamError({ code: 'CHAT_FAILED' }).kind).toBe('provider')
  })

  test('product titles stay distinct (no generic Connection for 502/auth/quota)', () => {
    expect(classifyChatStreamError({ httpStatus: 502 }).title).toBe('Temporary issue')
    expect(classifyChatStreamError({ httpStatus: 401 }).title).toBe('Session')
    expect(classifyChatStreamError({ httpStatus: 429, code: 'QUOTA_EXCEEDED' }).title).toBe(
      'Inquiry limit'
    )
    expect(classifyChatStreamError({ code: 'PROVIDER_UNAVAILABLE' }).title).toBe(
      'Philosopher network'
    )
    expect(
      classifyChatStreamError({ err: new TypeError('Failed to fetch') }).title
    ).toBe('Connection')
  })

  test('transient network detection + single silent retry gate', () => {
    expect(isTransientNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isTransientNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
      true
    )
    expect(isTransientNetworkError(new DOMException('aborted', 'AbortError'))).toBe(false)
    expect(isTransientNetworkError(new Error('QUOTA_EXCEEDED'))).toBe(false)

    const transient = classifyChatStreamError({ err: new TypeError('Failed to fetch') })
    expect(transient.kind).toBe('network')
    expect(transient.isTransientNetwork).toBe(true)

    expect(
      shouldSilentRetryChatStream({
        classified: transient,
        hadPublicText: false,
        attempt: 0,
      })
    ).toBe(true)
    expect(
      shouldSilentRetryChatStream({
        classified: transient,
        hadPublicText: true,
        attempt: 0,
      })
    ).toBe(false)
    expect(
      shouldSilentRetryChatStream({
        classified: transient,
        hadPublicText: false,
        attempt: 1,
      })
    ).toBe(false)

    const quota = classifyChatStreamError({ httpStatus: 429, code: 'QUOTA_EXCEEDED' })
    expect(
      shouldSilentRetryChatStream({ classified: quota, hadPublicText: false, attempt: 0 })
    ).toBe(false)

    const auth = classifyChatStreamError({ httpStatus: 401 })
    expect(
      shouldSilentRetryChatStream({ classified: auth, hadPublicText: false, attempt: 0 })
    ).toBe(false)

    const server = classifyChatStreamError({ httpStatus: 502 })
    expect(
      shouldSilentRetryChatStream({ classified: server, hadPublicText: false, attempt: 0 })
    ).toBe(false)
  })

  test('empty-after-thinking is provider, not Connection', () => {
    const empty = classifyChatStreamError({ message: 'AI returned no content' })
    expect(empty.kind).toBe('provider')
    expect(empty.title).toBe('Philosopher network')
    expect(empty.isTransientNetwork).toBe(false)
    expect(
      shouldSilentRetryChatStream({
        classified: classifyChatStreamError({ err: new TypeError('Failed to fetch') }),
        hadPublicText: false,
        hadStreamProgress: true,
        attempt: 0,
      })
    ).toBe(false)
  })

  test('unknown non-network failures default to provider, not Connection', () => {
    const unknown = classifyChatStreamError({ message: 'stream ended unexpectedly' })
    expect(unknown.kind).toBe('provider')
    expect(unknown.title).toBe('Philosopher network')
    expect(unknown.isTransientNetwork).toBe(false)

    const bare = classifyChatStreamError({})
    expect(bare.kind).toBe('provider')
    expect(bare.title).toBe('Philosopher network')

    // Real browser network failure still Connection
    const net = classifyChatStreamError({ err: new TypeError('Failed to fetch') })
    expect(net.kind).toBe('network')
    expect(net.isTransientNetwork).toBe(true)
  })

  test('telemetry props stay PII-free (no prompt/body fields)', () => {
    const props = chatStreamErrorTelemetryProps({
      kind: 'network',
      httpStatus: undefined,
      hadPublicText: false,
      durationMs: 1234.6,
      chunkCount: 0,
      byteLength: 0,
      agentMode: 'ask',
      retried: true,
    })
    expect(props).toEqual({
      kind: 'network',
      httpStatus: undefined,
      hadPublicText: false,
      hadStreamProgress: undefined,
      durationMs: 1235,
      chunkCount: 0,
      byteLength: 0,
      agentMode: 'ask',
      retried: true,
    })
    const keys = Object.keys(props)
    expect(keys.some((k) => /prompt|email|message|body|content/i.test(k))).toBe(false)
  })
})