export default function usePostHog() {
    return {
        capture: (..._args: unknown[]) => { },
        register_once: (..._args: unknown[]) => { },
        identify: (..._args: unknown[]) => { },
        reset: (..._args: unknown[]) => { },
        createPersonProfile: () => { },
        people: {
            set: (..._args: unknown[]) => { }
        }
    }
}
