/** Edge-safe philosopher avatar paths. No webpack image imports. */

export const PHILOSOPHER_IDS = [
    'nietzsche',
    'marx',
    'hegel',
    'sartre',
    'heidegger',
    'deleuze',
    'spinoza',
    'baudrillard',
    'althusser',
    'derrida',
    'weber',
    'adorno',
    'zizek',
    'lenin',
    'arendt',
    'rand',
] as const

export type PhilosopherId = (typeof PHILOSOPHER_IDS)[number]

const ALIASES: Record<string, PhilosopherId> = {
    nietzsche: 'nietzsche',
    friedrichnietzsche: 'nietzsche',
    marx: 'marx',
    karlmarx: 'marx',
    hegel: 'hegel',
    gwfhegel: 'hegel',
    georgwilhelmfriedrichhegel: 'hegel',
    sartre: 'sartre',
    jeanpaulsartre: 'sartre',
    heidegger: 'heidegger',
    martinheidegger: 'heidegger',
    deleuze: 'deleuze',
    gillesdeleuze: 'deleuze',
    spinoza: 'spinoza',
    baruchspinoza: 'spinoza',
    benedictspinoza: 'spinoza',
    baudrillard: 'baudrillard',
    jeanbaudrillard: 'baudrillard',
    althusser: 'althusser',
    louisalthusser: 'althusser',
    derrida: 'derrida',
    jacquesderrida: 'derrida',
    weber: 'weber',
    maxweber: 'weber',
    adorno: 'adorno',
    theodoradorno: 'adorno',
    theodorwadorno: 'adorno',
    zizek: 'zizek',
    slavojzizek: 'zizek',
    lenin: 'lenin',
    vladimirlenin: 'lenin',
    villenin: 'lenin',
    arendt: 'arendt',
    hannaharendt: 'arendt',
    rand: 'rand',
    aynrand: 'rand',
}

export function normalizePhilosopherKey(raw: string): string {
    return raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
}

export function matchPhilosopherId(username?: string | null): PhilosopherId | null {
    if (!username) return null
    const key = normalizePhilosopherKey(username)
    if (!key) return null
    if (ALIASES[key]) return ALIASES[key]
    for (const id of PHILOSOPHER_IDS) {
        if (key === id || key.endsWith(id)) return id
    }
    return null
}

export function philosopherPublicAvatar(id: PhilosopherId): string {
    return `/philosophers/${id}.png`
}

/** Prefer the official pixel bust whenever the handle is a resident philosopher. */
export function resolvePhilosopherAvatar(
    username?: string | null,
    fallback?: string | null
): string {
    const id = matchPhilosopherId(username)
    if (id) return philosopherPublicAvatar(id)
    return fallback || ''
}
