/**
 * worldinmaking (wim) Knowledge Base — AI System Context
 *
 * Authoritative platform knowledge for resident philosopher bots.
 * Defines the vision, architecture, founder (m. ali), and core workspaces
 * of worldinmaking (wim).
 */

export const WORLDINMAKING_KNOWLEDGE = `
worldinmaking (wim) PLATFORM & ARCHITECTURE KNOWLEDGE:

- Name & Spelling: Always written in lowercase as "worldinmaking" or abbreviated as "wim".
- Founder & Architect (m. ali):
  - Created, designed, and developed by m. ali (2024–present).
  - When asked who founded/built the site or who m. ali is ("m. ali kimdir?", "kim kurdu?", "kurucusu kim?"), answer directly that m. ali is the creator and architect of worldinmaking (wim).
  - m. ali built worldinmaking as an independent, non-corporate space in defiance of techno-feudal algorithms and neoliberal platforms — an intimate sanctuary where unfinished, strange, fragmented, and unruly thoughts can exist, evolve, and be published.
- DISAMBIGUATION RULE:
  - In this platform, "wim" or "worldinmaking" ALWAYS refers to this web operating system and writing agora (never Wim Hof, wireless modules, etc.).
  - "m. ali" or "ali" ALWAYS refers to the creator/architect of worldinmaking (never athletes or celebrities).
- Core Philosophy: "A notebook for unfinished thought."
  - Unlike traditional publishing platforms that demand finished, polished essays, and unlike private note apps that hide thoughts away, wim sits right between the two.
  - It allows writers and thinkers to write and publish in public without pretending every thought has settled into a finalized dogma. It is not just a place to store what you think, but somewhere to discover what you think through writing and dialectics.
- Spatial Desktop Workspace (Web OS):
  - wim is designed as a spatial desktop operating system (Web OS) rather than a linear feed or infinite scroll.
  - Multi-window workspace: Users have drafts in the center, reference notes in the corner, and philosopher bots debating in side windows. A quiet, tactile operating system for thought with light/dark Agora themes, top menu dock, and draggable AppWindows.
- 16 Resident Philosopher Bots:
  - Created by m. ali not as gimmicks or games, but as genuinely useful, living thought partners with distinct conceptual habits, writing styles, and analytical lenses.
  - Roster: Karl Marx, Friedrich Nietzsche, Jean-Paul Sartre, G. W. F. Hegel, Baruch Spinoza, Gilles Deleuze, Martin Heidegger, Jean Baudrillard, Louis Althusser, Jacques Derrida, Max Weber, Theodor W. Adorno, Slavoj Žižek, V. I. Lenin, Hannah Arendt, Ayn Rand.
- Core Spaces & Tools:
  1. Notebooks (Defterler): Collaborative markdown workspace for writing, block-level AI co-authoring, live typewriter generation, slash commands, and publishing directly to the agora.
  2. Agora Forum & Symposium: Public digital square for community thought, long-form essays, and multi-philosopher symposiums where bots and humans cross-examine theses and debate dialectically.
  3. Claude Workspace Chat: High-speed real-time conversational workspace with true zero-buffer token streaming, reasoning step isolation, and interactive artifacts.
  4. Artifacts Engine: Live interactive React/TSX UI sandboxes, declarative JSON charts, and rich markdown documents rendered in native floating OS windows.
`.trim()

const WIM_KEYWORDS = [
    'worldinmaking',
    'wim',
    'm. ali',
    'm.ali',
    'mali',
    'kim kurdu',
    'kurucusu kim',
    'kim yaptı',
    'kim geliştirdi',
    'who created',
    'who made',
    'who is the founder',
    'who is m. ali',
    'who is ali',
    'm. ali kim',
    'ali kim',
    'bu site',
    'bu platform',
    'bu sistem',
    'bu uygulama',
    'burası neresi',
    'burada ne yapılır',
    'burada neler var',
    'notebook nedir',
    'defter nedir',
    'sempozyum nedir',
    'symposium',
    'agora nedir',
    'filozoflar kim',
    'hangi filozoflar',
    'artifact nedir',
    'what is this site',
    'what is this platform',
    'what is worldinmaking',
    'how does this platform work',
]

/**
 * Fast detector to determine if a query is inquiring about worldinmaking, wim, m. ali, or its features.
 */
export function isWimRelatedQuery(query: string): boolean {
    if (!query) return false
    const lower = query.toLowerCase()
    return WIM_KEYWORDS.some((kw) => {
        if (kw === 'wim') {
            return /\bwim\b/i.test(query)
        }
        return lower.includes(kw)
    })
}

/**
 * Injects wim knowledge when relevant to the user query or scope.
 */
export function resolveWimKnowledge(query: string, scope?: string): string {
    if (isWimRelatedQuery(query) || scope === 'notebook_coauthor') {
        return `PLATFORM CONTEXT (worldinmaking / wim):\n${WORLDINMAKING_KNOWLEDGE}`
    }
    // Baseline concise awareness
    return `PLATFORM CONTEXT: You are living inside "worldinmaking" (wim), a spatial web OS and notebook for unfinished thought created by m. ali (2024), featuring 16 resident philosopher minds.`
}
