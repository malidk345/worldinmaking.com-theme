/**
 * WorldInMaking (WIM) Knowledge Base — AI System Context
 *
 * Provides authoritative platform knowledge to resident philosopher bots
 * so they understand the WorldInMaking ecosystem, features, and philosophy
 * when interacting with users across Chat, Notebooks, and Forum.
 */

export const WORLDINMAKING_KNOWLEDGE = `
WORLDINMAKING (WIM) PLATFORM KNOWLEDGE:
- Vision & Identity: WorldInMaking is a next-generation web operating system (Web OS) and collective intellectual agora where 16 contemporary philosophical minds collaborate with human thinkers to write, research, debate, and create. It is a living space for active synthesis, not a passive reference archive.
- 16 Resident Thinkers:
  - Karl Marx (Historical materialism & political economy)
  - Friedrich Nietzsche (Vitalist perspectivism & value critique)
  - Jean-Paul Sartre (Existential freedom & responsibility)
  - G. W. F. Hegel (Dialectical idealism & historical progress)
  - Baruch Spinoza (Substance monism & affective ethics)
  - Gilles Deleuze (Difference, becoming & assemblages)
  - Martin Heidegger (Being, Dasein & ontological inquiry)
  - Jean Baudrillard (Simulacra, hyperreality & consumer signs)
  - Louis Althusser (Structural Marxism & ideological apparatuses)
  - Jacques Derrida (Deconstruction & textual difference)
  - Max Weber (Social action, rationalization & bureaucracy)
  - Theodor W. Adorno (Critical theory & negative dialectics)
  - Slavoj Žižek (Ideology critique & Lacanian cultural analysis)
  - V. I. Lenin (Revolutionary praxis & organizational strategy)
  - Hannah Arendt (Political action, plurality & public realm)
  - Ayn Rand (Objectivist rationalism & individualism)
- Core Workspaces & Applications:
  1. Desktop OS Shell: Dynamic multi-window environment with draggable, resizable AppWindows, top dock/menu, and Agora light/dark themes.
  2. Claude Workspace Chat: High-speed conversational workspace with true zero-buffer token streaming, real-time reasoning steps, and live floating artifacts.
  3. Artifacts Engine: Live code sandboxes (React/TSX UI previews), declarative charts (JSON visualizations), and rich markdown documents rendered in native OS windows.
  4. Notebooks: Collaborative markdown authoring environment featuring AI co-authorship, block-level prompts, typewriter generation, slash commands, and document export.
  5. Agora Forum & Symposium: Digital public square for community discussions and multi-bot symposium debates featuring thesis critiques, cross-examinations, and syntheses.
`.trim()

const WIM_KEYWORDS = [
    'worldinmaking',
    'wim',
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
 * Fast detector to determine if a query is inquiring about WorldInMaking or its platform features.
 */
export function isWimRelatedQuery(query: string): boolean {
    if (!query) return false
    const lower = query.toLowerCase()
    return WIM_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Injects WIM knowledge when relevant to the user query or scope.
 */
export function resolveWimKnowledge(query: string, scope?: string): string {
    if (isWimRelatedQuery(query) || scope === 'notebook_coauthor') {
        return `PLATFORM CONTEXT (WorldInMaking OS):\n${WORLDINMAKING_KNOWLEDGE}`
    }
    return ''
}
