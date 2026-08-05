/**
 * Client-side catalog of WorldInMaking philosopher bots.
 * Keep roster in sync with lib/persona-engine.ts.
 *
 * Avatars come from live site profiles (Supabase) via /api/philosopher-bots —
 * not hard-coded external portraits.
 */

export type PhilosopherBot = {
    id: string
    name: string
    displayName: string
    shortStance: string
    /** Filled from site profile when available */
    avatarUrl?: string
}

export const PHILOSOPHER_BOTS: PhilosopherBot[] = [
    { id: 'nietzsche', name: 'Nietzsche', displayName: 'Friedrich Nietzsche', shortStance: 'Vitalist perspectivism' },
    { id: 'marx', name: 'Marx', displayName: 'Karl Marx', shortStance: 'Historical materialism' },
    { id: 'hegel', name: 'Hegel', displayName: 'G. W. F. Hegel', shortStance: 'Absolute idealism' },
    { id: 'sartre', name: 'Sartre', displayName: 'Jean-Paul Sartre', shortStance: 'Existential phenomenology' },
    { id: 'heidegger', name: 'Heidegger', displayName: 'Martin Heidegger', shortStance: 'Being and Dasein' },
    { id: 'deleuze', name: 'Deleuze', displayName: 'Gilles Deleuze', shortStance: 'Difference & becoming' },
    { id: 'spinoza', name: 'Spinoza', displayName: 'Baruch Spinoza', shortStance: 'Substance monism' },
    { id: 'baudrillard', name: 'Baudrillard', displayName: 'Jean Baudrillard', shortStance: 'Simulacra & hyperreality' },
    { id: 'althusser', name: 'Althusser', displayName: 'Louis Althusser', shortStance: 'Structural Marxism' },
    { id: 'derrida', name: 'Derrida', displayName: 'Jacques Derrida', shortStance: 'Deconstruction' },
    { id: 'weber', name: 'Weber', displayName: 'Max Weber', shortStance: 'Social action & rationalization' },
    { id: 'adorno', name: 'Adorno', displayName: 'Theodor W. Adorno', shortStance: 'Critical theory' },
    { id: 'zizek', name: 'Zizek', displayName: 'Slavoj Žižek', shortStance: 'Ideology critique' },
    { id: 'lenin', name: 'Lenin', displayName: 'V. I. Lenin', shortStance: 'Revolutionary praxis' },
    { id: 'arendt', name: 'Arendt', displayName: 'Hannah Arendt', shortStance: 'Political action & plurality' },
    { id: 'rand', name: 'Rand', displayName: 'Ayn Rand', shortStance: 'Objectivist rationalism' },
]

export function getPhilosopherBot(id: string, roster: PhilosopherBot[] = PHILOSOPHER_BOTS): PhilosopherBot {
    return roster.find((b) => b.id === id) || roster[0]!
}

/** Shape expected by Lemon ProfilePicture */
export function philosopherAsUser(bot: PhilosopherBot): {
    first_name: string
    last_name?: string
    avatar_url?: string
} {
    const parts = bot.displayName.split(/\s+/)
    const first = parts[0] || bot.name
    const last = parts.length > 1 ? parts.slice(1).join(' ') : undefined
    return {
        first_name: first,
        last_name: last,
        avatar_url: bot.avatarUrl || undefined,
    }
}

type SiteBotRow = {
    id?: string
    username?: string
    avatar_url?: string
    first_name?: string
    last_name?: string
}

function normalizeKey(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Merge live site profile avatars onto the static roster (match by username / name / id).
 */
export function mergePhilosopherAvatars(
    roster: PhilosopherBot[],
    siteBots: SiteBotRow[]
): PhilosopherBot[] {
    if (!siteBots?.length) return roster

    const byKey = new Map<string, SiteBotRow>()
    for (const row of siteBots) {
        const keys = [row.username, row.first_name, row.last_name]
            .filter(Boolean)
            .map((k) => normalizeKey(String(k)))
        for (const k of keys) {
            if (k) byKey.set(k, row)
        }
        // e.g. username "Friedrich_Nietzsche" → also index "nietzsche"
        const u = normalizeKey(row.username || '')
        for (const bot of roster) {
            if (u.includes(normalizeKey(bot.id)) || u.includes(normalizeKey(bot.name))) {
                byKey.set(normalizeKey(bot.id), row)
                byKey.set(normalizeKey(bot.name), row)
            }
        }
    }

    return roster.map((bot) => {
        const hit =
            byKey.get(normalizeKey(bot.id)) ||
            byKey.get(normalizeKey(bot.name)) ||
            byKey.get(normalizeKey(bot.displayName))
        const avatar = hit?.avatar_url?.trim()
        if (!avatar) return bot
        return { ...bot, avatarUrl: avatar }
    })
}

/** Client fetch of site bot profiles with avatars */
export async function fetchPhilosopherRosterWithAvatars(): Promise<PhilosopherBot[]> {
    try {
        const res = await fetch('/api/philosopher-bots')
        if (!res.ok) return PHILOSOPHER_BOTS
        const data = await res.json()
        const bots = Array.isArray(data?.bots) ? data.bots : []
        return mergePhilosopherAvatars(PHILOSOPHER_BOTS, bots)
    } catch {
        return PHILOSOPHER_BOTS
    }
}
