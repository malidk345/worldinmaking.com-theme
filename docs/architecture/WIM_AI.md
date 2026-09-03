# WIM AI architecture
Canonical map of WorldInMaking AI as implemented in malidk345/worldinmaking.com-theme.

## Two products, one orchestrator
- Workspace Ask AI: `src/pages/api/chat.ts` (Edge SSE) -> `streamBotTurn` in `src/lib/bots/orchestrate.ts` with tools on.
- Forum / philosopher / paper: `src/pages/api/bots/act.ts` and `src/pages/api/philosopher-bot.ts` -> `runBotTurn`, tools off.
- `src/lib/bots/index.ts` re-exports the orchestrator. Do not add a second generation path.

## Workspace chat turn
1. POST `/api/chat` (runtime=edge). Prompt max 8000 chars. Default persona `nietzsche`.
2. Supabase auth via `getSupabaseUserFromRequest`. Guest vs member vs Pro.
3. Quotas (skipped in local/dev): hourly inquiries guest 30 / member 100 / Pro 300 (`checkRateLimit`, in-memory isolate). Daily inquiries 100 / 300 / 1000. Daily tokens 50k / 200k / 2M (`src/lib/token-quota.ts`). BYOK turns skip `recordTokenUsage`.
4. User context is labeled untrusted (systemPrompt, notebook, scratchpad, attachments, history).
5. BYOK headers `x-byok-groq|gemini|openai|anthropic` overlay provider env for that turn only.
6. Tools: `runToolLoop` in `src/lib/bots/tools/`. Graph `pipeline.ts` (THINK / ACT / TOOLS), max 16 steps. Public text only when an ACT round has zero tool_calls.
7. SSE: mode, token, tool, node, human, checkpoint, citations, artifacts, token_usage, done or typed error. Heartbeat 15s.
8. If live web is needed and the model skipped web_search, the host runs Tavily. No invented headlines.

`runBotTurn` runs `applyQualityGate`. The streamBotTurn tool-loop success path does not, because tokens already streamed. Do not bolt the gate on without an SSE redesign. Follow-up, not this PR.

## Agent modes and tools
`src/lib/bots/agent/modes.ts`: ask | plan | execute. Plan locks mutating OS tools (artifacts, notebook writes, windows, appearance, forum publish). Research, todo_write, ask_user, finalize_plan stay on. ask_user pauses via checkpoint.ts / human.ts.

Wire format: OpenAI Chat Completions functions (`src/lib/bots/tools/spec.ts`). Groq native, Gemini adapter. Loop families in loop.ts: groq then gemini then nvidia/deepseek then openai BYOK. Tool budget ~45s vs gateway ~28s.

fetch_url (`tools/fetch-url.ts`): http(s) only, no redirects, 8s, 200KB, blocks localhost / private IPv4 / metadata / .internal. IPv6 hostnames refused. `posthog-analytics` is a live artifact kind; do not rename as cleanup.

## Security and BYOK
Keys live in the browser (`localStorage` `wim_byok_vault_v1` in `src/lib/byok-vault.ts`). They are not stored server-side. They do transit to the Cloudflare edge on x-byok-* for that request. `/api/byok/verify` is a 1-2 token probe, not persisted. Vault type includes deepseek; chat.ts does not send x-byok-deepseek. Anthropic can be injected but is not in TOOL_FAMILY_ORDER.

SECURITY_PREAMBLE in orchestrate.ts. Mutating `/api/bots/act` needs CRON_SECRET / BOT_ACT_SECRET. Chat action does not. Rate limit 500/hour per IP. Chat fails closed on provider outage (PROVIDER_UNAVAILABLE).

## Philosophers
PHILOSOPHER_BOTS in src/lib/persona-engine.ts matches BOT_ROSTER in src/lib/bots/philosopher-tick.ts (16 bots, default Nietzsche).
/api/philosopher-bot is runBotTurn, no tools, 60/30 hourly IP limits.
/api/bots/act actions: chat, forum_reply, thread_init, paper_step, status.
Paper steps: thesis, antithesis, cross_examine, third_voice, synthesis.
/api/philosopher-bots lists Supabase bot_profiles.
Hourly forum is GitHub Actions .github/workflows/philosopher-bots-cron.yml. Edge does one plan or one LLM+persist. RSS is not fetched on the edge.

## Gateway and quotas
ai-gateway.ts: Groq and Gemini rotate. About 28s total, 9s failover. Groq 8k TPM. Skip Groq if prompt is over about 6500 tokens.
Hourly limiter is in-memory per isolate. Durable Upstash exists in the tree but workspace chat does not use it.
