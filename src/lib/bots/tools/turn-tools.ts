/**
 * Ask-mode tool list for one provider round.
 *
 * Academic search was paying for every tool schema on every act round
 * (studio tools, and follow-ups that need a paper id from this turn).
 * Plan and execute keep their existing lists. The weekly meter is unchanged.
 */

import { toolsForMode, type AgentMode } from '../agent/modes'

/** Follow-ups that need a paper already found this turn. Large schemas. */
export const ACADEMIC_FOLLOWUP_TOOLS = ['related_papers', 'find_quotes', 'annotated_bibliography'] as const

/** A successful call of one of these unlocks the follow-up schemas. */
export const ACADEMIC_SEED_TOOLS = new Set(['search_academic_corpus', 'verified_corpus_search'])

/**
 * Literature + notebook writing. Not the desktop studio
 * (artifacts, windows, image, voice, flashcards, publish, export, sandbox).
 */
export const RESEARCH_TOOL_NAMES = [
    'web_search',
    'fetch_url',
    'read_document',
    'write_scratchpad',
    'remember',
    'ask_user',
    'task',
    'get_workspace',
    'search_site',
    'read_post',
    'open_path',
    'list_notebooks',
    'create_notebook',
    'insert_notebook_block',
    'rewrite_notebook_document',
    'replace_notebook_selection',
    'update_notebook_title',
    'read_notebook',
    'annotate_notebook',
    'add_notebook_footnote',
    'search_academic_corpus',
    'cross_examine_argument',
    'verified_corpus_search',
    ...ACADEMIC_FOLLOWUP_TOOLS,
] as const

const RESEARCH_ALLOW = new Set<string>(RESEARCH_TOOL_NAMES)

const EXPLICIT_RESEARCH =
    /\b(?:doi|arxiv|pubmed|openalex|crossref)\b|10\.\d{4,}\/\S+|peer[- ]reviewed|literature review|annotated bibliography|related papers?|who cites|citation graph|\b(?:papers?|articles?|studies|citations?|literature|sources?)\b|kaynakça|literatür|akademik|makale|atıf|atif|hakemli|kaynak(?:lar[ıi]|ça)?/i

const FOLLOWUP_ASK =
    /related papers?|who cites|citation graph|find quotes?|verbatim|annotated bibliography|kaynakça|ilgili (?:makale|çalışma|calisma)|atıf(?:ta| yapan| graf)|atif(?:ta| yapan)|alıntı|alinti|sayfa numar/i

const STUDIO_ASK =
    /concept map|kavram haritas|flashcard|bilgi kart|generate (?:an? )?image|görsel (?:üret|oluştur|ekle)|resim çiz|(?:^|\s)çiz(?:\s|$)|diagram|diyagram|sim[uü]lasyon|(?:^|\s)3d(?:\s|$)|pencere|workspace layout|masaüst|seslendir|sesli oku|read aloud|\bnarrate\b|voice note|duvar kağı|wallpaper|yayınla|\bpublish\b|dışa aktar|export (?:the )?notebook|\blatex\b|transcribe|ses kayd|kodu çalıştır|run (?:the )?code|sandbox|screenshot|ekran görüntüsü|\bcanvas\b|\bartifact\b/i

const THINKERS =
    /nietzsche|spinoza|kant|heidegger|hegel|plato|platon|aristotle|aristoteles|schopenhauer|camus|kierkegaard|foucault|derrida|sartre|wittgenstein|descartes|dekart|hume|locke|marx|marks|freud|seneca|epictetus|epiktetos|marcus aurelius|beauvoir|rawls|hobbes|rousseau|aquinas|popper|kuhn|adorno|arendt|habermas|deleuze|sokrates|socrates|leibniz|augustine|augustinus|ibn(?:i)? sina|farabi|gazali|ghazali|mevlana|\brumi\b|konfüçyüs|confucius/i

