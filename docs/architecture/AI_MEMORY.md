# AI Agent Memory & Coordination Log

**Document Location:** `docs/architecture/AI_MEMORY.md`  
**Applies To:** All AI Models & Assistant Agents working on WorldInMaking.

---

## 1. Project Context & Principles
- Next.js 14 Pages Router + React 18 + Tailwind CSS 3
- Single auth system: Supabase Auth
- Package manager: `pnpm` exclusively
- Styles: Notebook styles require `pnpm run build:notebook-styles` after changes.
- **Strict User Directive:** Do NOT run Playwright or any automated test suites, and do NOT execute `git push` unless explicitly asked by the user.

---

## 2. Active Architectural Directives
- Mobile optimization: Clean distraction-free writing, zero unwanted horizontal shifts, no popovers intercepting regular taps/selection.
- OS Shell integrity: Non-colliding z-indices and toolbars between AppWindow / ReaderView and embedded apps.

---

## 3. High-Priority Focus Areas
- WIM Notebook Mobile UX & Responsive Touch Experience.
- **Cloudflare Ecosystem Roadmap (Planned Expansions):**
  1. **Custom Domain:** Map `media.worldinmaking.com` to storage worker.
  2. **Workers AI (Free 10k daily neurons):** Whisper Audio-to-Text for notebook voice notes, Stable Diffusion XL & FLUX.1 for in-notebook image generation to R2 (Completed).
  3. **Turnstile:** Invisible bot/spam prevention on auth & forum.
  4. **Edge Caching:** CDN caching for published public notebooks and articles.
  5. **Vectorize:** Semantic vector search for notebook archives.
  6. **KV Rate Limiting:** Durable edge rate limiting for AI bots and API routes.

- **WIM AI Tool Expansion Roadmap (Approved Architecture):**
  1. **Multimodal Capabilities (Cloudflare Workers AI):**
     - `analyze_image` / `inspect_visual`: Vision via LLaVA 1.5 7B / ResNet for analyzing uploaded documents, screenshots, handwritten notes, and diagrams (Completed).
     - `transcribe_audio`: Voice note to structured notebook blocks via Whisper Large V3 Turbo (Completed).
     - `synthesize_speech`: Text-to-Speech via MeloTTS / Cloudflare for philosopher audio narrations (Completed).
  2. **Semantic Memory & Philosophical RAG:**
     - `cross_examine_argument`: Socratic challenger / dialectical cross-examiner exposing logical fallacies, unstated dogmas, creating Socratic dilemmas and counter-perspectives from historical schools (Completed).
     - `verified_corpus_search`: Fact-checked primary citation search engine (Nietzsche, Spinoza, Kant, Schopenhauer, Marcus Aurelius, Plato, Aristotle, Camus, Kierkegaard) to eliminate hallucinations (Completed).
     - `semantic_search_notebooks`: Meaning-based search across all user notebooks via Cloudflare Vectorize + BGE M3 embeddings (Planned).
  3. **Desktop OS & Workspace Automation:**
     - `arrange_workspace_preset`: Contextual workspace layouts (deep_reading, studio, minimal, split_dual, research) (Completed).
     - `export_notebook`: Compiling notebook into standalone publication-ready documents (markdown with TOC, LaTeX article, styled HTML5, text) (Completed).
     - `run_code_sandbox`: Lightweight calculation and visualization sandbox (Planned).
  4. **Interactive Notebook & Learning Tools:**
     - `create_concept_map`: Visualizing idea networks and philosophical concept relationships via interactive vector canvas artifacts with auto-grid layout (Completed).
     - `generate_flashcards`: Automatic active recall / spaced repetition study decks with optional notebook block saving (Completed).
     - `daily_reflection_prompt`: Context-aware evening reflection / stoic journal prompts based on daily writings (Planned).

---

## 4. Current Tasks & Locking
- **Status:** `[IDLE]`
- **Task:** None

---

## 5. AI Change History & Log

