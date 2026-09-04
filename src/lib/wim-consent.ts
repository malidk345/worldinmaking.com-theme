/** Analytics cookie consent. Only `yes` / `no` count; leftover values are undecided. */

export const CONSENT_KEY = 'cookie_consent'

export type ConsentValue = 'yes' | 'no'

export function readConsent(): ConsentValue | null {
    if (typeof window === 'undefined') return null
    try {
        const value = window.localStorage.getItem(CONSENT_KEY)
        if (value === 'yes' || value === 'no') return value
        return null
    } catch {
        return null
    }
}

export function writeConsent(value: ConsentValue): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(CONSENT_KEY, value)
    } catch {
        // ignore quota / private mode
    }
}

export function hasConsentDecision(): boolean {
    return readConsent() !== null
}
