<!--
===================================================================================
AI DIRECTIVE, DESIGN CONSTRAINTS & MULTI-AGENT HANDOFF PROTOCOL
===================================================================================
IMPORTANT FOR ALL AI MODELS (Claude, Gemini, Antigravity, GPT, DeepSeek, Cursor):

1. STRICT SEQUENTIAL EXECUTION:
   - AI models MUST execute roadmap phases STRICTLY IN ORDER (Phase 1 -> Phase 2 -> Phase 3 -> Phase 4).
   - Do NOT skip phases or attempt future phase features before previous phases pass verification (`pnpm typecheck:shell` / smoke tests).

2. MANDATORY CHANGE LOGGING & PROGRESS UPDATE:
   - Upon completing any phase or sub-task, the active AI model MUST UPDATE THIS FILE (`docs/NOTEBOOK_SAAS_ROADMAP.md`).
   - Log exact files created/modified, test status, and progress status (e.g. `[COMPLETED by <ModelName>]`).

3. NEXT AGENT HANDOFF INSTRUCTIONS:
   - Every active model MUST write a clear, actionable directive under the "CURRENT AGENT HANDOFF & NEXT STEP" section
     specifying EXACTLY what the NEXT AI model should do next.

4. STRICT STYLE GUIDE COMPLIANCE:
   - All code, components, and UI modifications MUST strictly follow `STYLEGUIDE.md`
     and the PostHog / WorldInMaking OS design tokens (`src/constants/frostedSurfaces.ts`, `src/styles/vars.scss`).
   - NEVER generate arbitrary, ad-hoc, or unapproved custom styles, font families, or off-palette colors.

5. ESTABLISHED UI LIBRARIES & ESTHETIC STANDARDS:
   - Use PostHog Lemon UI components (`@posthog/icons`, `LemonButton`, `LemonInput`, `LemonSelect`)
     and PostHog OS Button / Window primitives (`OSButton`, `OSFieldset`, `RadixUI`).
   - For editor styling, adhere STRICTLY to the established Quill.js shim / scoped CSS rules
     (`src/notebook-app/styles/quill-shim.css` and `src/notebook-app/styles/bundle.scss`).
===================================================================================
-->

# WorldInMaking Notebook — Craft-Grade Enterprise SaaS Documentation Roadmap

> **Architectural Vision:** Transform the WorldInMaking Notebook from a single-file markdown editor into a high-performance, block-based, local-first documentation & knowledge platform matching **Craft.do**, **Notion**, and **Reflect**.

---

## 📌 CURRENT AGENT HANDOFF & NEXT STEP FOR AI

- **Current Status:** `[PACKAGES A–C COMPLETE]` + typing perf + paste/mentions + slash menu + slim list + text PDF + mobile UX + mention mark URLs
- **Last Model Action:** Grok 4.6 — mention/comment notification links now use `notebookNotificationUrl` (`?mark=mention|comment`) so `useNotebookMarkFocus` can scroll. Added `docs/architecture/NOTEBOOK_MULTI_DEVICE.md`.
- **Instruction for Next AI Agent:**
  > Do not start a Yjs rewrite. Do not merge stale Jules Bolt PRs. Do not commit Supabase PATs. Playwright smoke is already red on `main` (placeholder.supabase.co). Walk `docs/architecture/NOTEBOOK_MULTI_DEVICE.md` against a real project, not placeholder.supabase.co.

---

## 2. Phase Execution & Progress Tracker

| Phase | Milestone | Status | Completed By | Log / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1.1** | Block Data Model & Core Types | `[COMPLETED]` | Jules | Define `NotebookBlock`, `BlockType`, and block tree interfaces in `src/notebook-app/types/blocks.ts` |
| **Phase 1.2** | Slash (`/`) Command System & Block Handles | `[COMPLETED]` | Antigravity | Built `SlashCommandMenu.tsx` & `BlockHandleMenu.tsx` block insertion & hover handles (`⋮⋮`) |
| **Phase 1.3** | Drag & Drop Reordering (`BlockDragContainer`) | `[COMPLETED]` | Antigravity | Built `BlockDragContainer.tsx` with drag preview & drop target reordering |
| **Phase 2.1** | Sub-pages & Craft Card Layouts | `[COMPLETED]` | Antigravity | Built `SubPageCardBlock.tsx` for Craft visual cards & sub-documents |
| **Phase 2.2** | Sidebar Tree & Global Search (`⌘K`) | `[COMPLETED]` | Antigravity | Built `SidebarPageTree.tsx` & `GlobalCommandPalette.tsx` for workspace tree & ⌘K search |
| **Phase 3.1** | Relational Database Tables | `[COMPLETED]` | Jules | Built `DatabaseTable.tsx`, `TableView.tsx` and `KanbanView.tsx` with typed columns |
| **Phase 4.1** | Realtime WebSockets & Inline Comments | `[COMPLETED]` | Grok 4.6 | Markdown three-way merge + Realtime/poll + presence carets + discussion threads. Not Yjs. |

---

## 7. Change Log & AI Model Activity Record

| Date | Model | Phase / Action | Modified Files | Test Status |
| :--- | :--- | :--- | :--- | :--- |
| `2026-09-11` | Grok 4.6 (xAI) | Mention mark URLs + multi-device checklist | `src/lib/wim-notifications.ts`, `docs/architecture/NOTEBOOK_MULTI_DEVICE.md`, `docs/NOTEBOOK_SAAS_ROADMAP.md` | URL unit path only |
| `2026-08-18` | Grok 4.6 (xAI) | Phase 4.1 live writing (Realtime + comments) | `notebookRemote.ts`, `notebookStorage.ts`, `notebookPresence.ts`, `DiscussionCommentBlock.tsx`, `App.tsx`, migration | PASS |

---

*Document Managed by WorldInMaking Core Architecture Team.*