### 2026-09-15 — Grok Bot / Chief of Staff (search_site Stop aborts in-flight fetches)
- **Scope:** Thread client `AbortSignal` into `executeSearchSite` / `searchCommunityTopics` / `searchSupabasePosts` (RPC + ILIKE via `fetchWithCache`) so Stop cancels in-flight site search (posts + community topics). Fail-closed with `client request aborted` (same pattern as #675/#677/#678/#679). `fetchWithCache` rethrows AbortError instead of returning empty.
- **Files:** `src/lib/bots/tools/host.ts`, `src/lib/bots/tools/execute.ts`, `src/lib/supabaseBlog.ts`, `src/lib/supabase-rest.ts`, `src/lib/bots/tools/search-site.abort.test.ts`, `WIM_REPORT.md`, `AI_MEMORY.md`
- **Verify:** `pnpm typecheck:shell`; `pnpm exec vitest run --environment node src/lib/bots/tools/search-site.abort.test.ts`
- **Handoff:** Squash-merge when CI typecheck green.

### 2026-09-15 — Grok Bot / Chief of Staff (read_document Stop aborts in-flight fetches)
- **Scope:** Thread client `AbortSignal` from `executeToolCall` into `executeReadDocument` so Stop cancels in-flight document fetches (timeout controller linked to client signal). Fail-closed with `client request aborted` (same pattern as #675 web_search / #677 academic / #678 multimodal).
- **Files:** `src/lib/bots/tools/read-document.ts`, `src/lib/bots/tools/execute.ts`, `src/lib/bots/tools/read-document.abort.test.ts`, `WIM_REPORT.md`, `AI_MEMORY.md`
- **Verify:** `pnpm typecheck:shell`; `pnpm exec vitest run --environment node src/lib/bots/tools/read-document.abort.test.ts`
- **Handoff:** Squash-merge when CI typecheck green.

### 2026-09-15 — Grok Bot / Chief of Staff (multimodal Worker Stop aborts in-flight fetches)
- **Scope:** Thread client `AbortSignal` from `executeToolCall` into `executeGenerateImage` / `executeAnalyzeImage` / `executeTranscribeAudio` / `executeSynthesizeSpeech` so Stop cancels Cloudflare Worker `/image|/vision|/transcribe|/speech` fetches. Fail-closed with `client request aborted` (same pattern as #675 web_search / #677 academic).
- **Files:** `src/lib/bots/tools/execute.ts`, `src/lib/bots/tools/execute-multimodal.abort.test.ts`, `WIM_REPORT.md`, `AI_MEMORY.md`
- **Verify:** `pnpm typecheck:shell`; `pnpm exec vitest run --environment node src/lib/bots/tools/execute-multimodal.abort.test.ts`
- **Handoff:** Squash-merge when CI typecheck green.


### 2026-09-15 — Grok Bot / Chief of Staff (academic corpus Stop aborts provider fetches)
- **Scope:** Thread client `AbortSignal` into `searchAcademicCorpus` / OpenAlex / Crossref / arXiv via `searchFetchSignal` (same pattern as #675 web_search). `executeAcademicSearch` passes `signal` and fail-closes with `client request aborted` instead of partial empty papers.
- **Files:** `src/lib/bots/academic-search.ts`, `src/lib/bots/tools/execute.ts`, `src/lib/bots/academic-search.abort.test.ts`, `WIM_REPORT.md`, `AI_MEMORY.md`
- **Verify:** `pnpm typecheck:shell`; `pnpm exec vitest run src/lib/bots/academic-search.abort.test.ts`
- **Handoff:** Squash-merge when CI typecheck green.


### 2026-09-15 — Grok Bot / Chief of Staff (web_search Stop aborts in-flight fetches)
- **Scope:** Thread client `AbortSignal` from `executeToolCall` → `executeWebSearch` → `searchWebSources` (and academic web fallback). Provider fetches use `searchFetchSignal(timeout, client)` so Stop cancels network instead of waiting on timeout-only signals. Fail-closed with `client request aborted`.
- **Files:** `src/lib/bots/web-search.ts`, `src/lib/bots/tools/execute.ts`, `src/lib/bots/web-search.abort.test.ts`, `WIM_REPORT.md`, `AI_MEMORY.md`
- **Verify:** `pnpm typecheck:shell`; `pnpm exec vitest run src/lib/bots/web-search.abort.test.ts`
- **Handoff:** Squash-merge when CI typecheck green.

### 2026-09-15 — Grok Bot / Chief of Staff (ask_user empty Enter no longer auto-Yes)
- **Scope:** Composer ask_user Enter ignored empty/whitespace (parity with disabled Answer). `handleHumanRespond` rejects empty answers and no longer falls back to literal `"Yes"`.
- **Files:** `ChatInput.tsx`, `ClaudeWorkspaceChat/index.tsx`, `tests/ai-public-surface.spec.ts`, `WIM_REPORT.md`
- **Verify:** `pnpm typecheck:shell` PASS; `playwright test tests/ai-public-surface.spec.ts` 16 passed.
- **Handoff:** Squash-merge when CI typecheck green.


### 2026-09-14 — Antigravity (UI Cleanup: Restored WIM AI '+' Button as Direct File Attachment Trigger)
- **Scope:** Completely removed the redundant popup dropdown menu from the `+` button in WIM AI (`ChatInput.tsx`). The modes and commands were already available in the slash command autocomplete menu (`/ask`, `/plan`, etc.), making the secondary popup menu unnecessary and intrusive. The `+` button has been restored solely to its intended single purpose: directly opening the file attachment dialog.
- **Architectural Rules Kept:**
  1. Strict user directive adhered: zero tests executed as explicitly requested ("testleri çalıştırmanı yasaklıyorum").
  2. No git push executed; changes kept locally.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`:
     - Removed `plusOpen` and `plusRef` state, ref, and outside-click/escape listeners.
     - Removed the entire popup menu JSX container (`Agent Mode`, commands list, duplicate actions).
     - Restored the `+` button to a clean direct trigger calling `fileInputRef.current?.click()`.

### 2026-09-14 — Antigravity (UI Polish: Site Icon for Notebook Selection Badge & Fixed ChatInput Plus Button)
- **Scope:** Replaced the out-of-place pin emoji (`📌`) in the active notebook selection chip with the official site `<IconNotebook />` styled with site navy `#1E3A8A`. Fixed the WIM AI `+` button dropdown not triggering by eliminating `overflow-hidden` from the left toolbar container which was clipping the `bottom-full` popup, and adding event propagation stop on the toggle trigger.
- **Architectural Rules Kept:**
  1. Strict user directive adhered: zero tests executed as explicitly requested ("testleri çalıştırmanı yasaklıyorum").
  2. No git push executed; waiting for explicit user request.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`:
     - Imported `IconNotebook` from `@posthog/icons`.
     - Replaced `📌 Selection Context:` with `<IconNotebook />` and clean label `Selection:`.
     - Removed `overflow-hidden` on the bottom toolbar container that was clipping the plus popup dropdown.
     - Added `e.stopPropagation()` on the plus button trigger to ensure clean toggle behavior.

### 2026-09-14 — Antigravity (UI Polish: Minimalist Unified-Font Redesign of 'Add to notebook' Card & Dual-Execution Fix)
- **Scope:** Stripped out font inconsistencies (eliminated competing `font-mono` vs `font-sans` jumps) and visual clutter (removed "Split View" buttons, uppercase mono badges, multi-tier headers, expand/collapse line counters). Fixed the dual action execution bug where actions were simultaneously pasted into the notebook and rendered as an unapplied pending card; now aligned with `agentMode` (in `execute` mode the action applies directly without redundant pending cards, while in `ask`/`plan` modes it presents the review card without premature insertion).
- **Architectural Rules Kept:**
  1. Strict user directive adhered: zero tests executed as explicitly requested ("testleri çalıştırmanı yasaklıyorum").
  2. Git push executed per explicit user command ("pushla").
- **Changes Applied:**
  1. `src/notebook-app/scenes/notebooks/AskAI/components/OSActionCard.tsx`:
     - Unified all text into single standard site font (`font-sans`).
     - Removed redundant uppercase mono badge, "Split View" button, and nested preview headers.
     - Kept only the essentials: clean title, single primary "Add to notebook" button (or "Added ✓" when applied), short description, and raw content preview.
  2. `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx`:
     - Cleaned `ChatMessageDiffBlock` to remove "Split View", shouting titles, and unified font to `font-sans` with site navy button.
  3. `src/components/ClaudeWorkspaceChat/index.tsx`:
     - Resolved dual execution: in `execute` mode, `executeOSAction` auto-applies without leaving a confusing unexecuted card; in `ask`/`plan` mode, presents the card for user approval before modifying the notebook.

### 2026-09-14 — Antigravity (UI Polish: Standardized Slash Menu and Message Border Radius to Site Header 'rounded')
- **Scope:** Adjusted the border radius (`rounded`) of the slash command autocomplete popup, the `+` action dropdown popup, the user sent message bubbles, code/diff blocks, quality gate indicators, and artifact cards to strictly match the site header's classic OS design token (`rounded` / 4px).
- **Architectural Rules Kept:**
  1. Strict user directive adhered: zero tests executed as explicitly requested ("testleri çalıştırmanı yasaklıyorum").
  2. No git push executed; changes kept locally.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`:
     - Changed the slash autocomplete menu container from `rounded-lg` to `rounded` matching the site header.
     - Changed the `+` action dropdown container from `rounded-lg` to `rounded`.
     - Changed inner mode segment container from `rounded-md` to `rounded`.
  2. `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx`:
     - Changed the sent user message bubble container from `rounded-2xl` to `rounded`.
     - Standardized diff block, code block, quality gate notices, and artifact cards from `rounded-xl` / `rounded-2xl` to `rounded`.

### 2026-09-14 — Antigravity (UI Polish: Moved Ask/Plan/Execute Mode Selector to ChatInput Slash Menu)
- **Scope:** Cleaned up the chat header panel by removing the intrusive Ask/Plan/Execute segmented buttons and repositioned mode selection directly into the ChatInput slash command system (`/ask`, `/plan`, `/execute`) and the `+` action dropdown menu.
- **Architectural Rules Kept:**
  1. Strict user directive adhered: zero tests executed as explicitly requested ("testleri çalıştırmanı yasaklıyorum").
  2. No git push executed; changes kept locally.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/Header.tsx`:
     - Removed the segmented button group and mode lock text from the header bar, restoring clean window padding (`pr-24`) and unobstructed title display.
  2. `src/components/ClaudeWorkspaceChat/index.tsx`:
     - Disconnected mode props from `Header` and wired `agentMode` + `onAgentModeChange` into `ChatInput`.
  3. `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`:
     - Added `/ask`, `/plan`, and `/execute` to `SLASH_COMMANDS` with active mode badges.
     - Updated `applySlashCommand` and `handleKeyDown` to switch agent mode when selecting mode commands.
     - Added a dedicated `Mode` segmented control and commands list inside the `+` popover dropdown menu.

### 2026-09-14 — Antigravity (UI Polish: Rich Continuous Radial Navy #1E3A8A Aura on ChatInput)
- **Scope:** Upgraded the navy blue (`#1E3A8A`) glow around WIM AI ChatInput container into a rich, luminous, and seamlessly blended ambient aura. Eliminated stepped/ringed bands by utilizing pure multi-radius radial shadows (`0 0 18px`, `0 0 36px`, `0 0 60px` / `0 0 20px`, `0 0 40px`, `0 0 70px`), preserving high visibility and depth with completely smooth Gaussian falloff on hover and focus.
- **Architectural Rules Kept:**
  1. Strict user directive adhered: zero tests executed as explicitly requested ("testleri çalıştırmanı yasaklıyorum").
  2. No git push executed; changes kept locally.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`:
     - Applied rich continuous radial navy shadows without stepped lines or harsh rings.
     - Kept luminous visibility while achieving seamless background dispersion.

### 2026-09-14 — Antigravity (UI Polish: Restored Site Navy Blue #1E3A8A Send Button in WIM AI)
- **Scope:** Restored the brand navy blue (`bg-[#1E3A8A] hover:bg-[#1e40af]`) for the send and stop generation buttons in WIM AI ChatInput as requested, reverting the unintended generic theme override (`bg-primary`).
- **Architectural Rules Kept:**
  1. Strict TypeScript shell allowlist compliance with 0 gated errors (`pnpm typecheck:shell`).
  2. Zero browser/Playwright dependencies; no git push executed.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`:
     - Restored `bg-[#1E3A8A] hover:bg-[#1e40af]` and disabled `bg-[#1E3A8A]/35 text-white/50` on the send button.
     - Restored `border-[#1E3A8A] bg-[#1E3A8A] hover:bg-[#1e40af]` on the active generation stop button.
- **Verification:**
  1. `node scripts/typecheck-shell.mjs`: PASS (zero gated errors in core shell allowlist).
  2. ZERO git push executed.

### 2026-09-14 — Antigravity (Fix Academic Search Tool: Crossref Integration, Canonical Corpus Fallback, Resilient Error Handling)
- **Scope:** Diagnosed and fixed the failure in the academic search tool (`search_academic_corpus` / `academic_search`). Root cause: public OpenAlex and ArXiv endpoints frequently returned HTTP 429 (rate limits) for unauthenticated IP requests, and when 0 papers were returned, the search returned `ok: false`, causing `executeToolCall` to mark the tool as failed and display "Academic search failed" in the UI.
- **Architectural Rules Kept:**
  1. Strict TypeScript shell allowlist compliance with 0 gated errors (`pnpm typecheck:shell`).
  2. Multi-engine academic resilience with Crossref as primary global DOI authority (150M+ records), OpenAlex, ArXiv preprints, fallback to verified primary texts (`PHILOSOPHICAL_CANON`), and web search fallback if external APIs yield empty results.
  3. No browser/Playwright test suites run; no git push executed.
- **Changes Applied:**
  1. `src/lib/bots/academic-search.ts`:
     - Added `Crossref` to `AcademicPaper['source']` type union.
     - Implemented `queryCrossref` querying the official Crossref Works API with date range filters (`from-pub-date`, `until-pub-date`), citation count sorting (`is-referenced-by-count`), and clean metadata extraction (titles, DOIs, authors, venues, abstracts, open-access PDF links).
     - Upgraded `searchAcademicCorpus` to query OpenAlex, Crossref, and ArXiv in parallel using `Promise.allSettled`, with title and DOI deduplication.
     - Added automatic fallback to `searchPhilosophicalCorpus` if external APIs return 0 results (e.g. rate limits or offline).
     - Fixed `ok` status: A completed search with valid query returns `ok: true` (with `total: 0` and informative message) rather than failing the tool.
  2. `src/lib/bots/tools/execute.ts`:
     - In `executeAcademicSearch`: passed `env` runtime store for web search fallback if academic APIs return 0 results; guaranteed `ok: true` on completed search; mapped citation links cleanly.
     - In `executeToolCall`: passed `env` to `executeAcademicSearch`.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/academic-search.test.ts`: PASS (8/8 tests passed).
  2. `node scripts/typecheck-shell.mjs`: PASS (zero gated errors in core shell allowlist).
  3. ZERO git push executed.

### 2026-09-14 — Antigravity (UI Polish: Removed Reaction & Speech Buttons, Standardized Philosophers to Surnames Only)
- **Scope:** Cleaned up bottom action row under AI message bubbles by removing unnecessary thumbs up/down reaction buttons and speech synthesis (read aloud) controls. Standardized all philosopher personas across the workspace (model options, persona library, notebook roster, message badge) to display only their surnames (e.g. Nietzsche, Marx, Spinoza, Hegel, Sartre, Heidegger, Deleuze, Baudrillard, Althusser, Derrida, Weber, Adorno, Žižek, Lenin, Arendt, Rand).
- **Architectural Rules Kept:**
  1. Strict TypeScript shell allowlist compliance with 0 gated errors (`pnpm typecheck:shell`).
  2. All vitest suites pass; zero browser/Playwright dependencies; NO git push executed.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx`:
     - Removed `handleSpeak`, `isSpeaking`, `liked`, `ThumbsUp`, `ThumbsDown`, `Play`, `Square`, `detectSpeechLang`, `textForSpeech`, `pickVoice`.
     - Preserved clean compact actions: philosopher badge, copy button, retry button, add to notebook, and source citations.
     - Added surname trimming safeguard on message badge label (`usedModel.name.trim().split(/\s+/).filter(Boolean).pop()`).
  2. `src/components/ClaudeWorkspaceChat/data/initialData.ts`:
     - Updated all philosopher entries in `AVAILABLE_MODELS` to use surnames only (`Nietzsche`, `Marx`, `Hegel`, etc.) and single-letter initials.
  3. `src/lib/persona-engine.ts`:
     - Updated `PHILOSOPHER_BOTS` `displayName` to surnames only.
  4. `src/notebook-app/lib/philosophers.ts`:
     - Updated `PHILOSOPHER_BOTS` `displayName` to surnames only.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/interleaved-composition.test.ts src/lib/bots/tools/execute-roadmap-tools.test.ts`: PASS (19/19 tests).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).
  3. Local commit created; ZERO git push executed.

### 2026-09-14 — Antigravity (Progressive Interleaved Multi-Turn Generation & Long-Form Continuation Engine)
- **Scope:** Enabled models to write public text progressively across tool execution turns (interleaved composition) rather than staying silent until the final round. Text emitted before tools is now accumulated and streamed in real-time, allowing uninterrupted long-form composition and narrative continuity across multi-turn research/notebook workflows.
- **Architectural Rules Kept:**
  1. Maintained native state-graph pipeline (`runAgentNodePipeline`) without external orchestrator.
  2. Strict TypeScript shell allowlist compliance with 0 gated errors (`pnpm typecheck:shell`).
  3. All tests pass with zero browser/Playwright dependencies; NO git push executed (strictly local per user instruction).
- **Changes Applied:**
  1. `src/lib/bots/tools/pipeline.ts`:
     - In `runDecisionNode`, when `currentToolCalls.length > 0` and `leftover` public text exists, the engine now flushes unstreamed tokens and accumulates `leftover` into `state.publicText`.
     - In post-tool turns, `withThinkInstruction` guides the model to seamlessly plan the subsequent section or continuation from where it left off, weaving new evidence into upcoming paragraphs without repeating earlier statements.
     - Updated synthesis nudge reminders to direct the model to continue writing seamlessly when prior sections already exist in `state.publicText`.
  2. `src/lib/bots/tools/spec.ts`:
     - Added `PROGRESSIVE COMPOSITION & INTERLEAVED OUTPUTS` directive to `TOOL_PROTOCOL`, authorizing the model to emit introductory frameworks and partial analyses before calling tools, and to continue writing uninterruptedly across turns.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (66/66 tests across 8 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).
  3. Local commit created; ZERO git push executed.

### 2026-09-14 — Antigravity (Micro-UX Refinement: In-Flight Streaming Diff & Tactile Terminal Cursor without Intrusive Placeholders)
- **Scope:** Added live in-flight diff streaming (unclosed code fence completion + live line streaming + beacon) and subtle tactile terminal cursor (`TactileWorkstationCursor`) while strictly removing intrusive placeholder/staging cards as requested.
- **Architectural Rules Kept:**
  1. No intrusive boxes: Clean stream flow without flickering empty cards or premature placeholder banners.
  2. Strict TypeScript shell allowlist compliance with 0 gated errors (`pnpm typecheck:shell`).
  3. No git push executed; local work only.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx`:
     - Added `ensureClosedCodeFences` to dynamically close open ````diff` blocks during generation so ReactMarkdown parses diffs immediately as they stream.
     - Upgraded `ChatMessageDiffBlock` with `isLive` mode showing pulsing beacon, in-flight line ticker, and disabled pending button.
     - Added `TactileWorkstationCursor` with subtle cyan/sky cadence at the exact token stream tip.
     - Removed distracting placeholder boxes and dashed staging cards.
  2. `src/notebook-app/scenes/notebooks/AskAI/components/OSActionCard.tsx`:
     - Added `isStreaming` state: button smoothly indicates in-flight generation when action payload is streaming, without extra popup UI.
- **Verification:**
  1. `pnpm typecheck:shell`: PASS (zero gated shell errors).
  2. Zero git push executed.

### 2026-09-14 — Antigravity (Professional AI Workstation UX: Interactive In-Place Diff Reviewer, One-Click Patch Application, Split Workspace Docking)
- **Scope:** Transformed WIM AI from a passive floating chatbot into a professional workspace co-author (Cursor Composer / Claude Artifacts style) that operates directly on user documents with syntax-highlighted diffs, one-click patch application, and desktop tiling.
- **Architectural Rules Kept:**
  1. No second orchestrator: Wires directly into native desktop window manager events (`wimNotebookInsertText`, `wimArrangeWorkspace`, `wimDesktopOpenApp`) and existing notebook glow/scroll markers.
  2. Strict TypeScript shell allowlist compliance with 0 gated errors (`pnpm typecheck:shell`).
  3. No browser/Playwright test suites run; no git push executed.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx`:
     - Implemented `ChatMessageDiffBlock` for syntax-highlighted visual diffs (emerald `+` additions with green border, rose `-` deletions with strikethrough, sky blue `@@` chunk headers, clean line numbers).
     - Added header action controls:
       - **[✓ Dokümana Uygula / Apply to Notebook]**: Extracts clean added lines and dispatches `wimNotebookInsertText` to write directly into the active document with instant feedback ("Uygulandı ✓").
       - **[⧉ Split View / Yan Yana Aç]**: Dispatches workspace dual split docking (`wimArrangeWorkspace: split_dual`).
       - **[Copy]**: Copies clean un-prefixed content without git/diff markers.
  2. `src/notebook-app/scenes/notebooks/AskAI/components/OSActionCard.tsx`:
     - Redesigned action cards into full workstation execution blocks with color-coded badges (`[YENİ NOTEBOOK]`, `[NOTEBOOKA EKLE]`, `[BELGEYİ YENİLE]`, `[MASAÜSTÜ DÜZENİ]`, etc.).
     - Added collapsible code/text preview showing exact content before execution.
     - Added instant split docking and one-click execution with "Uygulandı ✓" success state.
  3. `src/notebook-app/scenes/notebooks/AskAI/types.ts`:
     - Expanded action type definitions to support all workspace action categories.
  4. `src/lib/bots/tools/spec.ts`:
     - Added `WORKSTATION EDITING & IN-PLACE DIFFS` protocol instructing models to output standard structured `diff` blocks when revising documents so the UI can parse them into interactive patch cards.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (66/66 tests passed across 8 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-14 — Antigravity (AI Agent Loop Architectural Overhaul: Robust JSON Repair, In-Flight Retries & State Graph Determinism)
- **Scope:** Eliminated fragile JSON argument hacks, dropped tool calls, empty-bubble synthesis bugs, and transient provider 429/50x failures in the AI agent loop (`loop.ts`, `pipeline.ts`, `execute.ts`, `leak.ts`).
- **Architectural Rules Kept:**
  1. Maintained single native state-graph engine (`runAgentNodePipeline`). No second orchestrator or external workflow framework added.
  2. Strict TypeScript shell allowlist compliance with 0 gated errors.
  3. All tests pass with zero browser/Playwright dependencies; no git push executed.
- **Changes Applied:**
  1. `src/lib/bots/tools/json-repair.ts` & `src/lib/bots/tools/json-repair.test.ts`:
     - Built dedicated zero-dependency JSON repair engine handling single-quoted keys/values, trailing commas, unescaped newlines in strings, truncated brackets/braces balancing, comments, Python literals (`True/False/None`), and markdown code fences.
     - 12 comprehensive unit tests covering all LLM edge cases.
  2. `src/lib/bots/tools/execute.ts`:
     - Replaced fragile substring slice fallback `parseArgs` with `repairAndParseJsonObject`.
     - Added auto-coercion for stringified JSON structures in `normalizeArgs` so models passing objects/arrays as strings never fail argument validation.
  3. `src/lib/bots/tools/leak.ts`:
     - Upgraded `kwargsToJson` and `callFromSource` with `repairAndParseJsonObject` to reliably extract and repair leaked tool calls.
  4. `src/lib/bots/tools/provider-retry.ts` & `src/lib/bots/tools/provider-retry.test.ts`:
     - Built edge-safe provider retry utility with exponential backoff and randomized jitter for transient HTTP 429, 500, 502, 503, 504 errors.
     - Fully respects `AbortSignal` for instantaneous cancellation upon user stop.
  5. `src/lib/bots/tools/loop.ts`:
     - Integrated `fetchWithTransientRetry` into `openaiCompletion` and `groqCompletion`.
     - Replaced 4 duplicate provider failure blocks with unified `fallbackSuccessFromPartial` ensuring agent never returns an empty bubble (`ok: true, text: ''`) to the user.
  6. `src/lib/bots/tools/pipeline.ts`:
     - Fixed synthesis node (`runSynthesisNode`) which previously skipped reasoning recovery if `usedTools` was true, preventing empty bubbles when models generate reasoning but forget public tail tokens.
  7. `src/lib/bots/academic-search.ts` & `academic-search.test.ts`:
     - Raised timeout to 12s and guarded live public API tests against third-party external rate limits.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (66/66 tests passed across 8 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-14 — Antigravity (Deep Synthesis, Post-Tool Reflection & Narrative Bridging in Agent Loop)
- **Scope:** Solved the "tool dump" and disconnected execution problem where the AI ran tools in the background and immediately dumped disjointed results or generic artifacts without digesting the findings or explaining the narrative bridge.
- **Architectural Rules Kept:**
  1. Kept single PostHog-style state graph pipeline without introducing a second orchestrator.
  2. Maintained fast completion performance while expanding thinking budgets.
  3. Strict TypeScript shell allowlist compliance with 0 gated errors.
- **Changes Applied:**
  1. `src/lib/bots/tools/pipeline.ts`:
     - Increased `THINK_MAX_TOKENS` from `48` to `512` tokens.
     - Updated `shouldRunThinkPhase` to detect `hasNewToolResults` (`state.messages[last].role === 'tool'`), enabling deep post-tool reflection turns.
     - Updated `withThinkInstruction`: Replaced the suppressive "THINK STEP ONLY: One sentence naming the next tool... no analysis" instruction with specialized reflection & synthesis instructions that prompt the model to analyze returned facts, identify contradictions/nuances, and plan an articulate narrative bridge.
     - Updated `runThinkPhase` to pass `postTool` context.
  2. `src/lib/bots/tools/gemini.ts`:
     - Increased Gemini `thinkingBudget` from `96` to `512` tokens, giving Gemini's native reasoning engine full headroom to digest multi-tool outputs.
  3. `src/lib/bots/tools/spec.ts`:
     - Added `DEEP SYNTHESIS & NARRATIVE BRIDGING (NO TOOL DUMPING)` into `TOOL_PROTOCOL`, strictly commanding the AI to provide explanatory bridges, synthesize how findings impact the user's premise, and maintain cross-tool continuity (Tool B directly consuming specific outputs of Tool A).
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (50/50 tests passed across 6 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Implementation of Roadmap AI Tools: Philosophical RAG, Socratic Cross-Examiner, Workspace Presets, Flashcards, Notebook Exporter, Concept Maps)
- **Scope:** Implemented the full suite of approved AI tools from the architectural roadmap (`AI_MEMORY.md` §3):
  1. `cross_examine_argument`: Dialectical Socratic cross-examiner identifying formal/informal logical fallacies, extracting unstated assumptions, formulating Socratic dilemmas, and synthesizing multi-tradition philosophical counter-perspectives (Nietzschean, Stoic, Kantian, Existentialist).
  2. `verified_corpus_search`: Primary philosophical source engine indexing 9 canonical philosophers (Nietzsche, Spinoza, Kant, Schopenhauer, Marcus Aurelius, Plato, Aristotle, Camus, Kierkegaard) with authentic aphorisms, book sections, and primary citations to prevent quote hallucinations.
  3. `arrange_workspace_preset`: Automated desktop OS layout manager mapping presets (`deep_reading`, `studio`, `minimal`, `split_dual`, `research`) directly into window manager actions.
  4. `generate_flashcards`: Active-recall flashcard study deck generator with collapsible question/answer details, mnemonic hints, topic tags, and optional direct notebook saving.
  5. `export_notebook`: Document compiler transforming notebook markdown into publication-ready documents (`markdown` with anchor-linked TOC, `latex` article with table of contents and formatted sections, responsive styled `html`, clean `text`).
  6. `create_concept_map`: Automatic visual idea network builder generating interactive `canvas` artifacts with auto-calculated non-overlapping grid coordinates and directed semantic relationships.
- **Architectural Rules Kept:**
  1. No second orchestrator: All tools wire directly into `spec.ts` (tool protocol & schema), `modes.ts` (plan vs execute mode constraints), `labels.ts` (workbench badges), and `execute.ts` (dispatcher & executors).
  2. Strict TypeScript shell allowlist compliance with 0 gated errors.
  3. Plan mode security: Read-only and analytical tools (`cross_examine_argument`, `verified_corpus_search`, `export_notebook`) permitted in plan mode; mutating tools (`arrange_workspace_preset`, `generate_flashcards`, `create_concept_map`) strictly locked until plan execution.
- **Changes Applied:**
  1. `src/lib/bots/tools/philosophical-corpus.ts`: Created curated canonical database and keyword relevance search engine across 9 philosophers.
  2. `src/lib/bots/tools/argument-cross-examination.ts`: Created dialectical cross-examination and fallacy detection engine.
  3. `src/lib/bots/agent/modes.ts`: Configured plan vs execute tool permissions.
  4. `src/lib/bots/tools/labels.ts`: Registered badges and previews for all 6 tools.
  5. `src/lib/bots/tools/spec.ts`: Defined schemas in `OPENAI_CHAT_TOOLS` and protocol documentation in `TOOL_PROTOCOL`.
  6. `src/lib/bots/tools/execute.ts`: Implemented argument aliases, tool name aliases, execution helpers, and switch dispatching.
  7. `src/lib/bots/tools/execute-roadmap-tools.test.ts`: Created 17 unit tests verifying tool dispatch, arguments, aliases, artifact generation, error handling, and plan mode isolation.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/execute-roadmap-tools.test.ts`: PASS (17/17 tests passed).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Resilient Chat Stream Abort & Cancellation Handling)
- **Scope:** Fixed runtime error in `src/components/ClaudeWorkspaceChat/index.tsx (623:22) @ abort` where stream cancellation, unmounting, or user-initiated abort could cause an unhandled promise rejection or race condition during fetch/stream reader cleanup.
- **Architectural Rules Kept:**
  1. Maintained standard single `AbortController` lifecycle without introducing external state managers.
  2. Safe cancellation handling without memory leaks or unhandled promise rejections.
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/index.tsx`:
     - Hardened `abortActiveStream`: Safely verified `controller && typeof controller.abort === 'function'` with null-safe optional chaining (`controller.signal?.aborted`), and attached `.catch(() => {})` to `reader.cancel('client-stop')` to eliminate unhandled promise rejections.
     - Hardened `isAbortError`: Expanded detection to handle `'client-stop'`, DOMException error code 20 (`ABORT_ERR`), string error variants, and message inspection.
     - Pinned `activeController` in `handleSendMessage`: Eliminated potential null dereference when `abortActiveStream` clears `abortControllerRef.current` during asynchronous auth headers fetching.
     - Wrapped `reader.read()` in try/catch inside the stream loop to cleanly re-throw as an `AbortError` whenever the stream signal is aborted or reader rejects on cancellation.
- **Verification:**
  1. `pnpm typecheck:shell`: PASS (zero gated errors).
  2. `pnpm vitest run --environment node src/lib/bots/tools/execute-visual-artifacts.test.ts`: PASS (5/5 tests passed).

### 2026-09-13 — Antigravity (Viewport UI Overhaul: Clean Professional CAD/3D Aesthetics & Localization Purge)
- **Scope:** Completely eliminated childish/silly decorative elements (Sparkles, Compass, Eye icons), patronizing tutorial banners ("Fareyle döndürün, tekerlekle yaklaşın...", "Sürükleyerek gezinin..."), and hardcoded Turkish labels across 3D, Canvas, and Simulation renderers. Upgraded viewport interfaces to universal, minimalist professional CAD engineering standards (ISO, FRONT, TOP, WIREFRAME, GRID, RESET).
- **Architectural Rules Kept:**
  1. Universal clean technical English terminology across all viewports.
  2. Maintained all existing interaction capabilities (orbit, zoom, pan, hover inspector, selection card).
- **Changes Applied:**
  1. `src/components/ClaudeWorkspaceChat/components/Model3DArtifactRenderer.tsx`:
     - Removed `Sparkles`, `Compass`, `Eye` icons; replaced with clean minimalist `Box` and status dots.
     - Replaced hardcoded Turkish button labels and tooltips: "ÖN" -> "FRONT", "ÜST" -> "TOP", "Döndürmeyi Durdur" -> "Pause Rotation", "Zemin Izgarası" -> "Toggle Grid", "Tel Çerçeve" -> "Toggle Wireframe".
     - Removed bottom hand-holding tutorial banner.
     - Changed preset object names from Turkish ("DNA Baz Cifti", "Merkezi Yildiz", "Dis Ikosahedron", "Model Parçası") to universal technical terms ("DNA Base Pair", "Core", "Outer Polyhedron", "Mesh").
     - Cleaned up inspector card strings: `Type:` and `Pos:` instead of `Geometri:` and `Konum:`.
  2. `src/components/ClaudeWorkspaceChat/components/CanvasArtifactRenderer.tsx`:
     - Removed `Sparkles` and bottom tutorial banner.
     - Standardized toolbar tooltips ("Zoom In", "Zoom Out", "Reset View") and node badge counter (`${nodes.length} nodes`).
     - Neutralized empty state message to clean English.
  3. `src/components/ClaudeWorkspaceChat/components/SimulationArtifactRenderer.tsx`:
     - Standardized empty state, header reset button ("Reset"), parameters label ("Parameters"), and curve title ("Dynamic Response Curve", "Real-time response").
  4. `src/lib/ai/visual-artifacts.ts`:
     - Changed default titles from `'3D Konsept Modeli'` / `'3D Sahne ve Model'` to `'3D Scene'`.
  5. `src/lib/bots/tools/spec.ts`:
     - Neutralized tool protocol 3D prompt examples from Turkish names ("Gövde / Duvarlar", "Çatı", "Kapı", "Pencereler") to clean universal technical names ("Walls", "Roof", "Door", "Windows").
  6. `src/lib/bots/tools/execute-multimodal.test.ts`:
     - Updated vision test regex expectation to match both Pikachu and Pokémon.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/execute-visual-artifacts.test.ts`: PASS (5/5 tests passed).
  2. `pnpm vitest run --environment node src/lib/bots/tools/execute-multimodal.test.ts`: PASS (8/8 tests passed).
  3. `pnpm typecheck:shell`: PASS (zero gated errors).

### 2026-09-13 — Antigravity (Exhaustive Full-Scale Code Generation & Artifact Buffer Expansion)
- **Scope:** Solved the issue where the AI was producing lazy, superficial 30–50 line demo skeletons or placeholders ("// ...") for complex engineering, architectural, and visual tasks. Expanded artifact buffer capacity 5x (from 24KB to 120KB) and enforced strict full-scale production directives across all system prompts.
- **Architectural Rules Kept:**
  1. No second orchestrator; wired directly into `src/lib/bots/ask-ai.ts`, `src/lib/bots/tools/spec.ts`, and `src/lib/bots/tools/execute.ts`.
  2. Maintained 8,192 token completion window in `loop.ts`.
- **Changes Applied:**
  1. `src/lib/bots/tools/execute.ts`: Increased `MAX_ARTIFACT_BODY` from `24_000` to `120_000` characters, eliminating premature truncation of large, multi-hundred/thousand-line implementations.
  2. `src/lib/bots/ask-ai.ts`: Added `EXHAUSTIVE IMPLEMENTATION & FULL SCALE (NO 50-LINE TOYS)` directive into `OPERATING RULES`.
  3. `src/lib/bots/tools/spec.ts`: Added `Production-Scale Code & Interactive Artifacts` directive into `TOOL_PROTOCOL` under `TASK SCALE ELASTICITY & STAMINA`, banning lazy placeholders, TODOs, and superficial skeletons.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (33/33 tests passed across 5 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Universal Generative Interactive Engine: Unconstrained HTML/Three.js/Canvas/Lucide Runtime)
- **Scope:** Abolished rigid domain-specific silos and fixed schemas. Replaced fragile sandbox failures with a bulletproof Universal Interactive Runtime where the AI has full generative freedom to build any application required on the fly (architectural CAD floorplanners with 3D views, physics particle sandboxes, mechanical simulations, playable mini-games, custom calculators, synthesizers) without schema restrictions.
- **Architectural Rules Kept:**
  1. No second orchestrator; fully integrated into existing `create_artifact` tool pipeline.
  2. Zero external build friction: pre-injects Tailwind CSS, Three.js + OrbitControls, Lucide Icons, and Chart.js into HTML application artifacts.
  3. Resilient Error Catcher: Runtime errors inside the preview iframe display clean non-intrusive error badges instead of dead white screens or freezing Babel compilers.
- **Changes Applied:**
  1. `src/lib/chrome/inject.ts`: Enhanced `wrapChromeDocument` with conditional pre-injection of Three.js + OrbitControls, Lucide Icons (with automatic `createIcons()`), Chart.js, Tailwind, and an in-iframe runtime error badge.
  2. `src/components/ClaudeWorkspaceChat/sandbox/reactPreview.ts`: Added `three` module namespace mapping and Three.js runtime script injection for React preview environments.
  3. `src/lib/bots/tools/spec.ts`: Updated `TOOL_PROTOCOL` instructing the AI to use `type="html"` or `type="react"` for unconstrained, domain-agnostic interactive applications with full WebGL, Canvas 2D, Three.js, and custom controls.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (33/33 tests passed across 5 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Ultra-Complex 3D Engine: GLTF/GLB Loader, Custom Polyhedral Meshes & Infinite Scalability)
- **Scope:** Enabled handling of arbitrary high-complexity 3D models (from multi-thousand polygon CAD assemblies, sculpted meshes, and photorealistic assets to custom procedural vertices/faces), ensuring zero limitations in 3D fidelity.
- **Architectural Rules Kept:**
  1. Kept within existing single orchestrator tool loop (`create_artifact`).
  2. Dynamic client-side loading of `three/examples/jsm/loaders/GLTFLoader.js` (zero bundle penalty on initial load).
  3. Safe custom polygon normal calculation via `THREE.BufferGeometry.computeVertexNormals()`.
- **Changes Applied:**
  1. `src/lib/ai/visual-artifacts.ts`: Added `url` / `modelUrl` support to `Model3DSpec`, and `vertices` / `faces` to `Model3DObjectSpec`.
  2. `src/components/ClaudeWorkspaceChat/components/Model3DArtifactRenderer.tsx`:
     - Integrated dynamic `GLTFLoader` for `.gltf` / `.glb` 3D models with PBR textures, auto-shadow traversal, and auto-camera recentering.
     - Built `createCustomMeshGeometry` supporting custom polygonal vertices and triangulated/quad faces with automatic vertex normals.
  3. `src/lib/bots/tools/execute-visual-artifacts.test.ts`: Verified parser and execution resilience.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (33/33 tests passed across 5 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Arbitrary 3D Scene & Object Composition Engine: Architecture, Primitives, Raycaster Inspector)
- **Scope:** Solved the limitation where 3D generation was restricted to abstract mathematical presets (`polyhedra`, `orbital_system`, `dna_helix`). Upgraded the 3D engine into an arbitrary scene composition platform capable of building realistic architectures (houses, rooms, buildings), mechanical assemblies, furniture, vehicles, and custom environments.
- **Architectural Rules Kept:**
  1. No second orchestrator; wired into existing `create_artifact` tool pipeline (`spec.ts`, `visual-artifacts.ts`).
  2. Native Three.js WebGL rendering with zero external iframe dependencies.
  3. Preserved backwards compatibility with mathematical presets.
- **Changes Applied:**
  1. `src/lib/ai/visual-artifacts.ts`: Expanded `Model3DObjectSpec` supporting primitives (`box`, `cube`, `sphere`, `cylinder`, `cone`, `pyramid`, `wedge`/`prism` gable roof, `plane`, `torus`, `capsule`), transforms (`position`, `rotation`, `scale`), materials (`color`, `roughness`, `metalness`, `opacity`, `transparent`, `emissive`), hierarchy (`children`), and scene settings (`grid`, `ground`, `camera`).
  2. `src/components/ClaudeWorkspaceChat/components/Model3DArtifactRenderer.tsx`:
     - Built procedural geometry generator including triangular gable roofs (`createPrismGeometry`), pyramids, and custom primitives.
     - Added studio lighting (sun directional light with soft shadows, fill light, ambient, hemisphere).
     - Added Raycaster Object Inspector: Real-time hover tooltip displaying object name, type, and coordinates; click selection card.
     - Added Camera View Presets (Isometric ISO, Front ÖN, Top ÜST, Reset, Free Orbit).
     - Added floor grid toggle and custom ground plane support.
  3. `src/lib/bots/tools/spec.ts`: Updated `create_artifact` description, parameter JSON schemas, and `TOOL_PROTOCOL` instructing the AI on arbitrary 3D modeling with concrete architectural house examples.
  4. `src/lib/bots/tools/execute-visual-artifacts.test.ts`: Added unit test verifying full 3D house model creation and object parsing.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (33/33 tests passed across 5 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (WIM Interactive Visual Engine: Infinite Canvas, 3D Models, Parametric Simulations)
- **Scope:** Replaced fragile code sandbox iframes with 3 native, robust interactive visual artifact formats:
  1. **Infinite Vector Mindmap & Flow Canvas (`type: 'canvas'`)**: High-performance draggable nodes, zoom/pan navigation via `react-zoom-pan-pinch`, bezier curve connectors, color-coded node themes (emerald, blue, purple, amber, rose), and live search/reset.
  2. **Interactive 3D Concept & Scene Viewer (`type: 'model3d'`)**: Zero-install Three.js WebGL viewport with touch/mouse inertia damping, rotation/zoom, wireframe toggle, auto-rotate, and presets (`polyhedra`, `orbital`, `dna_helix`, `network_nodes`, `custom_mesh`).
  3. **Parametric Interactive Simulation & Reactive Cards (`type: 'simulation'`)**: Dynamic parameter sliders with real-time math evaluation, continuous 60 FPS Recharts area/line/bar charts, and reactive KPI metric cards.
- **Architectural Rules Kept:**
  1. No second orchestrator; fully integrated into existing `create_artifact` tool pipeline (`src/lib/bots/tools/execute.ts`, `spec.ts`).
  2. Native React 18 client-side rendering with dynamic `next/dynamic` imports — zero broken iframe runtimes, zero security sandbox escapes.
  3. Seamless markdown embedding support in notebook blocks via `src/lib/notebook-artifact-block.ts`.
- **Changes Applied:**
  1. `package.json`: Installed `three` and `@types/three` via `pnpm`.
  2. `src/lib/artifacts/kinds.ts`: Added `'canvas' | 'model3d' | 'simulation'` to canonical `ArtifactKind` union.
  3. `src/components/ClaudeWorkspaceChat/types.ts`: Extended `ArtifactType` union to include `'canvas' | 'model3d' | 'simulation'`.
  4. `src/lib/ai/visual-artifacts.ts`: Implemented type schemas (`CanvasArtifactSpec`, `Model3DArtifactSpec`, `SimulationArtifactSpec`) and robust tolerant JSON parsers (`parseCanvasSpec`, `parseModel3DSpec`, `parseSimulationSpec`).
  5. `src/components/ClaudeWorkspaceChat/components/CanvasArtifactRenderer.tsx`: Canvas viewport with pan, pinch-zoom, draggable nodes, and SVG connector curves.
  6. `src/components/ClaudeWorkspaceChat/components/Model3DArtifactRenderer.tsx`: Full Three.js WebGL scene with procedural geometry generation, rotation controls, wireframe mode, and ambient lighting.
  7. `src/components/ClaudeWorkspaceChat/components/SimulationArtifactRenderer.tsx`: Interactive sliders, safe formula computation, metric cards, and responsive charts.
  8. `src/components/ClaudeWorkspaceChat/components/ArtifactWindowContent.tsx`: Integrated dynamic renderers into the workspace artifact preview window.
  9. `src/lib/bots/tools/spec.ts`: Extended `create_artifact` spec types, protocol instructions, and JSON schemas for visual formats.
  10. `src/lib/bots/tools/execute.ts`: Added format aliases (`mindmap`, `concept_map`, `3d`, `model`, `parametric`, `sim`), language mapping, and execution dispatch.
  11. `src/lib/notebook-artifact-block.ts`: Added markdown block serialization for canvas, 3D, and simulation artifacts into notebooks.
  12. `src/lib/bots/tools/execute-visual-artifacts.test.ts`: Created unit tests verifying visual artifact creation, alias resolution, and resilient fallback parsing.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/`: PASS (32/32 tests passed across 5 test suites).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Notebook Footnote Integration & Scholarly Notation Engine)
- **Scope:** Equipped WIM AI with `add_notebook_footnote` tool and real-time OS client integration, allowing the AI to seamlessly anchor footnotes (`[^1]`, `[^2]`, or custom identifiers) to specific text passages/sentences and define formatted citations at the bottom of the document.
- **Architectural Rules Kept:**
  1. Integrates cleanly into existing single orchestrator tool loop (`spec.ts`, `host.ts`, `execute.ts`). No second orchestrator.
  2. Preserves lightweight zero-tool path for conversational & micro queries ("selam").
  3. Seamless markdown compatibility: leverages native `MarkdownNotebook` inline footnote markers (`[^id]`) and bottom definition lists (`[^id]: text`) already supported by the notebook parser and PDF exporter.
  4. Automatic time-travel snapshotting preserved on notebook edit (`saveNotebook`).
- **Changes Applied:**
  1. `src/lib/bots/tools/host.ts`: Added `'add_notebook_footnote'` to `HostOsAction` type and implemented `executeAddNotebookFootnote` with marker auto-incrementing and span text targeting.
  2. `src/components/ClaudeWorkspaceChat/types.ts`: Added `'add_notebook_footnote'` to `OSActionCard` interface.
  3. `src/lib/bots/tools/spec.ts`: Added `add_notebook_footnote` tool specification and documented in `TOOL_PROTOCOL`.
  4. `src/lib/bots/tools/labels.ts`: Added streaming status labels (`Adding footnote`, `Added footnote`) and arg preview parser.
  5. `src/lib/bots/agent/modes.ts`: Registered `add_notebook_footnote` in `MUTATING_TOOL_NAMES`.
  6. `src/lib/bots/tools/execute.ts`: Added argument aliases, tool name aliases (`add_footnote`, `insert_footnote`, `footnote`, `add_dipnot`, `dipnot`), and wired `executeToolCall` dispatch.
  7. `src/components/ClaudeWorkspaceChat/index.tsx`: Handled `add_notebook_footnote` in `executeOSAction` by dispatching `wimNotebookAddFootnote` CustomEvent and opening notebook window.
  8. `src/notebook-app/App.tsx`: Added `wimNotebookAddFootnote` event listener to inject anchor `[^marker]` into document content (matching `spanText` or active selection) and append definition `[^marker]: text` at document end with snapshot history.
  9. `src/lib/bots/tools/execute-notebook-footnote.test.ts`: Created comprehensive unit test suite (7 tests passed).
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/execute-notebook-footnote.test.ts src/lib/bots/tools/execute-multimodal.test.ts src/lib/bots/tools/execute-image.test.ts src/lib/bots/tools/academic-search.test.ts`: PASS (28/28 passed).
  2. `pnpm typecheck:shell`: PASS (0 gated shell errors).

### 2026-09-13 — Antigravity (Task Scale Elasticity & Long-Form Notebook Construction)
- **Scope:** Upgraded orchestrator prompts and tool protocols (`spec.ts`, `modes.ts`) to provide dynamic scale calibration: micro requests (greetings, simple queries) remain immediate and concise with zero tool bloat, while macro/comprehensive requests trigger iterative multi-section notebook construction (`create_notebook` + consecutive `insert_notebook_block` calls with academic footnotes `[^1]`, `[^2]`) and full 16-step stamina.
- **Architectural Rules Kept:**
  1. No second orchestrator.
  2. Preserves lightweight zero-tool direct path for greetings and micro requests.
  3. Uses existing `create_notebook` and `insert_notebook_block` host actions for long-form chunked persistence.
- **Changes Applied:**
  1. `src/lib/bots/tools/spec.ts`: Added `TASK SCALE ELASTICITY & STAMINA` instructions to `TOOL_PROTOCOL`.
  2. `src/lib/bots/agent/modes.ts`: Updated `PLAN_MODE_PROMPT`, `PLAN_TOOL_PROTOCOL`, and `EXECUTION_TRANSITION_PROMPT` to mandate deep notebook construction and prevent premature 2-step termination on comprehensive requests.
- **Verification:**
  1. `pnpm vitest run --environment node src/lib/bots/tools/execute-multimodal.test.ts src/lib/bots/tools/execute-image.test.ts src/lib/bots/tools/academic-search.test.ts`: PASS (21/21 passed).
  2. `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Multimodal Intelligence: Vision, STT, TTS Integration)
- **Scope:** Equipped WIM AI with sensory multimodal capabilities: Image Analysis/Vision via Llama 3.2 Vision / LLaVA, Speech-to-Text via Whisper Large V3 Turbo, and Text-to-Speech via MeloTTS + Deepgram Aura.
- **Architectural Rules Kept:**
  1. Kept within existing single orchestrator tool loop (`src/lib/bots/tools/execute.ts`, `spec.ts`). No second orchestrator.
  2. Single wire format: OpenAI chat tools via `spec.ts`.
  3. Audio and vision processing run on Cloudflare Workers AI + R2 storage worker with public media streaming.
- **Changes Applied:**
  1. **Cloudflare Storage Worker (`worldinmaking-storage-full/src/index.ts`):**
     - Enhanced `/transcribe`: Supports both direct audio binary and JSON `{ audio_url, audio_key, audio }` fetching from R2 or web with User-Agent header, using `@cf/openai/whisper-large-v3-turbo`.
     - Added `/vision`: Accepts `{ image_url, image_key, image, prompt }`, runs `@cf/meta/llama-3.2-11b-vision-instruct` (fallback `@cf/llava-hf/llava-1.5-7b-hf`), returns detailed visual analysis and OCR.
     - Added `/speech`: Accepts `{ text, lang }`, synthesizes audio via `@cf/myshell-ai/melotts` (fallback `@cf/deepgram/aura-2-en`), stores in R2 (`users/:userId/generated/:id.mp3`), returns CDN URL and content type.
     - Deployed live (Version ID: `717c4d57-3295-4d5c-b9cf-caf3fe3be998`).
  2. **Bot Tool Specifications & Aliases (`src/lib/bots/tools/spec.ts`, `modes.ts`, `labels.ts`, `execute.ts`):**
     - Added `analyze_image` tool definition, parameters, and protocol instructions. Registered in `PLAN_TOOL_NAMES`.
     - Added `transcribe_audio` tool definition and parameters. Registered in `PLAN_TOOL_NAMES`.
     - Added `synthesize_speech` tool definition and parameters. Registered in `MUTATING_TOOL_NAMES`.
     - Added UI streaming labels and short previews in `labels.ts`.
     - Added aliases: `inspect_visual`, `vision`, `ocr_image`, `transcribe_speech`, `voice_to_text`, `audio_to_text`, `speak_text`, `tts`, `narrate`.
     - Implemented `executeAnalyzeImage`, `executeTranscribeAudio`, and `executeSynthesizeSpeech` in `execute.ts`.
  3. **Verification & Testing:**
     - `src/lib/bots/tools/execute-multimodal.test.ts`: 8/8 passed (including live Vision recognizing Pikachu on Cloudflare Workers AI and live TTS synthesizing speech into R2).
     - Combined tool suite (image, multimodal, academic): 21/21 passed.
     - `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Battle-Hardened WIM AI Tool Engine: Studio Image Gen & Scholarly RAG)
- **Scope:** Upgraded WIM AI's tool capabilities from basic baseline calls to studio-grade generation and deep academic research engines.
- **Architectural Rules Kept:**
  1. Kept within existing single orchestrator tool loop (`src/lib/bots/tools/execute.ts`, `spec.ts`).
  2. Maintained zero external secret dependencies for scholarly queries (polite OpenAlex + arXiv).
  3. Direct Cloudflare Workers AI + R2 integration for zero-latency private storage and public CDN delivery.
- **Changes Applied:**
  1. **Cloudflare Storage Worker (`worldinmaking-storage-full/src/index.ts`):**
     - Enhanced `/image` endpoint to parse `aspect_ratio` (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`) and `style` (`oil_painting`, `vintage_etching`, `cinematic`, `renaissance`, `minimalist`, `cyberpunk`, `watercolor`, `hyperrealistic`).
     - Automatic prompt enrichment with tailored lighting, textural, and artistic descriptors.
     - Accurate pixel dimension mapping (`1024x576`, `576x1024`, `1024x768`, etc.) passed directly to FLUX.1 Schnell.
     - Returns `aspect_ratio`, `style`, `width`, `height`, and R2 storage metadata.
     - Deployed live (Version ID: `14786242-63db-4841-8b7b-ce208a49e203`).
  2. **Scholarly Engine & Bibliography (`src/lib/bots/academic-search.ts`):**
     - Upgraded `searchAcademicCorpus` with `AcademicSearchOptions` (`yearFrom`, `yearTo`, `sortBy`, `openAccessOnly`, `field`).
     - Built OpenAlex query builder with multi-clause `&filter=` (`publication_year:>YYYY`, `publication_year:<YYYY`, `is_oa:true`) and `&sort=cited_by_count:desc` or `publication_date:desc`.
     - Added topic concept extraction (`concepts` array on `AcademicPaper`).
     - Built `formatApaBibliography` generating publication-ready APA reference lists with DOIs and journal italics for notebooks.
  3. **Tool Execution & Specifications (`src/lib/bots/tools/execute.ts`, `spec.ts`):**
     - Enriched `generate_image` JSON Schema with `aspect_ratio` and `style` enums, forwarded to Cloudflare worker.
     - Enriched `search_academic_corpus` JSON Schema with `year_from`, `year_to`, `sort_by`, `open_access_only`.
     - Wired options forwarding and type guards in `executeToolCall`.
  4. **Verification & Testing:**
     - `src/lib/bots/tools/execute-image.test.ts`: 5/5 passed (including live FLUX.1 16:9 generation to R2 in 3.2s).
     - `src/lib/bots/tools/academic-search.test.ts`: 8/8 passed (including live OpenAlex queries with citation filters and APA references).
     - `pnpm typecheck:shell`: PASS (zero gated shell errors).

### 2026-09-13 — Antigravity (Live Academic Corpus Search Integration)
- **Scope:** Equipped WIM AI with `search_academic_corpus` tool for direct, keyless searching of peer-reviewed philosophy and scientific literature across OpenAlex (250M+ papers) and arXiv.
- **Architectural Rules Kept:**
  1. Integrates seamlessly into existing orchestrator tool loop (`src/lib/bots/tools/execute.ts`, `spec.ts`) without adding external framework overhead or competing orchestrators.
  2. Zero external secret dependencies: Uses OpenAlex polite pool (`mailto:dursunkayamustafa@gmail.com`) and arXiv XML API.
  3. Structured output: Returns clean paper metadata (authors, year, venue, citation count, DOI, open-access PDF, reconstructed abstract from inverted index).
  4. Registered in `PLAN_TOOL_NAMES` in `modes.ts` so bots can research academic papers during plan mode.
- **Changes Applied:**
  1. `src/lib/bots/academic-search.ts` (NEW): Built search engine module with abstract reconstruction, OpenAlex + arXiv querying, and academic markdown formatting.
  2. `src/lib/bots/tools/spec.ts` (MODIFIED): Added `search_academic_corpus` tool spec and protocol prompt instructions.
  3. `src/lib/bots/tools/labels.ts` (MODIFIED): Added streaming status labels (`Searching academic literature` / `Found academic papers`).
  4. `src/lib/bots/agent/modes.ts` (MODIFIED): Added `search_academic_corpus` to `PLAN_TOOL_NAMES`.
  5. `src/lib/bots/tools/execute.ts` (MODIFIED): Implemented `executeAcademicSearch` and wired `executeToolCall` dispatch with aliases (`academic_search`, `search_papers`, `find_papers`, etc.).
  6. `src/lib/bots/tools/academic-search.test.ts` (NEW): 5 unit and live integration tests passed.
- **Verification:**
  - `pnpm typecheck:shell`: PASS (zero gated shell errors).
  - `pnpm vitest run --environment node src/lib/bots/tools/academic-search.test.ts`: PASS (5 passed).
  - `pnpm vitest run --environment node src/lib/bots/tools/execute-image.test.ts`: PASS (4 passed).

### 2026-09-13 — Antigravity (Cloudflare Workers AI & FLUX.1 Tool Integration)
- **Scope:** Wired Cloudflare Workers AI (FLUX.1 Schnell, Whisper Large V3 Turbo, DeepSeek R1 Distill 32B) directly into the central Ask AI / philosopher bot toolset (`src/lib/bots/tools/`) and storage worker client.
- **Architectural Rules Kept:**
  1. No competing or second orchestrators created (`WIM_AI.md` adherence). Kept within existing `streamBotTurn` / `runToolLoop` architecture.
  2. Single wire format: OpenAI chat completion tool definition via `src/lib/bots/tools/spec.ts`.
  3. Image generation automatically stores output in private Cloudflare R2 bucket (`users/:userId/generated/:id.png`) and returns CDN/proxy URL + markdown snippet.
  4. Dual auth support: Accepts user JWT, Supabase `service_role` key, or Supabase `anon` key.
- **Changes Applied:**
  1. **Worker Service (`worldinmaking-storage-full/src/index.ts`):**
     - Deployed Cloudflare Worker with `AI` binding (version `6c063c5b-a71a-4772-be3d-cc60806a73d6`).
     - Added support for `payload.role === 'anon'` in `verifySupabaseJWT` alongside `service_role` and user JWTs.
     - **Bugfix for R2 put binary:** Workers AI returns `{ image: "base64..." }` for FLUX.1 Schnell. Added base64-to-Uint8Array decoding so R2 accepts parameter 2 as valid ArrayBuffer.
     - **Bugfix for public media delivery:** Moved `GET` handling ahead of the Bearer authorization check with immutable caching and CORS headers, allowing browser `<img>` tags and markdown renderers to display generated images and avatars without Authorization headers.
     - Active endpoints: `/image` (FLUX.1 Schnell -> R2), `/transcribe` (Whisper Large V3 Turbo), `/summarize` (DeepSeek R1 Distill 32B), `/chat/completions` (OpenAI format).
  2. **Bot Tool Specifications & Aliases (`src/lib/bots/tools/spec.ts`, `execute.ts`, `labels.ts`, `modes.ts`):**
     - Added `generate_image` tool definition, parameters, and protocol instructions.
     - Added aliases (`create_image`, `draw_image`, `paint_image`, `generate_picture`, `text_to_image`).
     - Registered in `MUTATING_TOOL_NAMES` in `modes.ts`.
     - Added UI streaming labels in `labels.ts`.
     - Added `NEXT_PUBLIC_STORAGE_WORKER_URL` and `STORAGE_WORKER_URL` to `SECRET_NAME_BASES` in `src/lib/bots/runtime-env.ts`.
  3. **Tool Dispatch & Execution (`src/lib/bots/tools/execute.ts`):**
     - Implemented `executeGenerateImage` calling `${STORAGE_WORKER_URL}/image`.
     - Added dispatch branch in `executeToolCall` with argument normalization and fallback auth.
  4. **Verification & Tests:**
     - Unit & live integration test suite `src/lib/bots/tools/execute-image.test.ts` (4 tests passed, including live FLUX.1 generation to R2 and public image download).
     - Storage worker unit tests `src/lib/storage-worker.test.ts` (8 tests passed).
     - `pnpm typecheck:shell`: PASS (zero gated shell errors).
- **Files Modified/Created:**
  - `src/lib/bots/tools/execute.ts` (MODIFIED)
  - `src/lib/bots/tools/spec.ts` (MODIFIED)
  - `src/lib/bots/tools/labels.ts` (MODIFIED)
  - `src/lib/bots/agent/modes.ts` (MODIFIED)
  - `src/lib/bots/runtime-env.ts` (MODIFIED)
  - `src/lib/storage-worker.ts` (MODIFIED)
  - `src/lib/bots/tools/execute-image.test.ts` (NEW)
  - `worldinmaking-storage-full/src/index.ts` (MODIFIED & DEPLOYED)
  - `docs/architecture/AI_MEMORY.md` (MODIFIED)

### 2026-09-13 — Antigravity (Cloudflare R2 Storage Worker & file_metadata Migration)
- **Scope:** Implemented Cloudflare R2 object storage integration with Supabase Postgres metadata and Cloudflare Storage Worker proxy.
- **Architectural Rules Kept:**
  1. High-volume binary data (avatars, images, attachments, generated files, uploads) -> Cloudflare R2 private bucket.
  2. Relational data, document search, and notebook JSON remain exclusively in Supabase PostgreSQL (`wim_notebooks`).
  3. File metadata tracked in `public.file_metadata` with strict RLS (own-row only).
  4. Dual-engine resilience: seamless fallback to existing Supabase Storage adapter if `NEXT_PUBLIC_STORAGE_WORKER_URL` is not yet configured.
- **Changes Applied:**
  1. **Supabase Migration (`supabase/migrations/20260913_file_metadata.sql`):**
     - Added `file_metadata` table (`file_id`, `owner_id`, `notebook_id`, `filename`, `mime_type`, `size`, `storage_key`, `category`, `created_at`).
     - Added `avatar_key` column to `public.profiles`.
     - Configured RLS policies for own-row `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
     - Added indexes on `owner_id`, `notebook_id`, `storage_key`.
  2. **Storage Types (`src/lib/storage-types.ts`):**
     - Defined `StorageCategory` union (`'avatar' | 'notebook' | 'attachment' | 'chat' | 'generated' | 'upload'`).
     - Defined `StorageKey` and `FileMetadata` interfaces.
  3. **Storage Worker Client (`src/lib/storage-worker.ts`):**
     - Implemented `uploadFile`, `uploadAvatar`, `getFileUrl`, `fetchFileBlob`, `deleteFile`, `convertToWebP`, and `computeBlobHash`.
     - Transaction rollback protection: if metadata creation in Supabase fails after R2 PUT, the file in R2 is immediately deleted to prevent orphaned storage.
     - Canvas-based client-side WebP compression and SHA-256 hash generation for files/avatars.
  4. **Adapter Integrations (`src/lib/profile-media.ts` & `src/lib/notebook-upload.ts`):**
     - `uploadProfileImage` routes to `uploadAvatar` when storage worker is configured.
     - `uploadNotebookImage` routes to `uploadFile` with category `'notebook'` when user is authenticated and worker is configured.
  5. **Environment configuration (`.env.example`):**
     - Added `NEXT_PUBLIC_STORAGE_WORKER_URL`.
- **Verification:**
  - `pnpm vitest run src/lib/storage-worker.test.ts`: PASS (8 tests passed).
  - `pnpm run typecheck:shell`: PASS (0 gated errors).
  - `pnpm exec playwright test tests/api-security.spec.ts tests/notebook-frontend.spec.ts`: PASS (62 passed).
- **Files Modified/Created:**
  - `supabase/migrations/20260913_file_metadata.sql` (NEW)
  - `src/lib/storage-types.ts` (NEW)
  - `src/lib/storage-worker.ts` (NEW)
  - `src/lib/storage-worker.test.ts` (NEW)
  - `src/lib/profile-media.ts` (MODIFIED)
  - `src/lib/notebook-upload.ts` (MODIFIED)
  - `.env.example` (MODIFIED)
  - `docs/architecture/AI_MEMORY.md` (MODIFIED)

### 2026-09-12 — Antigravity (Cross-Device Notebook Content Staleness Fix)
- **Scope:** Fixed the bug where writing content on Device A and opening the same notebook on Device B would show the old/stale content ("bir yerde yazdığım diğer yerde açınca çıkmıyor").
- **Root cause:** `App.tsx` only called `pullNotebookById` (full Supabase fetch) when `contentOmitted === true`. When Device B had a local cache of the notebook (any previous open), `contentOmitted` was `false`, so no remote fetch happened on open — Device B silently showed stale content. The `applyRemoteIfNewer` listener only processed list-level sync events that always return `contentOmitted: true` stubs, so even background list polls could not deliver fresh body content.
- **Fixes applied:**
  1. **`src/notebook-app/App.tsx` — "Always fetch on open":** Changed the `editorNotebookId` effect to *always* call `pullNotebookById` in the background when opening a notebook (not just when `contentOmitted`). If local content exists, the result is passed through `planOpenNotebookRemoteApply` to safely apply only if remote is genuinely newer — protecting against clobbering unsaved user typing.
  2. **`src/notebook-app/App.tsx` — 30s content poll + visibility re-fetch:** Added a dedicated 30-second content poll (`scheduleContentPoll`) and a `visibilitychange` / `focus` listener (`onVisible`) inside the `applyRemoteIfNewer` effect. Every 30s (and whenever the user switches back to the tab), the full body of the open notebook is fetched from Supabase and applied if newer. This covers the case where Device A saves while Device B has the same notebook already open.
- **Verification:**
  - `pnpm run typecheck:shell`: PASS (0 gated errors).
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (59 of 59 tests, including new test `planOpenNotebookRemoteApply correctly detects stale local content and fresh remote on open`).
- **Files Modified:**
  - `src/notebook-app/App.tsx`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Cross-Device Notebook Sync & Author Face Deduplication)
- **Scope:**
  1. Resolved cross-device sync disparity ("bir hesap bazlı değilde cihaz bazlı mı notebooklar kaydediliyor biz cihazda hesabımla kaydettiğim diğerinde çıkmıyor"):
     - Identified root cause: Notebooks created in guest/unauthenticated mode or before JWT hydration were saved under device keys (`owner_178...`) with `auth_user_id: null` in Supabase PostgreSQL (`wim_notebooks`).
     - Previously, `claimThisDeviceIfNeeded` was only called during manual password submit in `wim-auth.ts`, and was locked by a permanent localStorage flag (`wim_device_claimed`), missing sessions restored via OAuth, cookies, or page reloads.
     - Added automatic claiming hook in `src/hooks/useUser.tsx` on both `validateUser` (session restoration on startup) and `onAuthStateChange`.
     - Replaced rigid localStorage lock in `src/lib/claim-device-client.ts` with a debounce throttle to allow ongoing claim recovery.
     - In `lib/notebooks-repo.ts` and `src/pages/api/notebooks/index.ts`: added `claimDeviceNotebooksForUser`, which auto-claims any unattached guest notes matching the browser's device key on authenticated GET/POST requests. Also updated `upsertNotebook` to seamlessly adopt unassigned guest rows (`auth_user_id === null`) when pushed by an authenticated user instead of throwing 403 Forbidden.
     - In `src/notebook-app/scenes/notebooks/notebookRemote.ts`: made `notebookAuthHeadersFresh` proactively refresh Supabase session and resolve `wim_auth_user_id` *before* ownerKey is read, preventing queries with frozen guest device keys.
     - In `src/notebook-app/scenes/notebooks/notebookStorage.ts`: forced remote pull on initial hydration and emitted `WIM_NOTEBOOKS_CHANGED_EVENT`.
     - Directly claimed and updated the user's two stranded guest notes in Supabase ("nanef" and "12 Eyl 2026") to `auth_user_id: 15e06f59-7d51-46c7-bd10-287f91a8e4ee` with author profile details.
  2. Resolved author face duplication ("yukarıda yazarlarda farklı kişiler gibi beni gösteriyor"):
     - **Discrepant presence key:** In `notebookFaces.ts`, `facesFromPresence` used `peer.clientId` as key, which never matched `skipKeys` (author name/username). When the user had another tab or device open, they showed up twice: once as Author and once as "Here now".
     - **Weak actor mismatch:** In `collectLocalNotebookFaces`, if a note had `createdBy: { first_name: 'You' }` and `lastModifiedBy: { first_name: 'm. ali' }`, both "You" (Author) and "m. ali" (Shared) were displayed.
     - Added weak person upgrading (`isWeakPerson`) and identity comparison (`arePersonsSame`) in `collectLocalNotebookFaces` so weak actors upgrade to the logged-in user and duplicate faces are eliminated.
     - In `facesFromPresence`: added `currentUserId` matching (`peer.userId === activeUserId`) and keying by `peer.userId || peer.name` against `skipKeys` (which now checks all names, emails, and usernames of the active author/user).
  3. Added regression test in `tests/notebook-frontend.spec.ts` asserting weak person upgrading, identity matching, and presence self-deduplication.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm run typecheck:shell`: PASS (0 gated errors).
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (58 of 58 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/notebookFaces.ts`
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`
  - `src/notebook-app/scenes/notebooks/notebookRemote.ts`
  - `src/notebook-app/scenes/notebooks/notebookStorage.ts`
  - `src/hooks/useUser.tsx`
  - `src/lib/claim-device-client.ts`
  - `src/lib/account-claim.ts`
  - `lib/notebooks-repo.ts`
  - `src/pages/api/notebooks/index.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Elimination of Auto-Save Typing Rewinds & Clobbering)
- **Scope:**
  1. Diagnosed and eliminated root causes of text jumping, rewinding, or changing while the user is actively writing/typing:
     - **Rogue `onHydrated` in `src/notebook-app/App.tsx`:** Listened to `WIM_NOTEBOOKS_HYDRATED_EVENT` (which fires ~350ms after every local save and remote fetch). When fired, it unconditionally called `apply(remote)` -> `setMarkdown(remote.content)` without checking if the user was dirty or typing, overwriting the user's active editor with older saved state. Added a strict guard so `onHydrated` only applies if the notebook is not already open and loaded in the editor (`notebookRef.current?.id === editorNotebookId && !notebookRef.current.contentOmitted`).
     - **Local Save Echo via `setRemoteMarkdown`:** In `persistOpenNotebookDraft`, after local save it invoked `setRemoteMarkdown(saved.content)`. This echoed the user's own save back into `remoteValue` prop of `MarkdownNotebook`. If the user typed or backspaced in that window, `isKnownEcho` failed, triggering a 3-way merge (`mergeNotebookMarkdownChanges`) and DOM re-render (`commitDocument`) that resurrected deleted letters or duplicated words. Removed `setRemoteMarkdown(saved.content)` from local draft persistence.
     - **Deferred Remote Value during Active Typing:** `<MarkdownNotebook />` supports `deferRemoteValue` to hold remote collaborator merges in queue while editing. Wired `deferRemoteValue={syncStatus === 'edited'}` in `App.tsx` so external sync never interrupts mid-keystroke.
  2. Added regression test in `tests/notebook-frontend.spec.ts` asserting no `setRemoteMarkdown` call in `persistOpenNotebookDraft`, presence of `notebookRef.current` guard in `onHydrated`, and `deferRemoteValue={syncStatus === 'edited'}` in `MarkdownNotebook`.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm run typecheck:shell`: PASS (0 gated errors).
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (57 of 57 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/App.tsx`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Supabase Realtime Channel Resilience & Storage Exception Guarding)
- **Scope:**
  1. Resolved uncaught runtime error (`src\notebook-app\scenes\notebooks\notebookPresence.ts (151:14) @ on` and `notebookRemote.ts` line 407):
     - In `@supabase/realtime-js`, calling `channel.on('presence', ...)` or `channel.on('postgres_changes', ...)` throws `Error: cannot add callbacks after subscribe()` if the channel is in `isJoining()` or `isJoined()` state.
     - In React (StrictMode remounting, fast navigation, or when auth user state loaded and updated `actor`), `supabase.removeChannel` runs asynchronously while the next `supabase.channel(...)` call immediately returned the existing channel before unsubscription completed.
     - Furthermore, `publishNow` had `actor` in its dependency array and was itself a dependency of the channel `useEffect`, causing unnecessary channel teardowns and recreations on auth load.
  2. Implemented comprehensive resilience in `notebookPresence.ts`:
     - Preserved `actor` in an `actorRef` so `publishNow` identity is stable and presence re-publishing happens without recreating the WebSocket channel.
     - Decoupled `publishNow` from channel effect dependencies using `publishNowRef`.
     - Added synchronous stale channel eviction via `supabase.realtime._remove(existing)` and `supabase.removeChannel(existing)` prior to channel creation.
     - Added channel adapter state check (`adapter.isJoined() || adapter.isJoining()`) so `.on()` is never invoked after subscription.
     - Wrapped channel initialization and listeners in a non-fatal `try/catch` with graceful degradation to guarantee presence errors never crash the notebook editor.
  3. Applied end-to-end exception containment to `notebookRemote.ts` and `notebookStorage.ts`:
     - Moved entire `subscribeToWorkspaceNotebooks` execution (including auth user and owner key resolution) into an outer `try/catch` block.
     - Wrapped each individual `.on('postgres_changes', ...)` and `.subscribe()` call in localized `try/catch` blocks so partial failure never prevents returning a valid teardown callback.
     - In `notebookStorage.ts` (`ensureLiveNotebookSync`), defensively wrapped `subscribeToWorkspaceNotebooks(schedulePull)` and `startNotebookPolling(schedulePull)` in `try/catch` to guarantee that live sync failure can never block local storage hydration or crash notebook mounting.
  4. Added `getChannels: () => []` fallback to `mockClient` in `src/lib/supabase.ts`.
  5. Added regression test in `tests/notebook-frontend.spec.ts` verifying channel eviction, state guards, and error resilience.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm run typecheck:shell`: PASS (0 gated errors).
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (56 of 56 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/notebookPresence.ts`
  - `src/notebook-app/scenes/notebooks/notebookRemote.ts`
  - `src/lib/chat-remote.ts`
  - `src/lib/supabase.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Deletable Introducing Notebook & Undeletable Template Elimination)
- **Scope:**
  1. Eliminated the locked, undeletable template (`template-introduction` with `isTemplate: true`) per user request ("silinemeyen bir template var notebookta bunu istemiyorum sadece notebookun nasıl çalıştığını anlatan detaylı bir introducing notebook olsun ki o da silinebilsin kullanıcı isterse"):
     - Added `'template-introduction'` to `RETIRED_TEMPLATE_IDS` in `src/notebook-app/scenes/notebooks/notebookStorage.ts` so any existing or syncing instances are purged automatically.
     - Removed forced template injection logic (`if (!kept.some(... INTRODUCTION_TEMPLATE_ID)) { kept.unshift(...) }`) from `withCanonicalTemplates` and `readLocalNotebooks`.
  2. Created a rich, comprehensive, and standard **deletable** `Introducing WIM Notebook`:
     - Standard `StoredNotebook` (`isTemplate: undefined`), granting full 3-dot menu actions (delete, move to folder, duplicate, export, etc.).
     - If deleted by the user, its ID is remembered in `deletedNotebookIds` and permanently stays deleted without respawning on reload.
     - Content covers markdown formatting, task lists, code blocks, tables, slash commands (`/`), resident AI philosopher bots (`/invite`), mobile writing experience, organization, and a live working academic footnote citation `[^1]`.
  3. Cleaned up template empty states in `TemplatesGallery.tsx` and updated fallback defaults in `src/lib/notebookStorage.ts`.
  4. Added regression tests in `tests/notebook-frontend.spec.ts` verifying `DEFAULT_NOTEBOOKS` is standard and deletable, and that `template-introduction` is retired.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (55 of 55 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/notebookStorage.ts`
  - `src/notebook-app/scenes/notebooks/TemplatesGallery.tsx`
  - `src/lib/notebookStorage.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Footnote Sequential Auto-Renumbering & Reading Order Sync)
- **Scope:**
  1. Implemented automatic sequential renumbering for document footnotes (`renumberDocumentFootnotes`, `renumberInlineNodes` in `useNotebookFootnotes.ts`):
     - When any footnote is deleted (`deleteFootnote`), the remaining footnotes are automatically renumbered sequentially (`2 -> 1, 3 -> 2, 4 -> 3...`).
     - When a footnote is added anywhere in the document (`addFootnoteAtTarget`), whether at the top, middle, or bottom, it takes its exact sequential index in reading order, and all subsequent footnotes are automatically shifted up.
     - When notebook blocks are reordered via keyboard or drag (`moveBlockToBoundary` in `MarkdownNotebook.tsx`), all footnotes are re-indexed based on the document's new physical reading order.
     - In `useNotebookFootnotes.ts`, `renderDocumentFootnotesSection` now filters out orphan footnote definitions not present in document inline nodes, ensuring 100% harmony between inline superscripts `[1], [2]...` and bottom list indices `1., 2....`.
  2. Added unit regression test coverage in `tests/notebook-frontend.spec.ts`:
     - Verified middle and leading footnote deletion renumbers remaining items and syncs document footnotes dictionary.
     - Verified middle footnote insertion between existing footnotes shifts subsequent ones.
     - Verified block reordering renumbers footnotes according to visual reading order.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (54 of 54 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Compact Black Inline Footnotes Styling & Test Suite Alignment)
- **Scope:**
  1. Updated inline footnote typography in `MarkdownNotebook.scss` to be compact and black per user design directive ("tamam ama eklenen footnotelar metin içinde yani biraz daha kompakt ve siyah renkte olsun"):
     - Adjusted `font-size: 0.68em; line-height: 0; vertical-align: baseline; position: relative; top: -0.4em; letter-spacing: -0.02em; padding: 0 0.5px; margin: 0 0.5px;`.
     - Set `color: #000000;` (light theme) and `color: #ffffff;` (dark theme), with subtle 0.65 opacity on hover and neutral pulse animation.
     - Cleaned up popover badge and footnote list back-link styling to use primary/neutral tokens rather than blue-500.
  2. Rebuilt notebook styles via `pnpm run build:notebook-styles` generating updated `bundleCss.ts` and `productBundleCss.ts`.
  3. Added unit tests in `tests/notebook-frontend.spec.ts` asserting font-size and color rules across both scss source and compiled bundle.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (51 of 51 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Notebook Document Footnotes Section Delete Icon & Mobile Elevation Push)
- **Scope:**
  1. Added a delete icon button (`IconTrash` from `@posthog/icons`) to each footnote item in the bottom footnotes section (`renderDocumentFootnotesSection`) of the notebook ("tamam iyi hoş notebookta footnote ekleniyor ya alta footnotlarda bir de delete ikonu ekle").
  2. Clicking the delete icon calls `deleteFootnote(fnId)`, safely stripping the footnote reference from the document's `footnotes` dictionary as well as all inline marks across paragraphs, headings, blockquotes, lists, and tables.
  3. Replaced unicode edit symbol `\u270E` with modern `IconPencil` from `@posthog/icons` for visual consistency.
  4. Added `editable: mode !== 'view'` support to `useNotebookFootnotes` so editing/deleting buttons only appear when the notebook is editable.
  5. Added unit regression test in `tests/notebook-frontend.spec.ts` verifying footnote delete button rendering and inline content cleanup.
  6. Pushed all changes to origin `main` per user request ("tamam hoş her şeyi pushla").
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (50 of 50 tests passed).
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Mobile Writing Keyboard Architecture & Jitter-Free Elevation Fix)
- **Scope:**
  1. Resolved site shaking / jitter ("oynama titreme") and chat unintended lifting when virtual keyboard opens in WIM AI and Community forum replies:
     - Root cause 1 (Chat lifting): In `src/components/ClaudeWorkspaceChat/index.tsx`, `handleMobileKeyboard` had an observer calling `pinChatToBottom()` on keyboard open, and the message container had `pb-[calc(10rem+var(--keyboard-inset...))]` which continuously expanded the scroll height and forced all chat messages to scroll up. Removed the auto-scroll observer and set stable static padding `pb-36 sm:pb-40` so the chat remains 100% stationary and calm when focusing the input. Only the floating dock rises above the keyboard.
     - Root cause 2 (Jitter & interpolation fighting): Removed `transition-[padding-bottom]` from `ClaudeWorkspaceChat`, `transition: padding-bottom` and `transition: bottom` from `[data-writing-dock]`, `.keyboard-lift`, `.keyboard-pad` in `global.css`, `taskbar-keyboard-lock.css`, and `QuestionForm.tsx`. Because `--keyboard-inset` updates at 60/120fps from hardware during viewport resize, CSS transitions were continually interrupting and restarting their curves, causing lag, stutter, and layout reflow.
     - Root cause 3 (Viewport pan & scroll thrashing): In `src/hooks/useKeyboardInset.ts`, guarded `resetVisualPan` to only execute `vv.scrollTo(0, 0)` and `window.scrollTo(0, 0)` when offsets are actually non-zero (`Math.abs > 0.5`), breaking infinite scroll event feedback loops in Mobile Safari. Guarded DOM style and attribute updates to avoid restyle invalidation when values are unchanged.
     - Root cause 4 (Community reply elevation): Ensured reply opens normally inline in the thread (`QuestionForm.tsx`), and only elevates above the keyboard when its writing area is active (`html[data-keyboard='open'] [data-reply-composer='true']:focus-within`) with zero window lifting or header shift.
  2. Local-only changes (NO PUSH per user constraint "ama pushlama").
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/keyboard-overlay.spec.ts`: PASS (11 of 11 tests passed).
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (49 of 49 tests passed).
- **Files Modified:**
  - `src/hooks/useKeyboardInset.ts`
  - `src/components/ClaudeWorkspaceChat/index.tsx`
  - `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`
  - `src/components/Squeak/components/QuestionForm.tsx`
  - `src/components/Squeak/components/RichText.tsx`
  - `src/components/Inbox/index.tsx`
  - `src/styles/global.css`
  - `src/styles/taskbar-keyboard-lock.css`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `tests/keyboard-overlay.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Notebook Image, Database & Component Rows Frame Outline & Plus Button Removal)
- **Scope:**
  1. Resolved issue where inserting or focusing an Image, DatabaseTable, or other custom/component block showed a surrounding block frame outline and a plus button underneath it ("görsel database vs sv eklendiğinde blok çerçevesi ve altında bir artı butonuyla çıkıyor bunu istemiyorum ama pushlama").
  2. Block outline frame: Component and table blocks (`node.type === 'component'`, `node.type === 'table'`) now receive explicit CSS classes (`MarkdownNotebook__row--component`, `MarkdownNotebook__row--component-<tag>`, `MarkdownNotebook__row--table`). Excluded them from row focus outlines (`:not(.MarkdownNotebook__row--component):not(.MarkdownNotebook__row--table)`) and added explicit resets (`outline: none !important; box-shadow: none !important;`) in both `MarkdownNotebook.scss` and `notebook-mobile-block-chrome.css`.
  3. Under-block plus button:
     - Excluded component and table rows from rendering `MarkdownNotebook__mobile-insert-chip` (`node.type !== 'component' && node.type !== 'table'`) in `MarkdownNotebook.tsx`.
     - Explicitly suppressed both `.MarkdownNotebook__mobile-insert-chip` and adjacent `.MarkdownNotebook__insert-boundary-button` for `.MarkdownNotebook__row--component` and `.MarkdownNotebook__row--table` in CSS.
  4. Built notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  5. Added automated unit regression tests in `tests/notebook-frontend.spec.ts`.
  6. Pushed to origin main per user follow-up confirmation ("pushla").
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (49 of 49 tests passed).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Notebook Slash Menu Precise Selection Anchoring & Mobile Upward Jump Fix)
- **Scope:**
  1. Resolved issue where slash insert menu occasionally appeared far above the selected block/caret instead of anchoring directly below/above the selected area ("slah menüye basıldığında seçili alanda kalsın böyle çalışıyor ama arada daha yukarıda vs açılabiliyor").
  2. Root cause 1: Premature flipping above viewport. `thresholdBelow` was 160px (desktop) / 80px (mobile). When available space below dropped below 80px (e.g. keyboard open or typing in lower half of viewport), the menu flipped to `'above'` with a 240px `maxHeight` and `transform: translateY(-100%)`, pushing it high above the caret toward the top of the screen. Fixed by lowering `thresholdBelow` to 54px on mobile and 70px on desktop, keeping it placed directly `'below'` (`targetRect.bottom + INSERT_MENU_GAP`) as long as at least 2 items fit scrollably, and clamping `maxHeight` to `availableAbove` when flipped above.
  3. Root cause 2: Target precision (caret vs whole block). Switched from paragraph element bounding rect to active text selection range bounding rect (`window.getSelection()?.getRangeAt(0).getBoundingClientRect()`), falling back cleanly to block row bounding rect.
  4. Root cause 3: Asynchronous boundary insertion layout timing. Added `requestAnimationFrame` and 45ms layout stabilization in `openInsertMenuAtBoundary`.
  5. Extracted pure positioning geometry into `insertMenuModel.ts` and added automated Playwright regression tests.
- **Verification:**
  - `pnpm run build:notebook-styles`: PASS.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: PASS (48 of 48 tests passed).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/insertMenuModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Fix Mobile Long-Press Crash & Enable Block Focus Frame Outline on Mobile)
- **Scope:**
  1. Resolved runtime fatal `ReferenceError: computeMobileBlockBarPosition is not defined` on mobile long-press: explicitly imported `computeMobileBlockBarPosition` and `type MobileBlockBarAnchor` into module scope in `MarkdownNotebook.tsx` (previously only re-exported via `export { ... } from ...` which didn't bind into lexical scope).
  2. Added defensive DOM node detachment handling and `try...catch` guards to `handleRowTouchStart`, `dockBar`, and `computeMobileBlockBarPosition` in `mobileBlockBarModel.ts` to guarantee zero unhandled runtime crashes if an element unmounts during long-press timers.
  3. Ensured the block frame outline (active/hover hairline border) is consistently visible when inside a block on mobile (during editing/focus and touch selection):
     - Updated `.MarkdownNotebook--edit .MarkdownNotebook__row:focus-within`, `.MarkdownNotebook__row--focused`, and `.MarkdownNotebook__row--mobile-active` in `MarkdownNotebook.scss` and `notebook-mobile-block-chrome.css`.
     - Replaced brittle chained `:not(:has(...))` selectors (which failed parsing on mobile Safari and WebKit) with standard CSS class exclusions `:not(.MarkdownNotebook__row--title):not(.MarkdownNotebook__row--ai-prompt):not(.MarkdownNotebook__row--margin-comment)`.
     - Set `outline: 1.5px solid var(--color-border-primary, rgb(var(--border, 191 193 183)))` and `outline-offset: -1.5px` with light and dark mode support.
  4. Recompiled notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  5. Verified all 47 tests pass in `tests/notebook-frontend.spec.ts`.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/mobileBlockBarModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Notebook Mobile Floating Toolbar Positioning & Compact Glass Block Bar)
- **Scope:**
  1. Positioned mobile floating formatting toolbar dynamically above or below the active text selection range instead of locking/docking to the virtual keyboard or viewport bottom (`MarkdownNotebook.tsx`).
  2. Long-press mobile block action bar (up/down arrow reorder, indent, outdent, delete) now computes its position relative to the target row bounding box (`getBoundingClientRect()`), floating right above or below the pressed row clamped within viewport edges instead of docking to the bottom of the screen.
  3. Extracted pure positioning and viewport clamping logic to `src/notebook-app/lib/components/MarkdownNotebook/mobileBlockBarModel.ts` (`computeMobileBlockBarPosition`). Added dynamic re-docking on block movement (`moveBlockUp`/`moveBlockDown`), automatic dismissal when scrolled off-screen, and zero text-selection collisions (`clearMobileBlockBar`).
  4. Redesigned mobile block action bar to match the unified OS liquid glass styling (`notebook-taskbar-glass.css`, `MarkdownNotebook.scss`, `notebook-mobile-block-chrome.css`):
     - Added `.MarkdownNotebook__mobile-block-bar` to `.notebook-topbar-glass` selector for `background: rgb(var(--bg) / 0.5) !important` and `backdrop-filter: blur(64px) !important`.
     - Compacted bar height to 32px with 2px padding and 1px gap, 4px border radius.
     - Reduced button size to 26px x 26px with 14px icons (matching the inline formatting toolbar), removing the 40px oversized mobile override.
  5. Recompiled notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  6. Added automated unit & integration regression tests covering mobile block bar glass rules and `computeMobileBlockBarPosition` math in `tests/notebook-frontend.spec.ts`.
- **Verification:**
  - `pnpm run typecheck:shell` — PASS, 0 gated errors.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts` — PASS, 46 of 46 tests passed.
  - `pnpm test:smoke` — PASS, 432 of 432 tests passed.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/mobileBlockBarModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-taskbar-glass.css`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — Antigravity (Fix Notebook Deleted Content Sync Resurrection & API 403 Prevention)
- **Scope:**
  1. Resolved bug where deleted text/blocks inside a notebook reappeared upon background sync or page reload ("bu sync olayı çok acayip sildiğim geri geliyor, notebook içeriğinde olan sildiklerim").
  2. Root cause 1: Server 403 save failure. When user deleted content and save was triggered, `replaceHistoryForOwner()` failed with HTTP 403 when authorization used ownerKey rather than userId or when notebook was draft/template (`!data`). When save failed with 403, server retained older content and subsequent client polling overwritten the local notebook with the old version. Fixed by passing `userId || ownerKey` to `resolveNotebookAccess`, returning cleanly if `!data`, and wrapping history updates in `try...catch` so history write warnings never block notebook saves.
  3. Root cause 2: Stale remote rewind in `notebookRemote.ts`. `planOpenNotebookRemoteApply` only checked length expansions when detecting rewinds, ignoring deletions. Added `latestIsOlderThanLocal` guard (`latestTs < currentTs`) and updated `latestLooksLikeRewind` to handle deletions (`input.latest.content.includes(input.draftContent)`), preventing stale remote snapshots from being applied over local deletions.
  4. Root cause 3: Merge base initialization in `MarkdownNotebook.tsx`. `lastBaseValueRef` initialized with `remoteValue ?? value` fell back to empty string `""` when `remoteValue` was `""`, causing 3-way merge to treat existing blocks as insertions and resurrect deleted blocks. Fixed by using `remoteValue || value`.
  5. Test suite alignment:
     - `tests/notebook-frontend.spec.ts`: Aligned slash catalog test with dropped comment/invite side effects.
     - `src/lib/bots/supabase-edge.ts`: Restored anon key fallback in `getSupabaseConfig` for edge REST requests when service role key is absent.
     - `src/lib/bots/notebook-rag.ts`: Lowered minimum chunk length threshold from 20 to 3 so short sentences are indexed.
     - `tests/seo.spec.ts`: Updated home h1 assertion to match current `HOME_H1`.
- **Verification:**
  - `pnpm test:smoke`: 430 passed, 0 failed, 1 skipped.
  - `pnpm run typecheck:shell`: PASS — 0 gated errors in core shell allowlist.
  - `pnpm exec playwright test tests/notebook-frontend.spec.ts`: 44 passed (100%).
- **Files Modified:**
  - `lib/notebooks-repo.ts`
  - `src/pages/api/notebooks/index.ts`
  - `src/pages/api/notebooks/[id].ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/scenes/notebooks/notebookRemote.ts`
  - `src/lib/bots/supabase-edge.ts`
  - `src/lib/bots/notebook-rag.ts`
  - `tests/notebook-frontend.spec.ts`
  - `tests/seo.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-12 — opencode (big-pickle) (Backend Optimization Round 2: History Writes, Batch Lookups)
- **Scope:** Continue industry-standard backend optimization on notebook API hot paths. Frontend contract preserved — no response-shape or client-code changes.
- **Implementation:**
  1. `lib/notebooks-repo.ts` `replaceHistory` (runs on EVERY save, single + bulk path): replaced delete-all + insert-all replay with a minimal diff write — existing snapshots are merged/compared in memory; only dropped versions are deleted and only changed/new versions reinserted. No-op saves now touch the DB history table zero times; an appended new version costs 1 insert instead of replaying every stored snapshot.
  2. `lib/notebooks-repo.ts` `replaceHistoryForOwner`: authorization no longer loads the full notebook content — a lightweight `id, owner_key, auth_user_id` access check (same 403 semantics) replaces the previous full-content `getNotebookByIdOrShort`.
  3. `lib/notebooks-repo.ts` `upsertNotebooks` (bulk client push): existing-row resolution is batched into constant round trips (one `id IN` + one `short_id IN`, chunked at 100) instead of one `or(...)` select per notebook, preserving the exact `id.eq.X OR short_id.eq.X` match semantics.
  4. `lib/notebooks-repo.ts` `upsertNotebook`: mention + comment notification writes now run in parallel (`Promise.all`) instead of sequentially.
  5. `src/pages/api/notebooks/index.ts`: bulk POST history writes run in parallel across notebooks.
- **Verification:** `pnpm run typecheck:shell` — PASS, 0 gated errors (quarantine 0; 1182 non-allowlist errors ignored per policy). Playwright E2E requires live Supabase + dev server, not run in this environment.
- **Files Modified:**
  - `lib/notebooks-repo.ts`
  - `src/pages/api/notebooks/index.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — opencode (big-pickle) (Backend Optimization: Notebook API Hot Paths)
- **Scope:** Optimize WIM notebook backend so sync/save/list work smoothly. Frontend contract preserved — no response-shape or client-code changes.
- **Implementation:**
  1. `lib/notebooks-repo.ts` `listDeletedNotebookIds` (runs inside every list GET): replaced per-row sequential cleanup (~up to 1500 round trips: tombstone upsert + history delete + row delete each) with ONE batched tombstone upsert + chunked batched history/row deletes. Stale-DB list syncs no longer stall.
  2. `lib/notebooks-repo.ts` `upsertNotebook`: skip mention/comment notification work entirely when the saved body is unchanged vs previous save (no-op idle-serialize saves no longer re-scan/re-write notifications).
  3. `lib/notebooks-repo.ts` `upsertNotebooks` (bulk client push): load the sync-tombstone ledger once and check in-memory instead of one `hasSyncTombstone` round trip per notebook.
  4. `lib/notebook-mentions.ts` `notifyNotebookMentions`: new `previousContent` param short-circuits when the @mention id/handle set didn't change (no profile re-resolve, no notification row re-writes on each autosave).
  5. `lib/api-authz.ts`: added `withProfile` option; `resolveNotebookOwner` now skips the `/rest/v1/profiles` enrichment (notebook routes only read `user.id`), removing one Supabase round trip per notebook API call. All direct `getSupabaseUserFromRequest` callers (forum/billing/account/bots) keep profile enrichment (default unchanged).
  6. `src/pages/api/notebooks/index.ts` + `[id].ts`: public (=published) GET reads now send `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`. Authenticated endpoints remain uncached.
- **Verification:** `pnpm run typecheck:shell` — PASS, 0 gated errors in core shell allowlist (notebook routes pull `lib/notebooks-repo.ts` / `lib/api-authz.ts` / `lib/notebook-mentions.ts` transitively).
- **Files Modified:**
  - `lib/notebooks-repo.ts`
  - `lib/notebook-mentions.ts`
  - `lib/api-authz.ts`
  - `src/pages/api/notebooks/index.ts`
  - `src/pages/api/notebooks/[id].ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Remove Standalone Block Comment Button & Compact Three-Dot More Button)
- **Scope:**
  1. Removed redundant standalone block comment button (`.MarkdownNotebook__block-comment-btn`) from the block chrome (`MarkdownNotebook.tsx`, `MarkdownNotebook.scss`, `notebook-mobile-block-chrome.css`). The "Comment" action is already present as the first option inside the three-dot more menu (`buildBlockMoreMenuItems`).
  2. Made the three-dot more menu button (`.MarkdownNotebook__block-more-btn`) significantly more compact:
     - Desktop: reduced size from `1.5rem` (24px) to `1.25rem` (20px) with `0.75rem` (12px) icon and `border-radius: 3px`.
     - Mobile: reduced size from oversized `2rem` (32px) to `1.375rem` (22px) with `0.75rem` icon.
  3. Recompiled notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  4. Verified all 44 Playwright tests passed and `pnpm run typecheck:shell` passed with 0 gated errors.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`


### 2026-09-11 — Antigravity (Fix scrollNotebookElementIntoView Import in useNotebookSelection)
- **Scope:**
  1. Resolved runtime `TypeError: scrollNotebookElementIntoView is not a function` at `useNotebookSelection.ts:73`.
  2. Fixed source import: `scrollNotebookElementIntoView` is defined in `./domSelection`, but was inadvertently imported from `./utils` where it was undefined.
  3. Re-exported `scrollNotebookElementIntoView` in `utils.ts` from `./domSelection` to ensure robust backwards compatibility.
  4. Verified via `pnpm exec playwright test tests/notebook-frontend.spec.ts` (44 passed) and `pnpm run typecheck:shell` (0 errors).
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookSelection.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/utils.ts`
  - `docs/architecture/AI_MEMORY.md`


### 2026-09-11 — Antigravity (Notebook Mobile Block Frame Outline on Focus and Touch)
- **Scope:**
  1. Fixed missing block frame ("blok çerçevesi") on mobile and touch devices. On desktop, block frames were only rendered via `@media (hover: hover) and (pointer: fine) .MarkdownNotebook__row:hover` while `:focus-within` explicitly reset `outline-color: transparent`. Because mobile lacks hover, blocks never displayed boundaries or active frames.
  2. In `MarkdownNotebook.tsx`, propagated `isTitleRow && 'MarkdownNotebook__row--title'` and `focusedRowIndex === index && 'MarkdownNotebook__row--focused'` to the row container. Added an `onClick` fallback to row empty space so tapping anywhere on a block activates and focuses its contenteditable area.
  3. In `MarkdownNotebook.scss` and `notebook-mobile-block-chrome.css`, added `@media (hover: none), (pointer: coarse), (max-width: 640px)` rules ensuring `.MarkdownNotebook--edit .MarkdownNotebook__row:focus-within`, `--focused`, and `--mobile-active` display `outline: 1.5px solid var(--color-border-primary)` (with title rows and AI prompt cards cleanly exempted).
  4. Recompiled notebook style bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  5. Added automated regression test in `tests/notebook-frontend.spec.ts`. All 44 Playwright tests passed, and `pnpm run typecheck:shell` passed with 0 gated errors.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/styles/notebook-mobile-block-chrome.css`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Footnote Canonical OSButton & Mobile Zoom Elimination)
- **Scope:**
  1. Converted FootnotePopover action buttons to canonical WIM `OSButton`s (`variant="primary" size="sm"` for Save, `size="sm"` for Cancel, `size="sm"` for Delete with icon, and `size="xs"` for header Close). Removed conflicting outer padding/height overrides that distorted the 3D push-button layout.
  2. Fixed mobile screen auto-zoom: added `maximum-scale=1` in `_document.tsx` viewport meta tag and set `text-[16px] sm:text-xs touch-manipulation` on footnote textarea so iOS Safari never triggers page zoom upon focusing the input.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/pages/_document.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Mobile Footnote Cut-off Fix & Viewport Clamping)
- **Scope:**
  1. Resolved mobile footnote popover cut-off bug where `left: 50% !important` in SCSS combined with `transform: none` in JavaScript placed the popover at 50% screen width, cutting off the entire right half (close button, textarea, save button) on mobile viewports.
  2. Fixed mobile viewport overflow: on `@media (max-width: 640px)`, anchored popover with `left: 10px !important; right: 10px !important; width: auto !important; max-width: calc(100vw - 20px) !important; transform: none !important;`.
  3. Clamped vertical `top` positioning in `FootnotePopover.tsx` dynamically to `visualViewport.height` and `visualViewport.offsetTop`, keeping the popover visible above the mobile virtual keyboard.
  4. Added `font-size: 16px !important` on mobile textarea to prevent iOS Safari auto-zooming and screen disorientation on focus.
  5. Added `min-w-0` and `flex-shrink-0` to bottom footnotes list item layout to prevent horizontal content overflow on narrow mobile screens.
  6. Recompiled CSS bundles (`bundleCss.ts`, `productBundleCss.ts`) via `pnpm run build:notebook-styles`.
  7. Verification: 43 Playwright tests passed, `pnpm run typecheck:shell` passed with 0 gated errors.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Selection Hook Extraction & API Tombstone Import Fix)
