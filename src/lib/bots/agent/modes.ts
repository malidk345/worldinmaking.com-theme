/**
 * PostHog-style agent modes for WIM AI.
 *
 * Mirrors ee/hogai/core/agent_modes + plan_mode:
 *   - ask: default toolkit, model routes tools
 *   - plan: supermode — research/read/plan only, then switch_mode
 *   - execute: full toolkit after a plan (or when the user starts there)
 *
 * Edge-safe. No LangGraph runtime — the node loop in pipeline.ts is the graph.
 */

export type AgentMode = 'ask' | 'plan' | 'execute'

export type AgentNodeName = 'root' | 'tools' | 'synthesis'

export const AGENT_MODES: AgentMode[] = ['ask', 'plan', 'execute']

/** Tools allowed while supermode=plan. Everything else must wait for switch_mode. */
export const PLAN_TOOL_NAMES = [
    'web_search',
    'fetch_url',
    'read_document',
    'read_notebook',
    'get_workspace',
    'search_site',
    'search_academic_corpus',
    'related_papers',
    'find_quotes',
    'analyze_image',
    'transcribe_audio',
    'synthesize_speech',
    'list_notebooks',
    'read_post',
    'write_scratchpad',
    'todo_write',
    'switch_mode',
    'remember',
    'finalize_plan',
    'task',
    'cross_examine_argument',
    'run_code_sandbox',
    'verified_corpus_search',
    'export_notebook',

] as const

export const MUTATING_TOOL_NAMES = [
    'create_artifact',
    'open_path',
    'create_notebook',
    'insert_notebook_block',
    'rewrite_notebook_document',
    'replace_notebook_selection',
    'update_notebook_title',
    'manage_windows',
    'set_system_appearance',
    'annotate_notebook',
    'publish_to_forum',
    'generate_image',
    'synthesize_speech',
    'add_notebook_footnote',
    'arrange_workspace_preset',
    'generate_flashcards',
    'create_concept_map',
    'annotated_bibliography',
] as const

export function parseAgentMode(value: unknown): AgentMode {
    if (value === 'plan' || value === 'execute' || value === 'ask') return value
    return 'ask'
}

export function isPlanTool(name: string): boolean {
    return (PLAN_TOOL_NAMES as readonly string[]).includes(name)
}

export function isToolAllowedInMode(name: string, mode: AgentMode): boolean {
    if (mode !== 'plan') return true
    return isPlanTool(name)
}

export function toolsForMode<T extends { function: { name: string } }>(mode: AgentMode, tools: T[]): T[] {
    if (mode !== 'plan') return tools
    return tools.filter((tool) => isPlanTool(tool.function.name))
}

export const PLAN_MODE_PROMPT = `
<plan_mode>
You are in plan mode. Mutating OS tools are locked (artifacts, windows, notebook edits, publish, appearance). Research tools and todo_write are available.

You choose the next move. Never ask the user what the next steps should be — invent the plan yourself. Do not call ask_user in plan mode (it is unavailable). A greeting, a direct answer, or a brief reply can go in the public reply with zero tools and zero unneeded planning. Use todo_write only when sequencing actually helps — never invent a plan for a one-step ask.

Quality rule: prefer ONE focused move per turn — either a parallel research fan-out for the current step (several web_search/fetch_url in one ACT), OR write_scratchpad, OR write/update the todo spine, OR call finalize_plan. Do not cram research + multi-step drafting + finalize into one weak continuous turn.

For a long essay, article, or word-count request, todo_write must follow this spine unless the user named other sections: research → outline → opening → body → closing → footnotes → short chat summary. Later execute turns write one major notebook section at a time. Prefer a short done_when on each step (success criteria).

Use research tools when you need facts for the current in_progress item only. Prefer planning 2–5 targeted queries in THINK, then calling several web_search/fetch_url together in one ACT (host runs them in parallel). Persist research citations/synthesis with write_scratchpad (required after a research cluster — do not wait for the user to ask). When that item is done, todo_write with the SAME ids (mark it completed, next pending → in_progress), then STOP this turn — the host continues on the next request. When the overall plan is ready to show, call finalize_plan — the host waits for Run. switch_mode execute skips approval and continues in the same turn.
If you use todo_write, keep the same ids after the first plan. Exactly one item in_progress. finalize_plan needs a todo spine; if research ran, scratchpad must hold findings first.
</plan_mode>
`.trim()

