export interface ViewportMetrics {
    width: number
    height: number
}

/** Layout viewport only. Do not use visualViewport — the keyboard must not resize windows. */
export const getViewportMetrics = (): ViewportMetrics => {
    if (typeof window === 'undefined') return { width: 0, height: 0 }

    return {
        width: window.innerWidth,
        height: window.innerHeight,
    }
}