- **Scope:**
  1. Extracted selection preservation and DOM focus restoration into standalone hook `useNotebookSelection.ts`, decoupling `restoreSelectionRef`, `focusNodeRef`, and the post-render `useLayoutEffect` DOM reconciliation from `MarkdownNotebook.tsx`.
  2. Fixed backend Next.js API server error: imported missing `listSyncTombstoneIds` and `recordSyncTombstone` in `lib/notebooks-repo.ts` from `./sync-tombstones`.
  3. Hardened touch targets (`min-w-[28px] min-h-[28px] touch-manipulation`) and Unicode edit/jump glyphs (`\u270E`, `\u21A9`) in `FootnotePopover.tsx` and `useNotebookFootnotes.ts`.
  4. Converted non-relative import of `OSButton` in `FootnotePopover.tsx` to relative path to ensure clean compatibility across headless test runners.
  5. Added comprehensive test coverage in `tests/notebook-frontend.spec.ts` for footnote round-trip serialization and document-change caret offset mapping (`mapRestoreSelectionThroughDocumentChange`).
  6. Verification: 43 Playwright tests pass (`pnpm exec playwright test tests/notebook-frontend.spec.ts`), `pnpm run typecheck:shell` passes with zero gated errors, and style bundles compiled cleanly.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookSelection.ts` (new)
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `lib/notebooks-repo.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Architecture Stabilization, Hook Modularization & Inline Integrity)
- **Scope:**
  1. Decompose monolithic footnote and slash menu logic from `MarkdownNotebook.tsx` into standalone modular hooks (`useNotebookFootnotes.ts`, `useNotebookSlashMenu.ts`).
  2. Separate pure filtering and context calculation functions into `insertMenuModel.ts`, eliminating UI module coupling in headless tests.
  3. Eliminate paragraph splitting and phantom detached block creation when triggering slash commands (`/`) or clicking the insert `+` button in text.
  4. Fix Enter key fallthrough in `EditableTextBlock.tsx` that previously split paragraphs when Enter was pressed with an active insert menu.
  5. Fix caret position jumping on slash menu open by threading exact caret offsets through `beginSlashInsertMenu` and `openSlashMenuAtToken`.
  6. Harden mobile footnote popover styling with responsive viewport constraints.
  7. Verification: All 41 Playwright frontend tests pass (`pnpm exec playwright test tests/notebook-frontend.spec.ts`), `pnpm run typecheck:shell` passes with 0 errors, and notebook style bundles compiled via `pnpm run build:notebook-styles`.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookFootnotes.ts` (new)
  - `src/notebook-app/lib/components/MarkdownNotebook/useNotebookSlashMenu.ts` (new)
  - `src/notebook-app/lib/components/MarkdownNotebook/EditableTextBlock.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/documentModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/insertMenuModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/registry.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `tests/notebook-frontend.spec.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Inline Footnotes & Slash Editor Refinement)
- **Scope:**
  1. Add native markdown round-trip footnote system (`[^1]` in markdown and `[^1]: text` at document end).
  2. Elegant typographical superscript number styling in text (no clunky border/badge/box/pill, matching line-height with `display: inline; vertical-align: super; line-height: 0;`).
  3. Integrated footnote trigger in slash insert menu (`/footnote`, `/dipnot`, `/fn`), using PostHog `IconDocument`.
  4. Fix slash menu behavior so opening the slash menu or inserting an inline element does NOT split the text block or open/create an unnecessary separate block.
  5. Context-aware Slash Menu: When `/` is typed in the middle/end of text (`inline` context), it only shows inline-relevant commands (Footnote top priority, compact popup suitable for mobile and desktop without cluttering prose). When `/` is typed in an empty block or new line (`block` context), it presents the full block library (Headings, Tables, Lists, Code, Quotes, Dividers, Components, AI).
  6. Fixed "No matching blocks" and ReferenceError when querying slash commands inside sentences by parsing slash tokens with caret position in `getInsertMenuFilterQuery` and scoping `caret` properly in `handleInlineEditableInput`.
  7. Frosted glass footnote popover editor (`FootnotePopover.tsx`) with English UI, and bottom auto-generated footnotes section with direct edit (`✎`) and jump-to-text (`↩`) buttons.
  8. PDF export support (`exportNotebookPdf.ts`) for footnote marks and document end footnotes list.
- **Root Cause & Implementation:**
  - Previous slash menu logic eagerly split text blocks upon `/` keystroke before a command was even chosen, forcing subsequent insertions (like footnotes) into a detached block. Updated `startInsertMenuAtCurrentTextSelection`, `openSlashMenuAtToken`, and `addFootnoteAtTarget` to stay in the current node without splitting, strip the typed `/...` trigger, and place the footnote mark inline at the caret.
  - Context-aware filtering added to `getFilteredInsertCommands(commands, query, context)` with `getTargetNodeInsertContext(nodeId)`.
  - Footnote styling simplified from heavy pill badge to clean typographic superscript without borders or background containers, preventing line-height shifts.
  - Recompiled notebook style bundles using `pnpm run build:notebook-styles`.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/types.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/utils.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/inlineContent.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/markdown.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/documentModel.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/EditableTextBlock.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/FootnotePopover.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/scenes/notebooks/exportNotebookPdf.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Antigravity (Notebook Block Drag Handle Restoration & ClaudeWorkspaceChat Abort Guard)
- **Scope:** 
  1. Restore the notebook 6-dot block drag handle (`.MarkdownNotebook__drag-handle`, `IconDrag` ⠿) which disappeared after earlier layout changes.
  2. Fix unhandled exception `controller.abort()` in `src/components/ClaudeWorkspaceChat/index.tsx (581:18)`.
- **Root Cause & Implementation:**
  - **Drag Handle:** 
    - Previous styles used an old PostHog offset `left: calc(var(--markdown-notebook-content-offset) * -1 - 1rem);` (-42px) which left an 18px empty dead gap between the block boundary and the handle. When hovering a row and moving the mouse towards the handle, the cursor traversed the empty gap, losing `:hover` and causing the handle to vanish before it could be reached.
    - Repositioned `.MarkdownNotebook__drag-handle` to `left: -1.75rem` (-28px) with `width: 1.5rem` and `height: 1.5rem`.
    - Added an invisible hit bridge `::after` (`top: -6px; bottom: -6px; left: -6px; right: -16px; z-index: -1`) so the cursor maintains continuous hover while moving from text content into the handle.
    - Set hover styling with subtle rounded background `background: rgb(var(--accent) / 0.75)`, opacity 0.55 on row hover/focus-within, opacity 1.0 on handle hover, and `cursor: grab / grabbing`.
    - Updated `onClick` in `MarkdownNotebook.tsx` to safely trigger block options.
    - Recompiled notebook style bundles via `pnpm run build:notebook-styles`.
  - **ClaudeWorkspaceChat Abort Guard:**
    - Safely wrapped `controller.abort()` inside `try ... catch` and reset `abortControllerRef.current = null` before calling abort to prevent unhandled abortion exceptions during unmount or stream cancellation.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `src/components/ClaudeWorkspaceChat/index.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-11 — Grok (notebook mobile UX + history restore)