export const PLAN_TOOL_PROTOCOL = `
PLAN MODE:
- Mutating OS tools are locked. Research, write_scratchpad, todo_write, remember, task, finalize_plan, and switch_mode are available. ask_user is NOT available — never solicit next steps from the user.
- You invent the plan. Do not ask the user what the next steps should be. Do not call todo_write unless a sequence helps. Prefer short done_when on steps.
- Prefer one focused move per turn for quality: parallel research fan-out for the current step (several web_search/fetch_url in one ACT), or write_scratchpad, or todo_write, or finalize_plan — avoid packing the whole plan into one continuous turn.
- After a research cluster, call write_scratchpad with citations/synthesis, then STOP (or todo_write if the step is done). After finishing the current in_progress todo, mark it completed via todo_write and STOP; the host will continue on the next request. Call finalize_plan when the plan is ready for Run (spine required; scratchpad required if research ran). Use switch_mode execute only to skip approval.
- Micro requests (e.g. greetings): answer immediately in the public bubble with zero tools.
- Comprehensive / long-form requests: todo_write the spine research → outline → opening → body → closing → footnotes → chat summary, research the current step this turn with a parallel fan-out, then continue next turn or finalize_plan when ready.

`.trim()

export const PLAN_USER_PREFIX =
    '[Plan mode is ON. Mutating OS tools are locked. You invent the plan — do not ask the user for next steps. Prefer one focused planning move per turn (parallel research fan-out OK). When the plan is ready, call finalize_plan so the user can Run it.]'

export const EXECUTION_TRANSITION_PROMPT = `
Plan mode is complete. You are now in execution mode.

All tools are available. Follow the todo_write plan with appropriate depth and stamina:
- Mark the current step in_progress, do the work with the right tool, then mark it completed.
- Do not skip live search or document reads the plan called for.
- Do not ask the user what to do next. Complete at most one major section this turn, then stop so the host can continue with Next section. Do not quit after 2-3 trivial no-op steps.
- For deep, comprehensive writing or multi-section research:
  * Do not compress an exhaustive work into 3 short paragraphs.
  * Use create_notebook and insert_notebook_block. Complete at most one major section this turn, mark that todo completed, leave the rest pending, then stop. The user will send Next section.
  * Footnotes as [^1], [^2] in the notebook, not only in the bubble.
- When every todo is completed, write a short executive summary in the public bubble. Do not dump tool JSON or <tool_code>. Do not replace the notebook piece with a one-line status.
`.trim()

export const PLAN_TRANSITION_PROMPT = `
You are back in plan mode. Mutating OS tools are locked. Research, update the plan, or write the public answer as the task needs. Do not ask the user for next steps. Prefer one focused move this turn (parallel research fan-out OK). Call finalize_plan when the plan is ready for the user to Run.
`.trim()

export function modeSystemPrompt(mode: AgentMode): string {
    if (mode === 'plan') return PLAN_MODE_PROMPT
    if (mode === 'execute') return EXECUTION_TRANSITION_PROMPT
    return ''
}

export function modeTransitionPrompt(next: AgentMode): string {
    return next === 'plan' ? PLAN_TRANSITION_PROMPT : EXECUTION_TRANSITION_PROMPT
}

export function nodeStatusLabel(node: AgentNodeName, status: 'started' | 'completed'): string {
    if (node === 'root') return status === 'started' ? 'Deciding next step' : 'Chose next step'
    if (node === 'tools') return status === 'started' ? 'Using tools' : 'Finished tools'
    return status === 'started' ? 'Writing answer' : 'Answer ready'
}
