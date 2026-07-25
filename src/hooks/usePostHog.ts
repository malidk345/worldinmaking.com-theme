import type { PostHog } from '../types/posthog'

const mockPostHog: PostHog = {
    people: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set: () => {},
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    capture: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    captureException: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    createPersonProfile: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    getEarlyAccessFeatures: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    getSurveys: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    updateEarlyAccessFeatureEnrollment: () => {},
    getFeatureFlag: () => false,
    getFeatureFlagPayload: () => undefined,
    get_distinct_id: () => 'mock-distinct-id',
    get_property: () => undefined,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    identify: () => {},
    isFeatureEnabled: () => false,
    onFeatureFlags: (cb) => {
        if (typeof cb === 'function') {
            cb()
        }
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    register: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    register_once: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setPersonProperties: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    set_config: () => {},
}

const usePostHog = (): PostHog | undefined => {
    return typeof window !== 'undefined' ? mockPostHog : undefined
}

export default usePostHog
