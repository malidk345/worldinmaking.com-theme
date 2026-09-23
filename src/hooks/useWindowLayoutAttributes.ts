import { useShellFrame } from '../context/App'

export function useWindowLayoutAttributes() {
    const { hasExpandedWindow, hasSnappedLeftWindow, hasSnappedRightWindow } = useShellFrame()

    return {
        hasExpandedWindow,
        hasSnappedLeftWindow,
        hasSnappedRightWindow,
    }
}
