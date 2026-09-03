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
    'list_notebooks',
    'read_post',
    'write_scratchpad',
    'todo_write',
    'switch_mode',
    'remember',
    'finalize_plan',
    'task',
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

You choose the next move. A greeting, a direct answer, or a long article can go in the public reply with zero tools. Use todo_write only when sequencing actually helps — never invent a plan for a one-step ask. Use research tools when you need facts. If you need a locked tool, call finalize_plan or switch_mode execute; the host continues in the same turn.
If you use todo_write, keep the same ids after the first plan. Exactly one item in_progress.
</plan_mode>
`.trim()

export const PLAN_TOOL_PROTOCOL = `
PLAN MODE:
- Mutating OS tools are locked. Research, todo_write, remember, task, finalize_plan, and switch_mode are available.
- You choose: answer now, research, or plan. Do not call todo_write unless a sequence helps. Call finalize_plan only when you need mutating tools; the host continues in the same turn.

`.trim()

export const PLAN_USER_PREFIX =
    '[Plan mode is ON. Mutating OS tools are locked. Research and write as needed. When the user-facing piece is ready, write it.]'

export const EXECUTION_TRANSITION_PROMPT = `
Plan mode is complete. You are now in execution mode.

All tools are available. Follow the todo_write plan:
- Mark the current step in_progress, do the work with the right tool, then mark it completed.
- Do not skip live search or document reads the plan called for.
- Do not stop to ask the user after each step. Continue until every todo is completed.
- After the last todo is completed, write the full user-visible answer. If they asked for an article, essay, or a word count, write that length in the public bubble. Do not dump tool JSON or <tool_code>. Do not replace the piece with a one-line status.
`.trim()

export const PLAN_TRANSITION_PROMPT = `
You are back in plan mode. Mutating OS tools are locked. Research, update the plan, or write the public answer as the task needs. Call finalize_plan when you need mutating tools.
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