/** Shorter than TOOL_PROTOCOL: no artifact recipes. Academic cite rules stay. */
export const RESEARCH_TOOL_PROTOCOL = `
PROCESS:
- Think privately first (the host shows that as Thought), then call tools in the function channel.
- A short status note in the public channel is fine. Do not dump the final answer in the same step as a tool call.
- <system_reminder>, <private_thought>, and <plan_board> are host notes. Do not quote them.
- When this turn already has public text, continue it instead of starting over.

ACADEMIC:
- search_academic_corpus returns papers as [P1], [P2]… Cite only those ids and the metadata you were shown. Never invent a paper, DOI, or quote.
- If the search is unavailable or degraded, say so. That is not evidence that no literature exists.
- Turkish user: pass query (English research terms) and query_original (Turkish) in one call. ENCYCLOPEDIA hits are reference entries, not papers.
- related_papers, find_quotes, and annotated_bibliography appear after a search when this turn has a paper. find_quotes only if the user wants an exact passage. [P#] ids stay stable this turn.
- A successful search_academic_corpus is not sent again. Open a paper with fetch_url or read_document, or call a follow-up. If that search failed, retry it once with fixed arguments.
- verified_corpus_search is for primary texts (Nietzsche, Spinoza, Kant, and the other canon names), not journal papers.

OTHER:
- web_search for current events; fetch_url before quoting a page. Notebook writes only when the user asked to save. Do not paste the same markdown again in the bubble.
- If a tool errors, fix the arguments and call it again. Never print <tool_code>, <tool_call>, or default_api.* in the bubble.
`.trim()

export function isResearchQuestion(text: string): boolean {
    const q = text.trim()
    if (!q || STUDIO_ASK.test(q)) return false
    if (EXPLICIT_RESEARCH.test(q)) return true
    return THINKERS.test(q) && q.split(/\s+/).length >= 3
}

export function questionWantsAcademicFollowUps(text: string): boolean {
    return FOLLOWUP_ASK.test(text)
}

/** Which follow-ups the question named. A vague "sources" ask is not one of these. */
export function questionFollowUpNames(text: string): string[] {
    const names: string[] = []
    if (/related papers?|who cites|citation graph|ilgili (?:makale|çalışma|calisma)|kim atıf|kim atif/.test(text)) {
        names.push('related_papers')
    }
    if (/find quotes?|verbatim|alıntı|alinti|sayfa numar/.test(text)) names.push('find_quotes')
    if (/annotated bibliography|kaynakça/.test(text)) names.push('annotated_bibliography')
    return names
}

const NOTEBOOK_ASK =
    /notebook|defter|dipnot|footnote|notlar[ıi]ma|notuma|kaydet|kenar not|margin note/i

export function questionWantsNotebook(text: string): boolean {
    return NOTEBOOK_ASK.test(text)
}

/**
 * After a paper is in hand the model still needs the chain (related papers,
 * quotes, bibliography), a way to open a source, and notebook tools only when
 * the user asked to save. The corpus schema is not repeated unless it failed.
 */
const POST_SEED_TOOLS = [
    'web_search',
    'fetch_url',
    'read_document',
    'cross_examine_argument',
    'ask_user',
] as const

const NOTEBOOK_TOOLS = [
    'list_notebooks',
    'create_notebook',
    'insert_notebook_block',
    'rewrite_notebook_document',
    'replace_notebook_selection',
    'update_notebook_title',
    'read_notebook',
    'annotate_notebook',
    'add_notebook_footnote',
] as const

export type ToolRoundMessage = {
    role: string
    content?: string | null
    tool_call_id?: string
    tool_calls?: Array<{ id?: string; function?: { name?: string } }>
}

function toolResultOk(content: string | null | undefined): boolean {
    if (!content) return false
    if (/"ok"\s*:\s*false/.test(content)) return false
    if (/"ok"\s*:\s*true/.test(content)) return true
    return content.trim().length > 0
}

