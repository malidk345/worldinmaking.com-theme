/**
 * Request id for end-to-end tracing (UI → API → gateway → telemetry).
 *
 * Edge-safe: uses crypto.randomUUID when available. Honors an inbound
 * `x-request-id` so proxies/callers can correlate their own traces.
 */
export const REQUEST_ID_HEADER = 'x-request-id'

const MAX_REQUEST_ID_LENGTH = 80

export function resolveRequestId(req?: Request | null): string {
    const inbound = req?.headers?.get(REQUEST_ID_HEADER)?.trim()
    if (inbound && inbound.length <= MAX_REQUEST_ID_LENGTH && /^[\w.:-]+$/.test(inbound)) {
        return inbound
    }
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
    } catch {
        /* fall through */
    }
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