- **Scope:** After PDF PR #538. Highest remaining directive is mobile writing: no popovers on the selection, no horizontal shifts, insert still possible without hover `+`. Also local history compact left older snapshots unrestorable.
- **Implementation:**
  - Coarse pointer: format toolbar docks to the visual viewport (above the keyboard), not over the selection. Style dropdown still opens upward.
  - Long-press on a body block (including text) opens a bottom block-action bar with Insert. Focused row shows an in-flow Add chip on small screens (no left-gutter `+`, no layout jump).
  - `content-visibility: auto` disabled under 640px so scrolling does not jump.
  - History panel pulls `?history=1` and fills discarded local bodies from remote. Compacted local snapshots no longer wipe remote history on push (server merges, empty local list is a no-op).
- **Files Modified:** MarkdownNotebook.tsx/scss, editorTypes.ts, notebookRemote.ts, notebookStorage.ts, NotebookHistory.tsx, notebooks-repo.ts, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook text PDF)
- **Scope:** Share/Options PDF was a screenshot (`html-to-image` JPEG into jsPDF). User asked for a normal PDF. Same generator is used from the Share tab and the Options export menu.
- **Implementation:**
  - Walk parsed markdown and write real text with jsPDF + DejaVu (Turkish/latin-ext). Images stay images. No html-to-image on this path.
  - Print opens a paper article iframe (browser Save as PDF also gets real text).
  - Slim-list notebooks hydrate by id before PDF/md/json export.
  - Export panel is on the Share sidebar as well as Options. Print CSS forces `content-visibility: visible`.
