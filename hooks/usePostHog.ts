export default function usePostHog() {
    return {
        capture: (...args: any[]) => { },
        register_once: (...args: any[]) => { },
        identify: (...args: any[]) => { },
        reset: (...args: any[]) => { },
        createPersonProfile: () => { },
        people: {
            set: (...args: any[]) => { }
        }
    }
}
