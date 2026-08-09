/**
 * Persona Engine — WorldInMaking.com
 *
 * @deprecated This root file is now a thin compatibility re-export. The single source of
 * truth for persona data (PERSONA_LIBRARY, all 16 philosophers) and the extractPersona /
 * buildPersonaHeader implementations (multilingual + dynamic tone) lives in
 * `src/lib/persona-engine.ts` — that is what the live pipeline (`src/lib/bots/orchestrate.ts`,
 * `/api/bots/act`, `/api/philosopher-bot`, `/api/notebook/co-author`) resolves to via the
 * bare `'lib/persona-engine'` import (tsconfig baseUrl=./src).
 *
 * This file exists only so relative imports (`../../../lib/persona-engine`, `./persona-engine`)
 * used by secondary/autonomous systems (quality-gate.ts, emergent-agent.ts, rss-curator.ts,
 * symposium-engine.ts, interactive-session.ts, ai-provider.ts) resolve to the SAME data and
 * logic as the live pipeline — preventing the two files from drifting apart again.
 */
export type {
    TaskType,
    BotPersona,
} from '../src/lib/persona-engine';

export {
    PHILOSOPHER_BOTS,
    extractPersona,
    buildPersonaHeader,
    selectBotForTask,
} from '../src/lib/persona-engine';

/* ─────────────────────────────────────────────────────────────────────────
 * Everything below this line used to be a full, independent copy of the
 * persona engine (575+ lines) and has been removed as part of the 2026-08-09
 * gateway/persona consolidation. See `src/lib/persona-engine.ts` for the
 * live implementation and `/memories/repo/bot-architecture-duplication.md`
 * for the full history of why this consolidation happened.
 * ───────────────────────────────────────────────────────────────────────── */