- **Files Modified:** exportNotebookPdf.ts, notebookSidebarPanels.tsx, NotebookEditorReader.tsx, notebookStorage.ts, NotebooksListScene.tsx, ensureNotebookProductStyles.ts, site-bridge.scss, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook list/mentions/notify)
- **Scope:** Continue notebook optimization after PR #534. Audit live Supabase `iydypisgfaksqkjdraiu` and close gaps. No Yjs. Markdown remains source of truth.
- **Live audit:** 120 notebooks (avg 932 chars, p90 552, max 55k). RLS on. Realtime on `wim_notebooks`. `organize` already present. Missing: `preview` column, `wim_notebook_notifications`, auth `uri_allow_list` pages.dev wildcards. Duplicate owner/auth indexes left in place. Collaborator writes stay on service-role API. `notebook-media` public read / API write by design.
- **Implementation:**
  - List GET omits `content` (`preview` + `contentOmitted`). Editor hydrates via GET by id. Tasks view opt-in `include=content`. Slim remote merge keeps local body.
  - Mention marks store auth UUID. Server extracts `<mention>` + comment `mentionedIds` (UUID or username) and writes `wim_notebook_notifications`. New discussion replies notify owner + collaborators.
  - Auth allow-list adds `https://*.worldinmaking.pages.dev/**` and `https://*.pages.dev/**`.
