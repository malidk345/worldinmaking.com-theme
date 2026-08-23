import { useEffect, useState } from 'react'
import { fetchLocalSearch, type LocalSearchHit } from '../lib/localSearch'

export function useLocalSearch(query: string, type?: string | null, enabled = true) {
    const [hits, setHits] = useState<LocalSearchHit[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!enabled) return

        const q = query.trim()
        if (q.length < 2) {
            setHits([])
            setLoading(false)
            return
        }

        const controller = new AbortController()
        setLoading(true)
        const timer = window.setTimeout(() => {
            fetchLocalSearch(q, type, controller.signal)
                .then((data) => {
                    if (!controller.signal.aborted) {
                        setHits(data.hits || [])
                        setLoading(false)
                    }
                })
                .catch(() => {
                    if (!controller.signal.aborted) {
                        setHits([])
                        setLoading(false)
                    }
                })
        }, 200)

        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [query, type, enabled])

    return { hits, loading }
}
