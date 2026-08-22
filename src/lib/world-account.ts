import { supabase, isSupabaseConfigured } from './supabase'
import { parseWorldSnapshot, type WorldSnapshot } from './world-snapshot'

export async function fetchUserWorld(): Promise<{ snapshot: WorldSnapshot; updatedAt: string } | null> {
    if (!isSupabaseConfigured) return null
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) return null
    const { data, error } = await supabase
        .from('user_worlds')
        .select('snapshot, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
    if (error) {
        if (!/schema cache|does not exist|relation/i.test(error.message)) {
            console.warn('[world] fetch', error.message)
        }
        return null
    }
    if (!data) return null
    const snapshot = parseWorldSnapshot(data.snapshot)
    if (!snapshot) return null
    return { snapshot, updatedAt: data.updated_at || new Date().toISOString() }
}

export async function saveUserWorld(snapshot: WorldSnapshot): Promise<boolean> {
    if (!isSupabaseConfigured) return false
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) return false
    const { error } = await supabase.from('user_worlds').upsert(
        {
            user_id: userId,
            snapshot,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
    )
    if (error) {
        if (!/schema cache|does not exist|relation/i.test(error.message)) {
            console.warn('[world] save', error.message)
        }
        return false
    }
    return true
}

export async function createWorldRoom(args: {
    snapshot: WorldSnapshot
    title?: string
    jwt?: string | null
}): Promise<{ token: string; urlPath: string } | { error: string; status: number }> {
    const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(args.jwt ? { Authorization: `Bearer ${args.jwt}` } : {}),
        },
        body: JSON.stringify({
            snapshot: args.snapshot,
            title: args.title || 'Shared room',
        }),
    })
    const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
    if (!res.ok || !body.token) {
        return { error: body.error || 'Could not create room', status: res.status }
    }
    return { token: body.token, urlPath: `/room/${body.token}` }
}

export async function fetchWorldRoom(token: string): Promise<WorldSnapshot | null> {
    const clean = token.trim()
    if (!clean) return null
    const res = await fetch(`/api/rooms/${encodeURIComponent(clean)}`)
    if (!res.ok) return null
    const body = (await res.json().catch(() => ({}))) as { snapshot?: unknown }
    return parseWorldSnapshot(body.snapshot)
}