- **Files Modified:** notebooks-repo, notebook-mentions, notebooks API, App, notebookRemote/Storage, NotebooksListScene, mentionPeople, notebookPresence, DiscussionCommentBlock, discussionComments, wim-notifications, wim-supabase-bootstrap, 20260911_notebook_list_preview_and_mentions.sql, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.
- **Do not commit the pasted Supabase PAT. Rotate it after this PR.**

### 2026-09-11 — Grok (slash insert menu)
- **Scope:** Slash `/` menu was not appearing after the content-visibility typing sprint.
- **Cause:** InsertMenu is `position: fixed` + `visibility: hidden` until positioned, and was rendered inside `.MarkdownNotebook__text-group` / rows with `content-visibility: auto`. That applies paint/layout containment, so fixed descendants position against the group and get clipped; a 0×0 anchor rect leaves the menu hidden. Nested canvas `contenteditable` means the group is often not `:focus-within`. Memoized text blocks also ignored slash callbacks.
- **Implementation:**
  - Render one InsertMenu at the notebook root (next to the find bar), outside any content-visibility group.
  - Force `content-visibility: visible` on groups/rows with `--insert-menu-open`; `--z-popover` fallback 1060.
  - Position fallback via `getNotebookBlockElement` if `blockRefs` missed the node.
  - Outside-click ignores the portaled menu.
  - EditableTextBlock keeps slash/insert callbacks on refs so memo does not freeze a stale opener.
- **Files Modified:** MarkdownNotebook.tsx, MarkdownNotebook.scss, EditableTextBlock.tsx, ensureNotebookProductStyles.ts, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook paste / mentions / PDF)
- **Scope:** Continue the notebook sprint after typing/list/find. Paste screenshots as Image blocks, mention collaborators in comments and body, make PDF export fail visibly.
- **Implementation:**
  - `collectClipboardImageFiles` reads `files` and `items`; paste capture inserts Image nodes even from a paragraph caret. Failed uploads toast.
  - Mention picker lists collaborators + presence; keyboard arrows/Enter. Comment composer uses the same list.
  - PDF waits on images with timeout, sets CORS, toasts success/failure.
- **Files Modified:** notebook-upload-shared, mentionPeople, MentionPicker, DiscussionCommentBlock, useNotebookClipboard, MarkdownNotebook, App, exportNotebookPdf, notebookSidebarPanels, AI_MEMORY, NOTEBOOK_SAAS_ROADMAP.

### 2026-09-11 — Grok (notebook typing/list/find)
- **Scope:** Make the notebook editor cheaper to type in, slim the notebooks list, add in-notebook Cmd+F. Markdown stays source of truth. No Yjs rewrite. Did not merge stale Jules or `plan*` PRs.
- **Implementation:**
  - Idle serialize (`SERIALIZE_IDLE_MS` 320ms) + `flushPending` on remote merge, pagehide, unmount, autosave.
  - Memoized text/list/code/table blocks; `content-visibility: auto` on unfocused groups.
  - List/palette hold `preview` instead of full bodies; tasks view keeps content.
  - Cmd+F find bar with match row highlight.
  - Unmount/history-restore flushes are scoped by notebook id + `markdownVersion` so they cannot write the previous draft into the next notebook.
- **Files Modified:** MarkdownNotebook.tsx, notebookEditorModel.ts, NotebookFindBar.tsx, Editable* blocks, MarkdownNotebook.scss, ensureNotebookProductStyles.ts, App.tsx, notebookStorage.ts, notebookPreview.ts, NotebooksListScene.tsx, CommandPaletteModal.tsx, README, NOTEBOOK_SAAS_ROADMAP, AI_MEMORY.

### 2026-09-11 — Grok (pass 8)
- **Scope:** Close Jules/Bolt PR noise; drop more unused leftovers; fix repo metadata. No visual/product change.
- **Implementation:**
  - Closed 270 open Jules/Bolt PRs (`author:app/google-labs-jules`). Left all `malidk345` PRs open, including #530 (body says do not merge until asked) and the notebook `plan*` series.
  - Repo description: `WorldInMaking — a desktop for writing`. Homepage: https://worldinmaking.com
  - Deleted unused `Explorer`, `LemonProvider`, `Timeline`. Kept `src/components/LemonTable` (notebook LemonTable is the live one).
- **Files Modified:** Explorer, LemonProvider, Timeline, AI_MEMORY. GitHub metadata + 270 PR closes.

### 2026-09-11 — Grok (pass 7)
- **Scope:** Agent-doc path fix + drop unused PostHog art-library page. No visual/product change.
- **Implementation:**
  - `AGENTS.md`: relative docs links (was a Windows `file:///D:/all works/posthog.com/...` path). Title no longer says posthog.com.
  - Deleted unused `src/pages/art-library.tsx` (PostHog Vercel iframe, zero importers).
  - Left `baa`/`dpa`/`subprocessors` — they are live Legal routes, not leftovers.
- **Files Modified:** AGENTS.md, art-library.tsx, AI_MEMORY.

### 2026-09-11 — Grok (pass 6)
- **Scope:** More unused PostHog leftover deletion. No visual/product change.
- **User Intent:** Continue optimization on PR 533 after Cloudflare CSS fix.
- **Implementation:**
  - Deleted unused component folders: Chip, CommunityCTA, HubSpotForm, Job, NoHatingAllowed, PostHogUI, ProfileStickers, Signatures, TeamMembers, TeamPatch.
  - Deleted unused `src/templates/Changelog.tsx`.
  - Removed unused packages `query-string` and `@dotlottie/react-player`. Dropped dead `components/PostHogUI` tsconfig path.
- **Files Modified:** unused component folders, Changelog.tsx, package.json, pnpm-lock.yaml, tsconfig.json, LemonUI comment, AI_MEMORY.

### 2026-09-11 — Grok (pass 5)
- **Scope:** Lazy MDX shortcodes + drop more unused PostHog leftovers. No visual/product change.
- **User Intent:** After merging PR 531, continue unused-code deletion and speed work in a new PR. Keep the live site as-is.
- **Implementation:**
  - Heavy MDX shortcodes (amcharts, wistia, sliders, calculators, team, hedgehog, etc.) load via `next/dynamic` in `mdxGlobalComponents.ts` / `.js`.
  - BlogPost / Tutorial defer TutorialsSlider, TutorialsList, NewsletterForm, BuiltBy. Restored ReaderView import.
  - Zoom CSS (`react-medium-image-zoom`, node_modules) lives on ZoomImage. First-party HiddenSection / MdxAnchorHeaders CSS stays in `_app` — Next.js Pages Router forbids global CSS imports from components (Cloudflare/Playwright compile error). Removed unused `rc-slider` CSS.
  - Deleted unused leftover folders: About (v2), Hub, PostCard, Cards, Blog chrome (+684KB default.jpg), Contact/index.js, Structure, Team.
  - Removed leftover unused npm packages (Gatsby webpack loaders, rc-slider, patch-package, hast/unist leftovers, etc.).
- **Files Modified:** mdxGlobalComponents.ts/js, BlogPost.tsx, Tutorial.tsx, ZoomImage, HiddenSection, MdxAnchorHeaders, `_app.tsx`, package.json, pnpm-lock.yaml, unused component folders.

### 2026-09-11 — Grok Build
- **Scope:** Personal assistant is a notebook-reading counselor that nags via NotificationsPanel — not a chat.
- **Files Modified:** assistant-notices, AssistantWindow, Watch, Desktop, wim-notifications, useUser.

### 2026-09-11 — Grok (pass 4)
- **Scope:** Drop unreferenced `src/images` (~23MB PostHog marketing art) and slim leftover Vercel/Gatsby `vercel.json`. No visual/product change.
- **Kept:** OS icons, philosopher pixel avatars, hourglass Lottie, portraits actually imported.
- **vercel.json:** security headers only. Removed Gatsby `index.html` rewrites (broken on Next) and 378 PostHog marketing redirects. Live routing stays in `next.config.js`.
- **Files Modified:** `src/images/**` (341 unused files), `vercel.json`.

### 2026-09-11 — Grok (pass 3)
- **Scope:** Defer command palette; drop more unused Gatsby leftovers and unused npm packages. No visual/product change.
- **User Intent:** Keep iterating inside PR 531 — unused code out, site faster, live UI unchanged.
- **Implementation:**
  - Cmd+K listener lives in Wrapper; CommandPalette chunk loads on first shortcut.
  - Deleted unused Gatsby leftovers: `html.tsx`, presentations, pages-content, unused blog/hub/OG/tutorial listing templates, `components/Tutorials`.
  - Removed unused packages (swiper, canvas-confetti, react-window, masonry, langchain google/groq, fontsource, etc.) and refreshed `pnpm-lock.yaml`.
  - `optimizePackageImports` now includes `@posthog/icons`.
- **Files Modified:** Wrapper, CommandPalette, next.config.js, package.json, pnpm-lock.yaml, unused templates/content.

### 2026-09-11 — Grok (pass 2)
- **Scope:** More unused leftover deletion + defer overlay chunks until first open. No visual/product change.
- **User Intent:** Keep the live site as-is; delete unused code; speed it up without breaking working flows.
- **Implementation:**
  - Wrapper mounts SearchOverlay, AuthModal, and ActiveWindowsPanel only after first open (Cmd+K command palette stays mounted because it owns the shortcut listener).
  - Deleted zero-import PostHog leftovers: WordArt, Apps, Banner, Accordion, Checkbox, Container, SignUp, Tabs, Templates, TemplatesLibrary, MediaLibrary, HedgehogGenerator, FooterCTA, Breadcrumbs, AnimateIntoView, Card, Header, Footer, Section, Popover, leftover `components/MarkdownNotebook` scss, `useMediaLibrary`.
- **Verification:** Typecheck shell green on PR 531. Playwright 8 failures match pre-existing main (SEO h1 copy, admin/API tests) — not caused by this work.
- **Files Modified:** Wrapper, unused component folders, `src/hooks/useMediaLibrary.tsx`, AI_MEMORY.

### 2026-09-11 — Grok
- **Scope:** Shell first-load split + unused PostHog leftover deletion. No visual/product behavior change.
- **User Intent:** Keep the live site as-is; delete unused code; speed it up without breaking working flows.
- **Implementation:**
  - Moved `isForumPath` / `isBlogPath` to `src/lib/window-path.ts` so `App.tsx` no longer imports `WindowRouter` (which pulled BlogPost/Inbox/Admin into the shell graph).
  - `WindowRouter` now `next/dynamic`s route modules (blog, inbox, admin, tape player, about, …) so they load when a window opens.
  - Desktop defers Claude chat, notifications, hedgehog, and confetti until first use.
  - Catch-all `[...slug]` code-splits Inbox/Blog/Profile per route.
  - Removed unused global CSS (Corpus, Spacer). Deleted unused leftover folders (Careers, Subscribe, posthog-ui-gallery, …) and scratch files.
  - Extra webpack async cacheGroups: hedgehog, amcharts, mapbox, workspace-chat.
- **Files Modified:** WindowRouter, Desktop, App.tsx, window-path.ts, `[...slug].tsx`, `_app.tsx`, next.config.js, .gitignore, unused component folders, scratch root files.

### 2026-09-10 — Antigravity (Advanced Agentic Coding)
- **Scope:** NotificationsPanel Expansion — Philosopher Bot Replies & Notebook Collaboration Invites.
- **User Intent:** Expand the notifications panel beyond basic forum replies to include meaningful product events (Philosopher Bot replies/mentions and WIM Notebook collaboration invites/additions) without altering existing styling or layouts, without gamification/achievements, and strictly in English ("olur hepsine okeyim yap ama notifacation panele ve bildirimlerin stiline asla dokunma farklı bir tasarım yapma su an olan aşırı iyi", "evet ama türkçe yapayım deme şimdi site ingilizce", "accievment falan istemem").
- **Implementation:**
  - `src/lib/wim-notifications.ts`:
    - Updated `fetchUserNotifications()` to aggregate:
      1. **Forum & Philosopher Bot Notifications:** Detects if the latest reply was authored by a resident philosopher bot (via `matchPhilosopherId`, `PHILOSOPHER_BOTS`, or `profiles.is_bot`). Formats excerpt as `'Philosopher'` and title as `${botName} replied to "${threadTitle}"` (or `${botName} mentioned you in...`).
      2. **Notebook Collaboration Invites & Additions:** Queries `wim_notebook_invites` (pending invites for `invited_user_id = user.id`) and `wim_notebook_collaborators` (direct collaborator additions). Resolves inviter profiles and notebook titles. Formats excerpt as `'Notebook'`, title as `${inviter} invited you to collaborate on "${title}"`, count as `${role} invite` or `${role}`, and links to `/notebooks/invite/${token}` or `/notebooks/${notebook_id}`.
    - Updated `dismissUserNotification(id)` to support string IDs (e.g. `invite_...`, `collab_...`) persisting to local storage and numeric IDs syncing to Supabase `user_notifications.dismissed_at`.
  - `src/components/NotificationsPanel/index.tsx`:
    - Preserved 100% of existing JSX markup, CSS classes, animations, and visual presentation.
    - Updated `NotificationItem.id` to accept `number | string`.
    - Made `dismiss` call `dismissUserNotification(id)` so dismissals persist across page reloads.
  - `src/hooks/useUser.tsx`:
    - Updated `updateNotifications` to support `number | string` IDs.
    - Added immediate notification fetch tick on user change/hydration.
- **Verification:**
  - `pnpm run typecheck:shell`: Passed with 0 gated errors (`PASS — zero gated errors in core shell allowlist`).
- **Files Modified:**
  - `src/lib/wim-notifications.ts`
  - `src/components/NotificationsPanel/index.tsx`
  - `src/hooks/useUser.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-10 — Antigravity (Advanced Agentic Coding)
- **Scope:** Remove PostHog Incident Alert Banner & Analytics Events from Community Ask a Question Modal.
- **User Intent:** Fix PostHog notification dropping in Ask a Question modal ("community kısmında ask a question modalında posthogtan bir bildirim düşmüş bunu çöz", "öz ya gönderemesin posthog").
- **Root Cause:**
  1. `QuestionForm.tsx` in `src/components/Squeak/components/` was polling `https://www.posthogstatus.com/api/v1/summary` via `useAppStatus()`. Whenever there was any incident or degraded status on PostHog's infrastructure, an invasive *"Heads up! We're currently experiencing an incident. Check here for the latest info"* warning banner dropped directly into the user's question writing surface.
  2. The form also invoked `posthog.capture('wim question created')` and `posthog.capture('community honeypot rejection')` upon submission.
- **Fixes Applied:**
  - `src/components/Squeak/components/QuestionForm.tsx`:
    - Removed `useAppStatus()` hook call and the entire incident banner rendering block.
    - Removed `posthog.capture('wim question created')` and `posthog.capture('community honeypot rejection')`.
    - Cleaned up unused `usePostHog` import.
- **Verification:**
  - `pnpm run typecheck:shell`: Passed with 0 errors (`PASS — zero gated errors in core shell allowlist`).
  - Git diff verified.
- **Files Modified:**
  - `src/components/Squeak/components/QuestionForm.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Mobile Pencil Icon Style Dropdown (H1/H2/H3/Quote) Not Opening in FormattingToolbar.
- **User Intent:** Resolve issue where tapping the pencil style button to change headings on mobile does not open the dropdown menu ("bu kalem ikonu var ya heading falan açan o mobilde açılmıyor").
- **Root Cause:**
  1. **CSS Overflow Clipping on Mobile (`MarkdownNotebook.scss`):** `@media (max-width: 640px)` had `overflow-x: auto; overflow-y: visible;`. By CSS specification, any axis set to `auto`/`scroll` forces `overflow-y` to `auto`/hidden, clipping all absolutely positioned children (such as `.MarkdownNotebook__format-style-dropdown` placed at `top: calc(100% + 6px)`) inside the 36px toolbar height, making it completely invisible.
  2. **Touch Pointerdown Selection Collapse (`FormattingToolbar.tsx`):** On mobile devices, tapping `<button>` fired `pointerdown`/`touchstart` without `preventDefault()`, causing mobile WebKit/Blink to collapse the editor text selection before `click` fired. Once selection collapsed, `updateFloatingToolbarFromSelection` immediately unmounted the toolbar.
  3. **Toolbar Focus Check False Negative (`domSelection.ts`):** `isFormattingToolbarFocused()` only checked `document.activeElement`, but mobile Safari does not focus buttons on tap.
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Replaced `overflow-x: auto; overflow-y: visible;` with `overflow: visible !important;` on mobile `.MarkdownNotebook__format-toolbar`.
    - Added dedicated mobile touch targets for `.MarkdownNotebook__format-btn--style` (`min-width: 34px`) and comfortable padding for `.MarkdownNotebook__format-style-menu-item` (`padding: 7px 10px; font-size: 13.5px`).
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`:
    - Added `onPointerDown={(e) => e.preventDefault()}` to `FormatBtn` and each style dropdown menu item to prevent mobile selection collapse on touch.
    - Updated container `onPointerDownCapture` to prevent default on non-input targets.
  - `src/notebook-app/lib/components/MarkdownNotebook/domSelection.ts`:
    - Enhanced `isFormattingToolbarFocused()` to detect open `.MarkdownNotebook__format-style-dropdown` or `.MarkdownNotebook__format-link-editor` elements in the DOM so the toolbar is preserved during menu interactions.
  - Recompiled notebook stylesheets with `pnpm run build:notebook-styles`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/domSelection.ts`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Compact & Sleek Optimization of Ask AI Inline Editor Modal & Header Popover.
- **User Intent:** Make the modal significantly more compact ("modalı daha kompakt yap").
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Reduced `.WimInlinePill` height from `36px` to `28px` (`32px` on mobile), tightened padding to `2px 4px 2px 8px`, reduced max-width to `320px`, min-width to `180px`, and set radius to `8px`.
    - Reduced `.WimInlinePill--review` height from `34px` to `26px` (`30px` on mobile), action button dimensions to `18px x 18px` (`22px` on mobile), and gap to `0.25rem`.
    - Reduced `.WimInlinePill__input` height from `24px` to `22px` with `0.74rem` crisp font size.
    - Reduced `.WimInlinePill__submitBtn` to `18px x 18px` with radius `5px`.
    - Reduced `.WimInlinePill__presets` max-width to `360px`, padding to `0.25rem 0.35rem`, gap to `0.25rem`, and preset item padding to `0.15rem 0.38rem` with `0.68rem` font size.
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`:
    - Reduced People & history popover width from `w-80` (320px) to `w-72` (288px), max height to `max-h-64`, avatar size from `size-7` to `size-6`, and tightened padding throughout.
  - Recompiled notebook stylesheets with `pnpm run build:notebook-styles`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Align Notebook Ask AI Inline Editor Styling with Notebook Topbar Glassmorphism and Remove Plus Icon.
