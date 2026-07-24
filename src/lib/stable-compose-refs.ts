import * as React from 'react'

export function setRef<T>(ref: any, value: T) {
    if (typeof ref === 'function') {
        try {
            ref(value)
        } catch (e) {}
    } else if (ref !== null && ref !== undefined) {
        try {
            ref.current = value
        } catch (e) {}
    }
}

export function composeRefs<T>(...refs: any[]) {
    return (node: T) => {
        refs.forEach((ref) => setRef(ref, node))
    }
}

export function useComposedRefs<T>(...refs: any[]): (node: T) => void {
    const lastNodeRef = React.useRef<T | null>(null)
    const refsRef = React.useRef(refs)
    refsRef.current = refs

    return React.useCallback((node: T) => {
        if (node !== lastNodeRef.current) {
            lastNodeRef.current = node
            refsRef.current.forEach((ref) => setRef(ref, node))
        }
    }, [])
}
