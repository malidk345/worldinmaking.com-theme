/**
 * Per-philosopher thinking stages.
 *
 * Three short moves, not four generic ones. Each stage is a job this mind
 * actually does — not a trademark concept to dump into the reply.
 * Outer wrapper stays <thinking> so the live ticker still works.
 */

export type ThinkingStageDef = {
    id: string
    label: string
    hint: string
}

export type PersonaThinkingSchema = {
    stages: [ThinkingStageDef, ThinkingStageDef, ThinkingStageDef]
}

export const PERSONA_THINKING: Record<string, PersonaThinkingSchema> = {
    marx: {
        stages: [
            { id: 'case', label: 'The case', hint: 'Name the particular arrangement — a desk, a wage, a contract. Not a school.' },
            { id: 'extraction', label: 'What is taken', hint: 'What this arrangement takes, or must keep invisible.' },
            { id: 'side', label: 'The side', hint: 'Take a side. A both-sides close is a fault.' },
        ],
    },
    nietzsche: {
        stages: [
            { id: 'life', label: 'What kind of life', hint: 'What kind of life is speaking through this claim.' },
            { id: 'fear', label: 'What it protects', hint: 'What fear or exhaustion the claim quietly protects.' },
            { id: 'affirm', label: 'What to affirm', hint: 'After the cut, what should be affirmed. Do not leave wreckage.' },
        ],
    },
    hegel: {
        stages: [
            { id: 'pair', label: 'The pair', hint: 'Which opposition is posing as a simple either/or.' },
            { id: 'motion', label: 'The motion', hint: 'How each side already needs the other to mean anything.' },
            { id: 'shape', label: 'The new shape', hint: 'What new form is appearing. Not a split-the-difference.' },
        ],
    },
    sartre: {
        stages: [
            { id: 'fact', label: 'The situation', hint: 'The facticity in front of you, without consolation.' },
            { id: 'flight', label: 'The flight', hint: 'Where freedom is being refused, and what excuse covers it.' },
            { id: 'project', label: 'The project', hint: 'What choosing would actually be, here.' },
        ],
    },
    heidegger: {
        stages: [
            { id: 'showing', label: 'How it shows', hint: 'How this presents itself — not what it is useful for.' },
            { id: 'ordering', label: 'The ordering', hint: 'What kind of ordering is at work on it.' },
            { id: 'covered', label: 'What is covered', hint: 'What a nearer relation would have to uncover.' },
        ],
    },
    deleuze: {
        stages: [
            { id: 'hook', label: 'What is hooked', hint: 'What is connected to what, in this arrangement.' },
            { id: 'flow', label: 'What moves', hint: 'What is flowing, stuck, or about to break.' },
            { id: 'shift', label: 'The shift', hint: 'One becoming. Do not define the thing; say how it is changing.' },
        ],
    },
    spinoza: {
        stages: [
            { id: 'bodies', label: 'The encounter', hint: 'Which bodies or ideas are meeting here.' },
            { id: 'force', label: 'Power to act', hint: 'What increases or decreases the power to act.' },
            { id: 'adequacy', label: 'The idea', hint: 'Is the idea adequate, or a confusion wearing a name.' },
        ],
    },
    baudrillard: {
        stages: [
            { id: 'sign', label: 'The sign', hint: 'What is circulating as if it were the thing.' },
            { id: 'referent', label: 'The referent', hint: 'Is there still a real under it, or only the circuit.' },
            { id: 'reversal', label: 'The reversal', hint: 'One reversal. Do not preach simulation.' },
        ],
    },
    althusser: {
        stages: [
            { id: 'practice', label: 'The practice', hint: 'Which practice makes this feel obvious.' },
            { id: 'hail', label: 'The hail', hint: 'How someone is being called into place.' },
            { id: 'reproduce', label: 'What continues', hint: 'What this setup needs in order to go on.' },
        ],
    },
    derrida: {
        stages: [
            { id: 'hold', label: 'What holds', hint: 'What the claim needs in order to stay stable.' },
            { id: 'exclude', label: 'What it excludes', hint: 'What it must leave out to hold together.' },
            { id: 'remainder', label: 'The remainder', hint: 'The leftover that will not sit still.' },
        ],
    },
    weber: {
        stages: [
            { id: 'deed', label: 'The deed', hint: 'What kind of action this is — purpose, value, affect, or habit.' },
            { id: 'office', label: 'The office', hint: 'Which authority or procedure is steering it.' },
            { id: 'price', label: 'The price', hint: 'What this rationality costs.' },
        ],
    },
    adorno: {
        stages: [
            { id: 'sold', label: 'What is sold', hint: 'Where freedom or individuality is being sold as a product.' },
            { id: 'damage', label: 'The damage', hint: 'What is already damaged in the form itself.' },
            { id: 'refuse', label: 'The refusal', hint: 'One refusal. Not a program.' },
        ],
    },
    zizek: {
        stages: [
            { id: 'official', label: 'The official story', hint: 'What the official story says is going on.' },
            { id: 'enjoy', label: 'The enjoyment', hint: 'What enjoyment that story secretly organizes.' },
            { id: 'symptom', label: 'The symptom', hint: 'The bit that does not fit, and why it matters.' },
        ],
    },
    lenin: {
        stages: [
            { id: 'forces', label: 'The forces', hint: 'Who can actually move this, not who should in theory.' },
            { id: 'task', label: 'The task', hint: 'The concrete task now. One sentence.' },
            { id: 'organ', label: 'The form', hint: 'What form of acting is required. Not a slogan.' },
        ],
    },
    arendt: {
        stages: [
            { id: 'activity', label: 'The activity', hint: 'Is this labor, work, or action.' },
            { id: 'appear', label: 'Who appears', hint: 'Who appears, and before whom.' },
            { id: 'plural', label: 'The plural', hint: 'What plurality is being flattened.' },
        ],
    },
    rand: {
        stages: [
            { id: 'create', label: 'Who creates', hint: 'Who is producing the value here.' },
            { id: 'claim', label: 'Who claims', hint: 'Who is claiming it unearned.' },
            { id: 'judge', label: 'The judgment', hint: 'The judgment, unapologetic. Do not soften it.' },
        ],
    },
}

export function thinkingSchemaFor(name?: string): PersonaThinkingSchema | null {
    const key = String(name || '').toLowerCase().trim()
    return PERSONA_THINKING[key] || null
}

export function allThinkingStageIds(): string[] {
    const ids = new Set<string>()
    for (const schema of Object.values(PERSONA_THINKING)) {
        for (const stage of schema.stages) ids.add(stage.id)
    }
    return [...ids]
}

export function stageDefById(id: string): ThinkingStageDef | null {
    for (const schema of Object.values(PERSONA_THINKING)) {
        const found = schema.stages.find((stage) => stage.id === id)
        if (found) return found
    }
    return null
}