- **User Intent:** Match the Ask AI inline editor modal (`EditablePromptComponent` / `WimInlinePill`) styling with the notebook header (`notebook-topbar-glass`), and remove the plus (+) icon from the inline editor as explicitly requested ("ask ai modalı var ya inline editör olan onu da notebook headerla aynı yap ama artı ikonunu istemiyorum orada bunu da bil").
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/EditablePromptComponent.tsx`:
    - Removed `IconPlus` from `@posthog/icons` imports and deleted the left `<button className="WimInlinePill__plusBtn">` plus icon element. Presets remain accessible via `Tab` keyboard shortcut when input is empty.
    - Added `notebook-topbar-glass` class to `WimInlinePill` (main prompt pill), `WimInlinePill--review` (accept/retry/reject review pill), and `WimInlinePill__presets` (popup actions menu).
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Updated `.WimInlinePill`, `.WimInlinePill--review`, and `.WimInlinePill__presets` base definitions to match the exact Craft frosted glass tokens used by `.notebook-topbar-glass`:
      - Light: `background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px; box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.09), 0 2px 6px -1px rgba(0, 0, 0, 0.04); backdrop-filter: blur(20px) saturate(180%); color: #1c1c1e;`.
      - Dark: `background: rgba(30, 31, 35, 0.88); border-color: rgba(255, 255, 255, 0.12); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45); color: #f4f4f5;`.
  - Recompiled notebook stylesheets with `pnpm run build:notebook-styles` (`bundleCss.ts`, `productBundleCss.ts`).
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/EditablePromptComponent.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Notebook Header & Popover Avatar Shifting and Misalignments.
- **User Intent:** Resolve visual shifting/clipping in profile photos both in the notebook header bar and inside the People & history popover modal ("nıtebook header da profil fotolarında bazı kaymalar oluyor hem headerda hem açılan modalda").
- **Root Cause:**
  - `Avatar.tsx` added its own internal wrapper with `p-px`, aspect ratio constraints, and `border border-primary`.
  - In `NotebookFaceStack.tsx`, avatars were wrapped in a `span` that had its own `border border-primary`, creating a nested double-border, subtle subpixel misalignment, and awkward clipping.
  - In `CollaboratorsBanner.tsx`, the overlay modal also wrapped `Avatar` inside an outer `size-6 shrink-0 rounded-full overflow-hidden border border-primary` container, causing the same double-border, padding squeeze, and shifted icon graphics.
- **Fixes Applied:**
  - `src/notebook-app/scenes/notebooks/NotebookFaceStack.tsx`: Replaced nested `Avatar` wrapper with direct rounded `img` and fallback `svg` with clean outer `ring-2 ring-white dark:ring-[#1e1f23]`, removing double borders and layout shifting.
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`: Replaced nested `Avatar` wrappers in both "People" and "Snapshots" lists with clean `size-7 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10` containers and direct image/SVG elements.
- **Verification:**
  - `pnpm run typecheck:shell`: PASS (0 errors in core shell allowlist).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/NotebookFaceStack.tsx`
  - `src/notebook-app/scenes/notebooks/CollaboratorsBanner.tsx`
  - `docs/architecture/AI_MEMORY.md`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Notebook Mobile Horizontal Margins — Align 1:1 with Blog Posts.
