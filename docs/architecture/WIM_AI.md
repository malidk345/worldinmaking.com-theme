# WIM AI architecture
Canonical map of WorldInMaking AI as implemented in malidk345/worldinmaking.com-theme.

## Two products, one orchestrator
- Workspace Ask AI: `src/pages/api/chat.ts` (Edge SSE) -> `streamBotTurn` in `src/lib/bots/orchestrate.ts` with tools on.
- **Abort / Stop**: client `AbortController` cancels `fetch('/api/chat')` (Stop button, Meta+., unmount/close, chat switch). Edge `req.signal` + stream `cancel()` abort the turn and linked provider fetches in the tool loop.
- Forum / philosopher / paper: `src/pages/api/bots/act.ts` and `src/pages/api/philosopher-bot.ts` -> `runBotTurn`, tools off.
- `src/lib/bots/index.ts` re-exports the orchestrator. Do not add a second generation path.

## Workspace chat turn
1. POST `/api/chat` (runtime=edge). Prompt max 8000 chars. Default persona `nietzsche`.
2. Supabase auth via `getSupabaseUserFromRequest`. Guest vs member vs Pro.
3. Quotas (skipped in local/dev): weekly token budget (resetting UTC Monday). Guest 80k / member 2.5M / Pro 20M (`src/lib/token-quota.ts`). Tools share the same weekly token bucket. BYOK turns skip `recordTokenUsage`. In-memory token tracking is only the fallback when Upstash creds are absent.
4. User context is labeled untrusted (systemPrompt, notebook, scratchpad, attachments, history). Notebook/document retrieval is lexical (keyword/TF + host snapshot tools), not embedding/vector RAG; empty matches fail closed — do not invent notebook citations.
5. BYOK payload `body.byok` (groq|gemini|openai|anthropic) overlays provider env for that turn only.
6. Tools: `runToolLoop` in `src/lib/bots/tools/`. Graph `pipeline.ts` (THINK / ACT / TOOLS), max 16 steps. Public text only when an ACT round has zero tool_calls.
7. SSE: mode, token, tool, node, human, checkpoint, citations, artifacts, token_usage, done or typed error. Heartbeat 15s.
8. If live web is needed and the model skipped web_search, the host runs Tavily. No invented headlines.

`runBotTurn` runs `applyQualityGate`. The `streamBotTurn` tool-loop success path also applies the quality gate.

## Agent modes and tools
`src/lib/bots/agent/modes.ts`: ask | plan | execute. Plan locks mutating OS tools (artifacts, notebook writes, windows, appearance, forum publish). Research, todo_write, ask_user, finalize_plan stay on. ask_user pauses via checkpoint.ts / human.ts.

Wire format: OpenAI Chat Completions functions (`src/lib/bots/tools/spec.ts`). Groq native, Gemini adapter. Loop families in loop.ts: groq, gemini, nvidia, openai, anthropic. Tool budget ~45s vs gateway ~28s. Host THINK is a short routing note (`THINK_MAX_TOKENS` 256, no Gemini native thinking on that round). ACT keeps `max_tokens` 8192 and gpt-oss `reasoning_effort: low`. `create_artifact` canvas/3d/sim JSON is fail-closed; canvas nodes without x/y get an auto-grid; same title revises the open card. HTML preview is `sandbox="allow-scripts"` only. Ask AI quality-gate outage keeps the streamed reply (`skipped`). React/HTML screens must use host chrome (`bg-primary` paper, `bg-navy` actions) and fill the window — not toy landing pages. `search_academic_corpus` merges and ranks OpenAlex/Crossref/S2 (+ arXiv for STEM, PMC/Europe PMC for biomedical) by query match + citations + OA PDF, reports per-source status (all-failed = `ok:false` degraded, not "no literature"), and returns one `[P#]` line per paper; optional keys `OPENALEX_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `NCBI_API_KEY`. Step 2 adds keyless TR Dizin (Turkish), CORE + DOAJ (humanities / OA), SEP + IEP encyclopedia entries for philosophy (title + link + ≤ 300-char excerpt), optional `query_original` for bilingual fan-out, reciprocal-rank fusion with a relevance floor, a shared `caches.default` cache (search 3 d, DOI 30 d), and a post-answer citation check that flags unverifiable references (`verified:false`) without rewriting the answer. Step 3 adds `related_papers` (citation graph: S2 citations/references/recommendations, OpenAlex references/related/cited-by, OpenCitations, Crossref reference lists; keyless it degrades and names the missing key), opt-in `find_quotes` (short verbatim passages with location from S2 snippets [key], Europe PMC / CORE full text or the OA PDF via `read_document`; never paraphrases as quotes), and `annotated_bibliography` (APA from real metadata only, optional insert into the bound notebook); `[P#]` ids stay turn-global across all three (`[P@n]` = already-cited source). Uploaded PDFs keep `[Page N]` markers (cap 200); `read_document` slices those pages. Scanned PDFs report no text — no OCR.

fetch_url (`tools/fetch-url.ts`): http(s) only, up to 3 redirects with hop-by-hop SSRF (same policy as `read_document`), 8s, 200KB, blocks localhost / private IPv4 / metadata / .internal. IPv6 hostnames refused. `posthog-analytics` is a live artifact kind; do not rename as cleanup.

## Security and BYOK
Keys live in the browser (`localStorage` `wim_byok_vault_v1` in `src/lib/byok-vault.ts`). They are not stored server-side. They do transit to the Cloudflare edge via the chat request body (`body.byok`) for that request. `/api/byok/verify` is a 1-2 token probe, not persisted. Vault providers are groq, gemini, openai, and anthropic. Anthropic is included in TOOL_FAMILY_ORDER.

SECURITY_PREAMBLE in orchestrate.ts. Mutating `/api/bots/act` needs CRON_SECRET / BOT_ACT_SECRET. Chat action does not. Rate limit 500/hour per IP. Chat fails closed on provider outage (PROVIDER_UNAVAILABLE).

## Philosophers
PHILOSOPHER_BOTS in src/lib/persona-engine.ts matches BOT_ROSTER in src/lib/bots/philosopher-tick.ts (16 bots, default Nietzsche).
/api/philosopher-bot is runBotTurn, no tools.
/api/bots/act actions: chat, forum_reply, thread_init, paper_step, status.
Paper steps: thesis, antithesis, cross_examine, third_voice, synthesis.
/api/philosopher-bots lists Supabase bot_profiles.
Hourly forum is GitHub Actions .github/workflows/philosopher-bots-cron.yml. Edge does one plan or one LLM+persist. RSS is not fetched on the edge.

## Gateway and quotas
ai-gateway.ts: Groq and Gemini rotate. About 28s total, 9s failover. Groq 8k TPM. Skip Groq if prompt is over about 6500 tokens.
Workspace chat weekly token quota (`failClosed: true`). Memory isolate is used only when Upstash is not configured. Tool loop budget ~45s vs gateway ~28s. Chat fails closed on provider outage (`PROVIDER_UNAVAILABLE`) and on quota store outage (`QUOTA_UNAVAILABLE`).

## Chat persistence (guest vs signed-in)
Local-first: IndexedDB + localStorage write-through (`chat-local` / `chat-remote`). Cloud push/pull/realtime/12s poll requires a signed-in session (`canSyncChatsToRemote`). Guests stay local-only; on login, `adoptGuestChatsIntoAccount` + `claimDeviceAccountOnLogin` + `pushDirtyLocalChats` move device chats onto the account (notebook parity with `canSyncNotebooksToRemote`).
