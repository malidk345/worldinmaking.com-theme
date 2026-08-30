import posthog from 'posthog-js'
import type { PostHog } from '../types/posthog'

const usePostHog = (): any => {
    if (typeof window !== 'undefined') {
        return posthog
    }
    return undefined
}

export default usePostHog