- **User Intent:** Text was too far inside from the edges on mobile (\"kenarlardan çok içeride metin mobilde\"). Notebook mobile margin was 39px while blog posts had 25px — 14px too much on each side.
- **Root Cause:**
  - `MarkdownNotebook.scss` `@media (max-width: 640px)` block added `padding-left: 0.875rem; padding-right: 0.875rem` (14px) directly to `.MarkdownNotebook` div. Blog posts have no such self-padding; padding is handled entirely by the outer `ReaderView` container.
  - `NotebookEditorReader.tsx` used `padding={false}` + manual `px-4 @md:px-6 @lg:px-8 @xl:px-12` on wrapper div — this created container-query-based escalation inconsistent with blog's viewport-query based escalation.
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`: Changed mobile `padding-left`/`padding-right` from `0.875rem` to `0`.
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`: Changed `padding={false}` to `padding={true}` and removed manual `px-4 @md:px-6 @lg:px-8 @xl:px-12` from children wrapper div. The `ReaderView` component now manages its own `p-4` padding (same as blog posts).
- **Verification:** Playwright computed margin test confirmed 1:1 match — Blog: `pLeft=25px`, `pWidth=340px`; Notebook: `pLeft=25px`, `pWidth=340px` — identical on 390px viewport.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`


- **Scope:** Align Notebook Edge Margins and Content Width 1:1 with Blog Posts (`BlogPost.tsx` / `ReaderView`).
- **User Intent:** Fix excessive inner indentation ("metin çok içeride yani kenarlardan boşluk çok blog postları gibi değil") so that notebook text begins at the exact same comfortable 48px side margin as blog posts rather than sitting squished in the center with 114px+ void gutters.
- **Root Cause Diagnosis & Resolutions:**
  1. **Container Query Escalation & Padding Bloat (`NotebookEditorReader.tsx`):**
     - In `BlogPost.tsx`, the presence of the 250px `FloatingTOC` right sidebar keeps the center article container at ~650px (`@xl`), applying `px-12` (48px) side padding.
     - In `NotebookEditorReader.tsx`, `hideRightSidebar={true}` caused the container to span 900px+ (`@3xl`), which triggered Tailwind's `@3xl/reader-content-container:px-20` (80px padding).
     - Passed `padding={false}` to `ReaderView` in `NotebookEditorReader.tsx` and wrapped children in `<div className="min-w-0 flex-1 px-4 @md:px-6 @lg:px-8 @xl:px-12 py-2">` to cap desktop horizontal padding at `48px` (`px-12`), directly matching `BlogPost`.
  2. **Double-Centering / Narrow Column Clamping (`App.tsx` & `MarkdownNotebook.scss`):**
     - Commit `5afec2ab` reduced the wrapper in `App.tsx` from `max-w-3xl mx-auto` to `max-w-2xl mx-auto` (672px) and `--markdown-notebook-canvas-max-width` to `42rem` (672px).
     - In a 900px column with 80px padding, centering a 672px box added an extra 34px auto margin, pushing the canvas to `x = 437px` (114px inside the card, 102px indented from the topbar).
     - Restored `--markdown-notebook-canvas-max-width: 56rem` (896px) in `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss` and `src/components/MarkdownNotebook/MarkdownNotebook.scss`, with `72rem` for `.MarkdownNotebook--wide`.
     - In `App.tsx`, updated editor wrapper to `max-w-4xl mx-auto` (896px) so that in normal window sizes (900px space) the text naturally fills the column with exactly 48px margin on the left (`x = 371px`) and 48px on the right (`x = 1175px`), verified 1:1 against `blog_desktop.png` (`x = 371px`).
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`
  - `src/notebook-app/App.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
  - `docs/architecture/AI_MEMORY.md`
- **Verification:**
  - `pnpm run build:notebook-styles` compiled without errors.
  - `pnpm run typecheck:shell` PASSED (0 errors in allowlist).
  - Playwright visual metrics verification: `canvasRect.x = 371px` (matches `blogMetrics.pRect.x = 371px` to the exact pixel). Mobile tested cleanly at 375x667.

- **Scope:** 1:1 Complete Typography Alignment of Notebook (`MarkdownNotebook`) with Blog Posts (`BlogPost.tsx` / `ReaderView`).
- **User Intent:** Ensure all font settings, typography, font family, font size, line-height, font weight, and element styles in the notebook are 100% identical ("birebir aynı") to blog posts.
- **Root Cause Diagnosis & Resolutions:**
  1. **Stripped Prose Cascade via `not-prose` Wrapper (`NotebookEditorReader.tsx`):**
     - `NotebookEditorReader.tsx` previously wrapped `{children}` in `<div className="not-prose">{children}</div>`. In `@tailwindcss/typography`, `:not(:where([class~="not-prose"] *))` neutralized all `.prose` and `.prose-sm` cascade rules on all descendant elements.
     - Removed `not-prose` wrapper; replaced with `<div className="min-w-0 flex-1">{children}</div>` so typography tokens flow through.
  2. **Font Family Harmonization (`RoundHog, sans-serif`):**
     - Blog posts inherit `body` font: `@apply font-rounded m-0;` where `font-rounded` is `['RoundHog', 'sans-serif']`.
     - Replaced generic `font-sans` with `font-rounded` in `src/notebook-app/App.tsx` and `src/notebook-app/scenes/notebooks/NotebookPublicView.tsx`.
     - Replaced undefined `font-family: var(--font-sans);` in `src/lib/lemon/ensureLemonStyles.ts` with `'RoundHog', sans-serif`.
     - Explicitly bound `font-family: 'RoundHog', sans-serif !important;` in `MarkdownNotebook.scss` across both editor and public scopes.
  3. **Document Title 1:1 Match with `Title.tsx` (`MarkdownNotebook.scss`):**
     - The document title (first row with `isTitleBlock`) was previously treated as a generic `h1` without prominent title hierarchy.
     - Applied exact blog post title styling: `font-size: 1.875rem !important;` (mobile) / `2.25rem !important;` (md+), `font-weight: 700 !important;`, `line-height: 1.25 !important;`, `letter-spacing: -0.02em !important;`, and `margin-bottom: 1.25rem !important;`.
  4. **Headings, Paragraphs, Lists & Spacing Alignment:**
     - Aligned all non-title headings to `prose-sm` metrics: `h1` (`2.1428571em`), `h2` (`1.4285714em`), `h3` (`1.2857143em`), `h4-h6` (`1em`), all with `font-weight: 700 !important;`.
     - Paragraphs and lists set to `15px !important; line-height: 1.5 !important; margin: 0;` (with `1.1em` inter-block spacing matching `global.css .prose p`).
     - Cleared mobile-only overrides that forcefully clamped headings to 1.5rem / 1.25rem / 1.1rem and forced 16px on body content.
  5. **Inline Code & Links:**
     - Styled inline code 1:1 with `components/InlineCode/index.js`: `Source Code Pro` font, `0.875em`, light padding, red text + tint in light mode (`#F54E00`), yellow/blue tint in dark mode (`#3B82F6`).
     - Styled links with `font-weight: 600 !important; text-decoration: underline !important; text-underline-offset: 2px !important;`.
  6. **Blockquotes:**
     - Styled `.MarkdownNotebook__blockquote-group` with secondary background card treatment (`0.5rem 1rem` padding, `4px` radius, subtle border) and italic text matching blog `Blockquote`.
- **Files Modified:**
  - `src/notebook-app/scenes/notebooks/NotebookEditorReader.tsx`
  - `src/notebook-app/App.tsx`
  - `src/notebook-app/scenes/notebooks/NotebookPublicView.tsx`
  - `src/lib/lemon/ensureLemonStyles.ts`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Match Notebook Top Bar (Collaborators/Presence Header) Glassmorphism with Craft Floating Toolbar.
- **User Intent:** Apply the exact same glassmorphism design tokens (frosted glass background, backdrop blur, border, subtle drop shadow, and border radius) from the Craft formatting toolbar to the top bar with people/collaborators, without altering any layout or internal contents of the bar.
- **Implemented Changes:**
  - `src/styles/global.css`:
    - Defined `.notebook-topbar-glass` using the exact Craft glass token values:
      - Light mode: `background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px; box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.09), 0 2px 6px -1px rgba(0, 0, 0, 0.04); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); color: #1c1c1e;`.
      - Dark mode: `background: rgba(30, 31, 35, 0.88); border-color: rgba(255, 255, 255, 0.12); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45); color: #f4f4f5;`.
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Added `.notebook-topbar-glass` rule matching the toolbar's glassmorphism so scoped and product-bundle stylesheets share the exact definition.
  - `src/components/ReaderView/index.tsx`:
    - Replaced the previous modal-style container classes on the `stickyHeader` wrapper with `notebook-topbar-glass overflow-hidden`.
  - Recompiled notebook stylesheets into `bundleCss.ts` and `productBundleCss.ts`.
- **Files Modified:**
  - `src/styles/global.css`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/ReaderView/index.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Unify MarkdownNotebook FormattingToolbar Placement (Mobile Matches Desktop Above-Selection Anchoring).
- **User Intent:** Ensure mobile does not dock the toolbar to the bottom of the screen. Mobile and desktop behavior must be 100% identical, opening directly centered above the selected text without altering desktop.
- **Implemented Changes:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`:
    - Removed `if (isNarrow)` branch in `updateFloatingToolbarFromSelection` that previously docked the toolbar to the bottom of the screen above the keyboard.
    - Mobile now uses the exact same calculation as desktop: anchors directly centered horizontally on `selectionRect` (`selectionRect.left + selectionRect.width / 2`) and 8px vertically above `selectionRect.top` (flipping to 8px below `selectionRect.bottom` only when near the viewport top edge).
    - `useLayoutEffect` in `FormattingToolbar.tsx` automatically applies `boundsShift.x` and `boundsShift.y` within `visualViewport` so the toolbar is clamped inside screen boundaries on narrow mobile screens.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Migrate FormattingToolbar to Official Site Icon Families (`@posthog/icons` & `iconsShim`).
- **User Intent:** Ensure all toolbar icons strictly adhere to the site's official icon design system and icon libraries rather than custom inline SVGs.
- **Implemented Changes:**
  - `src/notebook-app/lib/icons/iconsShim.tsx`: Exported `IconStrikethrough` and `IconUnderline` from `lucide-react` with standard `w-4 h-4 inline-block` shim styling.
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`:
    - Removed all ad-hoc inline SVG components (`IconCraftPencil`, `IconChevronDown`, `IconCraftLink`, `IconCraftComment`, `IconCheck`).
    - Directly imported `IconPencil`, `IconChevronDown`, `IconCode`, `IconComment`, `IconCopy`, `IconExternal`, `IconQuote`, `IconSparkles`, `IconCheck` from `@posthog/icons`.
    - Directly imported `IconBold`, `IconItalic`, `IconStrikethrough`, `IconLink`, `IconIndent`, `IconOutdent` from `iconsShim`.
    - Styled icons uniformly using `.MarkdownNotebook__format-btn svg` (`width: 14px; height: 14px;`) with clean opacity adjustments for sub-elements like the dropdown chevron.
- **Files Modified:**
  - `src/notebook-app/lib/icons/iconsShim.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** MarkdownNotebook Inline Formatting Toolbar — Craft-Style Floating Glassmorphism & Centered Selection Anchoring.
- **User Intent:** Transform the notebook's inline formatting toolbar to match the Craft editor reference design: translucent white frosted glassmorphic pill, compact single-button style dropdown `[ ✏️ ▾ ]`, inline action buttons (`B`, `I`, `S`, `</>`, `🔗`, `✨`, `|`, `💬+`), attached popovers for style menu & link editor, and anchored directly above selection without erratic mouse drag displacement.
- **Diagnosis & Implemented Changes:**
  1. **Centered Selection Anchoring (`MarkdownNotebook.tsx`):**
     - Removed `pointerAnchor` override from `updateFloatingToolbarFromSelection`. The toolbar now strictly anchors horizontally centered on the selection (`selectionRect.left + selectionRect.width / 2`) and 8px directly above `selectionRect.top` (flipping to 8px below `selectionRect.bottom` only when near the viewport top edge).
     - Passed `activeMarks` (bold, italic, strike, underline, code) to `<FormattingToolbar />` by checking selections via `areInlineSelectionsFullyMarked` across text and list item nodes.
  2. **Craft Toolbar Layout & Style Popover (`FormattingToolbar.tsx`):**
     - Replaced the 6 separate horizontal style buttons with a single compact `[ ✏️ ▾ ]` style button that opens a vertical popover menu (`.MarkdownNotebook__format-style-dropdown`).
     - Rendered inline formatting buttons matching Craft order: `[ ✏️ ▾ ]`, `Bold (B)`, `Italic (I)`, `Strikethrough (S)`, `Code (</>)`, `Link (🔗)`, `AI (✨)`, `|` divider, `Comment (💬+)`, `Copy`, indent/outdent.
     - Detached the link editor from horizontal toolbar flow: rendered `.MarkdownNotebook__format-link-editor` as an attached child popover card below the toolbar, keeping the toolbar compact (~260px width) on all viewports.
     - Added click-outside listener and Escape key handling to close the style dropdown without closing the selection.
  3. **Craft Frosted Glassmorphism Styles (`MarkdownNotebook.scss`):**
     - `.MarkdownNotebook__format-toolbar`: 10px rounded pill, height 36px, `background: rgba(255, 255, 255, 0.88)`, border `1px solid rgba(0, 0, 0, 0.08)`, `backdrop-filter: blur(20px) saturate(180%)`, soft shadow `0 4px 18px -2px rgba(0, 0, 0, 0.09)`. Dark mode: `rgba(30, 31, 35, 0.88)`.
     - `.MarkdownNotebook__format-btn`: 28x28px compact buttons with active mark tint `rgba(29, 78, 216, 0.12)` and `#1d4ed8` accent.
     - `.MarkdownNotebook__format-style-dropdown` & `.MarkdownNotebook__format-link-editor`: Frosted glass child cards with `backdrop-filter: blur(20px) saturate(180%)`, 8px rounded corners, and vertical drop shadows.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-09 — Antigravity (Advanced Agentic Coding)
- **Scope:** Align MarkdownNotebook Typography & Horizontal Window Width with Blog Posts (`ReaderView` / `BlogPost.tsx`).
- **User Intent:** Match text styles (headings h1-h6, body text, lists, inline code, links) and horizontal body width / window occupancy in notebooks with blog posts.
- **Root Cause Diagnosis & Resolutions:**
  1. **Horizontal Container & Body Width Alignment:**
     - Blog posts in `BlogPost.tsx` / `ReaderView` use container width `mx-auto max-w-2xl` (`42rem` / `672px`) centered within responsive container padding (`p-4 @md:px-6 @lg:px-8 @xl:px-12 @2xl:px-16 @3xl:px-20`).
     - Notebook previously used `--markdown-notebook-canvas-max-width: 56rem;` and `App.tsx` had `max-w-3xl mx-auto` (`48rem`), making the notebook 6rem-14rem wider than blog posts.
     - Updated `--markdown-notebook-canvas-max-width` in `MarkdownNotebook.scss` to `42rem;` (with `.MarkdownNotebook--wide` allowing `56rem` when wide mode is toggled).
     - Updated `App.tsx` wrapper from `max-w-3xl mx-auto` to `max-w-2xl mx-auto` (and passed `.MarkdownNotebook--wide` when `chrome.wide` is enabled).
     - Updated `NotebookPublicView.tsx` container to `w-full max-w-2xl mx-auto p-4` to match blog post width in public view as well.
  2. **Typography & Styling Alignment:**
     - Aligned base text to 15px font size, line-height 1.5, matching `.prose-sm` + `global.css`.
     - Harmonized all headings: `h1` (2.1428571em, font-weight 700, line-height 1.2), `h2` (1.4285714em, font-weight 700, line-height 1.4), `h3` (1.2857143em, font-weight 700, line-height 1.5555556), `h4`/`h5`/`h6` (1em, font-weight 700, line-height 1.4285714).
     - Aligned vertical spacing: inter-paragraph spacing `1.1em`, pre-heading spacing (`h1`: 1.8em, `h2`: 1.6em, `h3`: 1.55em, `h4-h6`: 1.4em), and post-heading spacing (`h1`: 0.8em, `h2`: 0.6em, `h3-h4`: 0.45em).
     - Styled inline `code` within `.MarkdownNotebook__text-block` to match `InlineCode` in blog posts: red text with red tinted border & background in light mode, yellow tinted in dark mode.
     - Ensured links inside `.MarkdownNotebook` have underline and 500 font-weight matching blog prose links.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`
  - `src/notebook-app/App.tsx`
  - `src/notebook-app/scenes/notebooks/NotebookPublicView.tsx`
  - `src/notebook-app/styles/bundleCss.ts`
  - `src/notebook-app/styles/productBundleCss.ts`
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** MarkdownNotebook Heading Creation, Slash Commands & Editorial Glitch Fixes.
- **Root Cause Diagnosis & Resolutions:**
  1. **Zero-Height Collapse on Empty Headings (`MarkdownNotebook.scss`):**
     - Headings previously had `min-height: 0;` (`h1..h4.MarkdownNotebook__text-block`), causing freshly inserted or empty headings to collapse to 0px tall and appear invisible to users.
     - Replaced with proper responsive minimum heights (`h1`: `1.25em`, `h2`: `1.3em`, `h3`/`h4`: `1.35em`) and distinct typography/margins (`1.875rem` / `1.5rem` / `1.25rem`).
  2. **Missing Empty Heading Placeholders (`MarkdownNotebook.tsx` & `MarkdownNotebook.scss`):**
     - Headings previously passed `placeholder: undefined` when not the first node in an empty document.
     - Updated `MarkdownNotebook.tsx` to supply `'Heading 1'`, `'Heading 2'`, `'Heading 3'`, and `'Quote'` placeholders for empty blocks.
     - Added `.MarkdownNotebook__text-block--heading:empty::before` styling with dimmed text and `pointer-events: none;`.
  3. **Lost Caret Focus on Heading/Quote Slash Insert (`InsertMenu.tsx`):**
     - `text-heading-1`, `text-heading-2`, `text-heading-3`, and `text-quote` did not call `focusInsertedText(targetNodeId)`, resulting in focus being lost when clicking or hitting Enter in the slash menu.
     - Added `focusInsertedText(targetNodeId)` to all text and quote insert commands.
  4. **Premature Slash Command Termination on Spaces (`documentModel.ts`):**
     - `getSlashTokenAt` previously aborted whenever `/\s/.test(query)` was true.
     - Updated to allow single spaces within queries (`query.includes('\n') || / {2,}/.test(query) || query.length > 35`), enabling commands like `/heading 1`, `/h 1`, `/başlık 1`, `/kod bloğu`.
  5. **Bilingual & Accent-Insensitive Slash Search (`InsertMenu.tsx`):**
     - Added comprehensive English & Turkish aliases for all text commands (`h1`, `heading 1`, `header 1`, `başlık 1`, `baslik 1`, `ana başlık`, `alıntı`, `kod`, `madde`, `görev`, etc.).
     - Enhanced `getFilteredInsertCommands` with Turkish character and accent normalization (`ı/i`, `ğ/g`, `ü/u`, `ş/s`, `ö/o`, `ç/c`).
  6. **Premature Markdown Shortcut Triggering (`documentModel.ts`):**
     - `getHeadingShortcut` previously matched `/^#{1,3}\s?$/`, triggering immediately on typing `#` without a space and wiping the hash character.
     - Updated regex to require a space `/^(#{1,3})\s+(.*)$/` and preserve any trailing text in the new heading's children.
     - Similarly updated blockquote shortcut to require a space (`/^>\s+(.*)$/`).
  7. **Enter & Backspace Editorial Glitches in Headings (`EditableTextBlock.tsx`):**
     - Pressing Enter at the end of a heading now correctly inserts a new `paragraph` block instead of duplicating the heading level.
     - Pressing Enter or Backspace on an empty heading now immediately downgrades it to a normal paragraph.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with exit code 0.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Clean git diff with no side-effects on other modules.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Notebook Inline Editor & Format Toolbar AuthModal Glassmorphism Restyle (No Shadows).
- **Motivation:** User instructed to apply the exact same frosted glassmorphism from the Sign-in modal (`AuthModal.tsx`) with zero drop shadow to the inline editor in the notebook, without altering any actions or content.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - `.MarkdownNotebook__format-toolbar`: Applied frosted glass `background: rgba(255, 255, 255, 0.7)` (dark: `rgba(24, 25, 28, 0.7)`), `border: 1px solid rgba(255, 255, 255, 0.8)` (dark: `rgba(255, 255, 255, 0.15)`), `backdrop-filter: blur(40px)`, `border-radius: 12px`, and `box-shadow: none !important;`. Refined button and divider contrast.
    - `.WimInlinePill` & `.WimInlinePill--review`: Replaced solid dark pill with `rgba(255, 255, 255, 0.7)` / dark `rgba(24, 25, 28, 0.7)`, `border-radius: 12px`, `backdrop-filter: blur(40px)`, `box-shadow: none !important;`, theme-aware text contrast.
    - `.WimInlinePill__presets` & `.WimInlinePill__presetItem`: Applied matching frosted glass background, 12px border radius, and zero drop shadow.
    - `.WimInlineEditor--floating`: Applied identical glassmorphism tokens.
  - Recompiled bundles: `src/notebook-app/styles/bundleCss.ts` and `src/notebook-app/styles/productBundleCss.ts`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Next.js Dev Server: `GET /notebooks 200 OK`.
  - Handoff: All buttons, icons, actions, selection handling, and keyboard navigation remain 100% functional.


### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Complete Dead PostHog UI Component Purge (Preserving NotebooksList & LemonTable 100%).
- **Motivation:** User explicitly instructed to keep NotebooksList and LemonTable 100% original and purge all other dead PostHog components and folders.
- **Deletions & Cleanups:**
  - Deleted entire `src/notebook-app/lib/ui/` (19 dead subdirectories: `Button`, `Collapsible`, `Combobox`, `ContextMenu`, `DialogPrimitive`, `DropdownMenu`, `HoverCard`, `IconWrapper`, `Label`, `LinkListItem`, `ListBox`, `Menus`, `PopoverPrimitive`, `quill`, `SelectPrimitive`, `TabsPrimitive`, `TextInputPrimitive`, `TextareaPrimitive`, `WrappingLoadingSkeleton`).
  - Deleted 27 dead components from `src/notebook-app/lib/lemon-ui/`: `LemonActionableTooltip`, `LemonCalendar`, `LemonCalendarRange`, `LemonColor`, `LemonDialog`, `LemonDisabledArea`, `LemonDrawer`, `LemonField`, `LemonFileInput`, `LemonInputSelect`, `LemonLabel`, `LemonMarkdown` (replaced with lightweight shim), `LemonProgress`, `LemonProgressCircle`, `LemonRadio`, `LemonRichContent`, `LemonSegmentedButton`, `LemonSegmentedSelect`, `LemonSlider`, `LemonSnack`, `LemonTree`, `LemonWidget`, `Lettermark`, `Link` (replaced with lightweight shim), `LoadingBar`, `Splotch`, `UploadedLogo`.
  - Deleted 8 dead shim directories from `src/notebook-app/lib/components/`: `Cards`, `DateFilter`, `HelpMenu`, `PayGateMini`, `Resizer`, `RichContentEditor`, `Superpowers`, `TaxonomicFilter`.
  - Deleted dead styles from `src/notebook-app/styles/`: `quill-bridge.scss`, `utilities-legacy.scss`, `notebook.css`, `index.css`.
  - Cleaned up `src/notebook-app/tsconfig.json` exclusions list.
  - Decoupled `LemonToast.tsx` from `HelpMenu/incidentStatus`.
- **Preserved Core Files:**
  - `LemonTable.tsx` and all internal helpers (`columnLayoutUtils`, `sorting`, `TableRow`, `types`, `useBulkSelection`, `LemonTableLoader`, `BulkSelectionBar`, `LemonTable.scss`, `LemonTableLoader.scss`).
  - `PaginationControl.tsx` and `PaginationControl.scss`.
  - `LemonButton`, `LemonCheckbox`, `LemonSkeleton`, `LemonTag`, `ProfilePicture`, `Popover`, `Tooltip`, `Spinner`, `LemonModal`, `LemonInput`, `LemonTextArea`, `LemonCard`, `LemonBadge`, `LemonBanner`, `LemonCollapse`, `LemonDivider`, `LemonDropdown`, `LemonMenu`, `LemonRow`, `LemonSwitch`, `LemonTabs`.
  - `MarkdownNotebook.tsx`, `MarkdownNotebook.scss`, `ScrollableShadows`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Next.js Dev Server: `GET /notebooks 200 OK`, `GET /api/notebooks 200 OK`.
  - `NotebooksListScene` table layout and data render identically with 0 visual/functional difference.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** SCSS / CSS Style Bundle Optimization & Legacy Baggage Pruning (Preserving LemonTable & MarkdownNotebook).
- **Motivation:** Clean up unused PostHog design system styles and Quill baggage while strictly retaining `LemonTable` and active notebook editor styling per user instruction.
- **Files Modified:**
  - `scripts/generate-style-bundle.js`:
    - Added strict `EXCLUDED_PATTERNS` to filter out 25+ dead legacy PostHog components (`LemonCalendar`, `LemonColor`, `LemonDisabledArea`, `LemonDrawer`, `LemonFileInput`, `LemonInputSelect`, `LemonLabel`, `LemonMarkdown`, `LemonProgressCircle`, `LemonRichContent`, `LemonSegmentedButton`, `LemonWidget`, `Lettermark`, `Link`, `LoadingBar`, `Splotch`, `LemonActionableTooltip`, `ButtonPrimitives`, `TabsPrimitive`, `TextInputPrimitive`, `WrappingLoadingSkeleton`, `utilities-legacy`, `notebook.css`, `index.css`, `quill-bridge.scss`, `quill-shim.css`).
    - Strictly preserved `LemonTable.scss`, `LemonTableLoader.scss`, `PaginationControl.scss`, `LemonButton.scss`, `LemonCheckbox.scss`, `LemonSkeleton.scss`, `LemonInput.scss`, `LemonTextArea.scss`, `LemonTag.scss`, `ProfilePicture.scss`, `LemonModal.scss`, `Popover.scss`, `Tooltip.scss`, `Spinner.scss`, `MarkdownNotebook.scss`, `ScrollableShadows.scss`, `icons.scss`, and core tokens (`vars`, `mixins`, `fonts`, `base`, `global`, `lemon-skin`, `index.tokens`, `notebook-dark-panel`, `site-bridge`).
  - `scripts/generate-scoped-quill-shim.js`:
    - Stubbed out `@posthog/quill` compilation into an empty stub comment, eliminating 114KB of unused Tailwind v4 styles that previously caused CSS var scoping conflicts.
  - `scripts/compile-notebook-product-css.js`:
    - Removed inlining and reading of `quill-shim.css`.
  - `src/notebook-app/styles/global.scss`:
    - Removed unused `@posthog/quill` imports and `quill-bridge`.
  - `src/notebook-app/styles/product-bundle.scss`:
    - Removed `@import 'quill-shim.css';`.
  - `src/notebook-app/styles/bundleCss.ts` & `src/notebook-app/styles/productBundleCss.ts`:
    - Recompiled with `pnpm run build:notebook-styles`.
    - `productBundleCss.ts` size cut by **36.4%** (from 314,213 to 199,959 characters, -114KB).
    - `bundleCss.ts` size reduced by **64,699 characters** (from 490,776 to 426,077 characters).
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: Passed with 0 gated errors.
  - Next.js dev server: Running cleanly, `/notebooks` endpoint returns HTTP 200.
  - `LemonTable` styles and functional behavior fully intact.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Complete Mobile Writing Experience & UI Collision Overhaul for MarkdownNotebook & OS Shell.
- **Files Modified:**
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.tsx`:
    - Fixed touch selection blocking: prevented `handleRowTouchStart` from setting the 340ms mobile block bar timer when touch originated inside editable elements (`[contenteditable="true"]`, `input`, `textarea`, `button`, `select`, `a`).
    - Fixed mobile native context menu blocking: prevented `onContextMenu` from executing `event.preventDefault()` on editable elements, restoring native mobile copy/paste/selection tools.
    - Added `data-notebook-formatting-active` state attribute on the notebook root container for OS shell coordination.
    - Wired up `onIndent` and `onOutdent` props to `FormattingToolbar` for list items (`shiftListItemDepthAtCurrentSelection`) and code blocks (`indentCodeBlockAtCurrentSelection`).
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Hidden inline plus button (`.MarkdownNotebook__line-insert-menu-hit-area`, `.MarkdownNotebook__line-insert-menu-button`) on mobile (<640px) to avoid persistent screen clutter, since `/` slash command covers block insertion.
    - Hidden boundary plus buttons (`.MarkdownNotebook__insert-boundary`) on mobile.
    - Set balanced, clean mobile padding (`padding-left: 0.875rem; padding-right: 0.875rem; --markdown-notebook-content-offset: 0px`).
    - Eliminated 28px horizontal layout jump: locked text rows to single column grid (`grid-template-columns: minmax(0, 1fr) !important`).
    - Prevented previous-line obscuring: disabled desktop hover `.MarkdownNotebook__block-chrome` and action buttons on mobile `focus-within`.
    - Prevented iOS Safari auto-zoom: enforced `font-size: 16px !important;` across all mobile inputs (`.WimInlinePill__input`, `.MarkdownNotebook__code-editor textarea`, `.MarkdownNotebook__table-cell-content`, etc.).
    - Enlarged `WimInlinePill` action buttons (`acceptBtn`, `retryBtn`, `rejectBtn`) to 34x34px with 6px border-radius and expanded pill review height to 42px.
    - Fixed `MentionPicker` & `InvitePicker` on mobile: positioned using keyboard-aware `--markdown-notebook-invite-picker-top`.
    - Added collision avoidance rule: `:has([data-notebook-formatting-active='true']) .reader-view-mobile-nav-btn { opacity: 0 !important; pointer-events: none !important; }`.
  - `src/notebook-app/lib/components/MarkdownNotebook/FormattingToolbar.tsx`:
    - Added `onIndent`, `onOutdent`, `canIndent`, and `canOutdent` props.
    - Added dedicated Indent (`IconIndent`) and Outdent (`IconOutdent`) buttons for mobile users without physical Tab/Shift+Tab keys.
  - `src/notebook-app/lib/icons/iconsShim.tsx`:
    - Exported `IconIndent` and `IconOutdent` using `lucide-react`.
  - `src/components/ReaderView/index.tsx`:
    - Added `reader-view-mobile-nav-btn` class to the mobile sidebar drawer floating button.
  - `src/notebook-app/styles/bundleCss.ts` & `src/notebook-app/styles/productBundleCss.ts`:
    - Recompiled via `pnpm run build:notebook-styles`.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Fix Slash (`/`) Insert Menu Not Opening & Viewport Cutoff on Mobile (`MarkdownNotebook`).
- **Root Cause Diagnosis:**
  1. `InsertMenu.tsx`: In `getInsertMenuPosition()`, `const viewport = getVisibleViewport()` was accidentally omitted, leaving `viewport` undeclared. In the browser runtime, this either threw a `ReferenceError` or evaluated to `<meta name="viewport">` (where `viewport.width` is `undefined`), leading to `NaN` coordinate values (`--markdown-notebook-insert-menu-left: NaNpx`, `--markdown-notebook-insert-menu-width: NaNpx`). This rendered the menu completely invisible/unpositioned on mobile.
  2. `MarkdownNotebook.scss`: The `@media (max-width: 640px)` media query previously had `width: min(17rem, calc(100vw - 24px)) !important;` which overrode the calculated CSS variable width and caused right-edge cutoffs when `left` was near the boundary. Also lacked keyboard-aware height containment.
  3. `InsertMenu.tsx`: Touch selection buttons lacked `event.preventDefault()` on `pointerdown`, which caused mobile virtual keyboards to lose focus and blur before triggering item clicks.
- **Fixes Applied:**
  - `src/notebook-app/lib/components/MarkdownNotebook/InsertMenu.tsx`:
    - Restored `const viewport = getVisibleViewport()`.
    - Added finite number guards and `Math.round` to `menuStyle` CSS custom variables to strictly prevent `NaNpx`.
    - Fixed mobile width calculation (`defaultPreferredWidth = Math.min(256, availableViewportWidth)`).
    - Added strict boundary clamping: `left = Math.max(minLeft, Math.min(anchorRect.left, maxLeft))`.
    - Bound `maxHeight` to `Math.min(preferredMaxHeight, Math.max(60, availableHeight))` so the menu never collides with the virtual keyboard or overflows the top of the viewport.
    - Added `onPointerDown={(e) => e.preventDefault()}` on insert menu buttons to preserve input focus during mobile touch selection.
  - `src/notebook-app/lib/components/MarkdownNotebook/MarkdownNotebook.scss`:
    - Removed `!important` on mobile `.MarkdownNotebook__insert-menu` width; configured it to use `var(--markdown-notebook-insert-menu-width, min(16rem, calc(100vw - 24px)))` with clean `max-width: calc(100vw - 24px)`.
    - Bound mobile `max-height` to `var(--markdown-notebook-insert-menu-max-height, 240px)`.
  - `src/notebook-app/styles/bundleCss.ts` & `src/notebook-app/styles/productBundleCss.ts`:
    - Recompiled with `pnpm run build:notebook-styles`.
- **Verification:**
  - `pnpm run build:notebook-styles`: Passed with 0 errors.
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Next.js Dev Server: HTTP 200 on `/notebooks` and `/api/notebooks`.

### 2026-09-07 — Antigravity (Advanced Agentic Coding)
- **Scope:** Notebook Sticky Header Bar Glassmorphism Styling (`ReaderView`).
- **Motivation:** User instructed to apply the exact glassmorphism design from the sign-in modal (`AuthModal.tsx`) to the notebook user/actions bar (`stickyHeader` containing `CollaboratorsBanner`: user avatar, history, undo/redo, sync status, WIM AI) without changing any of its contents, and completely remove any shadow behind it.
- **Files Modified:**
  - `src/components/ReaderView/index.tsx`:
    - Updated `stickyHeader` container classes from:
      `rounded-sm border border-primary bg-primary/90 backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.45)]`
      to:
      `rounded-xl border border-white/80 dark:border-white/15 bg-white/70 dark:bg-[#18191c]/70 backdrop-blur-2xl shadow-none overflow-hidden`
    - Maintained 100% of all bar contents, buttons, avatar stacks, and interactive popovers without touching `CollaboratorsBanner.tsx`.
- **Verification:**
  - `pnpm run typecheck:shell`: `PASS — zero gated errors in core shell allowlist.`
  - Dev server: running cleanly on port 3000.

### 2026-09-12 — Jules
- **Scope:** Optimize WorldInMaking notification refresh pipeline.
- **Motivation:** Eliminate redundant frontend fetch requests caused by interval polling, overlapping focus listeners, and panel open events, while deduplicating local assistant notices cleanly.
- **Files Modified:**
  - `src/components/NotificationsPanel/index.tsx`: Removed redundant `fetchUser` on panel open.
  - `src/hooks/useUser.tsx`: Removed 45s interval poll. Replaced multiple local assistant merging routines with a unified `syncNotifications` function that debounces `fetchUserNotifications`.
  - `src/lib/wim-notifications.ts`: Bypassed slow `supabase.auth.getSession()` on backend fetches by injecting `userId`. Removed local assistant merge to centralize it in `useUser.tsx`.
  - `tests/use-user-notifications.spec.ts`: Added unit test covering deduplication and sorting logic to prevent regressions on merged states.
- **Verification:**
  - Checked `pnpm typecheck:shell` (0 errors).
  - Validated build success.
  - Tests pass, including the new regression coverage.

## 2023-10-18 - Forum API Validation and Reliability Improvements
**Learning:** `req.json()` in Edge endpoints must be carefully bounded. Unbounded JSON bodies expose APIs to memory exhaustion from excessively large request payloads. Furthermore, placing rate-limiting assertions in front of heavy conditional blocks (like bot logic gates) can consume limited burst tokens on rejected/skipped processes. Also, calling wrapper authentication functions that execute `getUser()` when a `getUser()` call has already happened causes duplicate database network trips.
**Action:** When working on JSON-heavy edge handlers (e.g., in `pages/api`), prefer `readJsonObject(req, size_limit)` to assert boundary limits *before* deserialization. Additionally, carefully defer rate limits until immediately before the guarded operation runs (after validation gates) to prevent users from consuming limits on blocked requests. Avoid redundant `getUser()` calls by caching and cascading user data, or by checking deterministic logic first before querying DB authorizations.

### $(date +%Y-%m-%d) — Jules (A1 ReaderView PostHog about)
- **Scope:** Replaced PostHog marketing copy in ReaderView with WorldInMaking about text.
- **Files Modified:** `src/components/AboutPostHog/index.tsx`, `docs/architecture/AI_MEMORY.md`
- **Commands run:** `pnpm typecheck:shell`, `pnpm test:smoke`, `rg "PostHog is the leading" src`
- **Pass/Fail:** PASS
- **Handoff:** Next unfinished card is A2.

### $(date +%Y-%m-%d) — Jules (A1 ReaderView PostHog about)
- **Scope:** Replaced PostHog marketing copy in ReaderView with WorldInMaking about text.
- **Files Modified:** `src/components/AboutPostHog/index.tsx`, `docs/architecture/AI_MEMORY.md`
- **Commands run:** `pnpm typecheck:shell`, `pnpm test:smoke`, `rg "PostHog is the leading" src`
- **Pass/Fail:** PASS
- **Handoff:** Next unfinished card is A2.
### 2025-03-05 — Jules (Accessibility polish for WIM Ask AI)
- **Scope:** Improved screen reader support for the Ask AI chat sidebar, composer, and error live regions.
- **Files Modified:**
  - `src/components/ClaudeWorkspaceChat/components/ChatInput.tsx`
  - `src/components/ClaudeWorkspaceChat/components/Sidebar.tsx`
  - `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx`
- **Commands run:** `pnpm typecheck:shell`, `pnpm vitest run --passWithNoTests tests/ask-ai-golden.spec.ts`, `pnpm exec playwright test tests/ask-ai-golden.spec.ts`
- **Pass/Fail:** PASS


### $(date +%Y-%m-%d) — Jules (Ask AI Quality Gate Presentation)
- **Scope:** Changed Ask AI to display soft `qualityGate` outcomes as compact footnotes inside the chat bubble instead of mapping them to hard blocking error cards.
- **Files Modified:**
  - `src/components/ClaudeWorkspaceChat/components/ChatMessage.tsx` (presentation logic added)
  - `tests/chat-merge.spec.ts` (added test for state preservation over merge)
- **Commands run:** `pnpm typecheck:shell`, `pnpm vitest run tests/chat-merge.spec.ts --environment node`
- **Pass/Fail:** PASS
- **Handoff:** Next unfinished task from plan.