/** Last outcome per tool name, paired by tool_call_id. */
export function academicToolOutcomes(messages: ToolRoundMessage[] | undefined): Map<string, boolean> {
    const idToName = new Map<string, string>()
    const lastOk = new Map<string, boolean>()
    if (!messages) return lastOk
    for (const message of messages) {
        if (message.role === 'assistant') {
            for (const call of message.tool_calls || []) {
                const name = call.function?.name
                if (call.id && name) idToName.set(call.id, name)
            }
        }
        if (message.role !== 'tool' || !message.tool_call_id) continue
        const name = idToName.get(message.tool_call_id)
        if (!name) continue
        lastOk.set(name, toolResultOk(message.content))
    }
    return lastOk
}

function seedSucceeded(messages: ToolRoundMessage[] | undefined): boolean {
    const outcomes = academicToolOutcomes(messages)
    for (const name of Array.from(ACADEMIC_SEED_TOOLS)) {
        if (outcomes.get(name) === true) return true
    }
    return false
}

/** An assistant turn already happened after a seed result, so the chain was offered. */
export function assistantAfterSeedResult(messages: ToolRoundMessage[] | undefined): boolean {
    if (!messages) return false
    const idToName = new Map<string, string>()
    let seenSeedResult = false
    for (const message of messages) {
        if (message.role === 'assistant') {
            for (const call of message.tool_calls || []) {
                const name = call.function?.name
                if (call.id && name) idToName.set(call.id, name)
            }
            if (seenSeedResult) return true
        }
        if (message.role !== 'tool' || !message.tool_call_id) continue
        const name = idToName.get(message.tool_call_id)
        if (name && ACADEMIC_SEED_TOOLS.has(name)) seenSeedResult = true
    }
    return false
}

/**
 * The round that only writes the answer. The chain round (first decision
 * after papers) still receives follow-up schemas. A later round does not,
 * unless the question named a follow-up that has not run yet.
 * Plan and execute never take this path.
 */
export function shouldOmitResearchWrite(input: {
    mode: AgentMode
    question: string
    messages?: ToolRoundMessage[]
}): boolean {
    if (input.mode !== 'ask' || !isResearchQuestion(input.question)) return false
    const messages = input.messages
    if (!seedSucceeded(messages) || !assistantAfterSeedResult(messages)) return false
    const outcomes = academicToolOutcomes(messages)
    const pending = questionFollowUpNames(input.question).filter((name) => outcomes.get(name) !== true)
    return pending.length === 0
}

export function researchProtocolFor(question: string): string | null {
    return isResearchQuestion(question) ? RESEARCH_TOOL_PROTOCOL : null
}

export function messagesUsedAcademicSeed(
    messages: Array<{ tool_calls?: Array<{ function?: { name?: string } }> }> | undefined
): boolean {
    if (!messages) return false
    for (const message of messages) {
        for (const call of message.tool_calls || []) {
            if (ACADEMIC_SEED_TOOLS.has(call.function?.name || '')) return true
        }
    }
    return false
}

export function selectTurnTools<T extends { function: { name: string } }>(
    tools: T[],
    input: {
        mode: AgentMode
        question: string
        academicFollowUps?: boolean
        messages?: ToolRoundMessage[]
    }
): T[] {
    if (input.mode !== 'ask') return toolsForMode(input.mode, tools)
    if (!isResearchQuestion(input.question)) return tools
    if (seedSucceeded(input.messages)) {
        const outcomes = academicToolOutcomes(input.messages)
        const wanted = new Set<string>([...POST_SEED_TOOLS, ...ACADEMIC_FOLLOWUP_TOOLS])
        if (questionWantsNotebook(input.question)) {
            for (const name of NOTEBOOK_TOOLS) wanted.add(name)
        }
        for (const name of Array.from(ACADEMIC_SEED_TOOLS)) {
            if (outcomes.get(name) === false) wanted.add(name)
        }
        return tools.filter((tool) => wanted.has(tool.function.name))
    }
    const followUps = Boolean(input.academicFollowUps) || questionWantsAcademicFollowUps(input.question)
    return tools.filter((tool) => {
        const name = tool.function.name
        if (!RESEARCH_ALLOW.has(name)) return false
        if (!followUps && (ACADEMIC_FOLLOWUP_TOOLS as readonly string[]).includes(name)) return false
        return true
    })
}
