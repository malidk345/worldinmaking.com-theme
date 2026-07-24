export const useLocation = () => {
    if (typeof window !== 'undefined') {
        return {
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            state: null,
            key: 'default',
        }
    }
    return {
        pathname: '/',
        search: '',
        hash: '',
        state: null,
        key: 'default',
    }
}

export const useNavigate = () => {
    return (to: string, options?: any) => {
        if (typeof window !== 'undefined') {
            if (options?.replace) {
                window.location.replace(to)
            } else {
                window.location.href = to
            }
        }
    }
}
