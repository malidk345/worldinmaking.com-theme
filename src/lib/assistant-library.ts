import type { AssistantNoticeKind, NotebookBrief } from './assistant-notices'

export type Reading = { work: string; hook: string }

const READINGS: Record<string, Reading[]> = {
    nietzsche: [
        { work: 'The Gay Science, §125', hook: 'the madman in the marketplace — not as slogan, but as a problem of who can still hear' },
        { work: 'On the Genealogy of Morality, First Essay', hook: 'the inversion of noble/slave values, useful when a draft moralizes without noticing' },
        { work: 'Schopenhauer as Educator', hook: 'what a teacher is for: not comfort, a higher self the page is trying to become' },
    ],
    marx: [
        { work: 'The German Ideology, part I', hook: 'premises as real individuals, not as concepts floating above them' },
        { work: 'The Eighteenth Brumaire', hook: 'how a present repeats an older costume — good when a notebook restages a fight it has not named' },
        { work: 'Capital I, chapter 1', hook: 'the commodity as a social relation wearing the mask of a thing' },
    ],
    hegel: [
        { work: 'Phenomenology of Spirit, Preface', hook: 'the true is the whole, and a first formulation is only a moment' },
        { work: 'Phenomenology, Lordship and Bondage', hook: 'recognition that has to be worked, not declared' },
        { work: 'Science of Logic, Being–Nothing–Becoming', hook: 'a determination that cannot sit still' },
    ],
    sartre: [
        { work: 'Being and Nothingness, Part IV', hook: 'the project as the shape of a freedom already underway' },
        { work: 'What is Literature?', hook: 'why a sentence is already an act, not a private mood' },
        { work: 'Existentialism is a Humanism', hook: 'the short public version — use it only to see what the notebook is still hedging' },
    ],
    heidegger: [
        { work: 'Being and Time, §§27–38', hook: 'idle talk, curiosity, ambiguity — the ways a subject is covered over' },
        { work: 'The Origin of the Work of Art', hook: 'how a work opens a world rather than representing one' },
        { work: 'Building Dwelling Thinking', hook: 'what it is to stay with a thing instead of surveying it' },
    ],
    deleuze: [
        { work: 'Difference and Repetition, ch. 1', hook: 'difference in itself, against a model the draft is still copying' },
        { work: 'A Thousand Plateaus, “Rhizome”', hook: 'a map instead of a tracing — useful when the notebook has one root' },
        { work: 'Spinoza: Practical Philosophy', hook: 'what a body can do, said without moral theatre' },
    ],
    spinoza: [
        { work: 'Ethics II, propositions 40–47', hook: 'three kinds of knowledge, and which one the page is actually using' },
        { work: 'Treatise on the Emendation of the Intellect', hook: 'method as the repair of a mind, not a mood' },
        { work: 'Ethics IV, preface', hook: 'human bondage named as cause, not as vice' },
    ],
    baudrillard: [
        { work: 'Simulacra and Simulation, “The Precession of Simulacra”', hook: 'when the copy no longer has an original to betray' },
        { work: 'The Gulf War Did Not Take Place', hook: 'an event that is consumed as image before it is undergone' },
        { work: 'Symbolic Exchange and Death', hook: 'what cannot be made equivalent, and why a draft keeps trying' },
    ],
    althusser: [
        { work: 'Ideology and Ideological State Apparatuses', hook: 'interpellation — the hail that makes a subject before the sentence starts' },
        { work: 'For Marx, “Contradiction and Overdetermination”', hook: 'a cause that is never one cause' },
        { work: 'Reading Capital, part I', hook: 'a symptomatic reading: what the text cannot say in order to say what it says' },
    ],
    derrida: [
        { work: 'Of Grammatology, part I', hook: 'the supplement that a clean argument needs and disowns' },
        { work: 'Différance', hook: 'the delay inside a word the notebook treats as settled' },
        { work: 'Plato’s Pharmacy', hook: 'writing as poison and cure — useful when a draft wants to be speech' },
    ],
    weber: [
        { work: 'Science as a Vocation', hook: 'what an intellectual claim can and cannot do once the gods have left' },
        { work: 'Politics as a Vocation', hook: 'ethic of responsibility against the ethic of conviction' },
        { work: 'The Protestant Ethic, ch. 2', hook: 'a spirit of work that has forgotten why it works' },
    ],
    adorno: [
        { work: 'Minima Moralia, part I', hook: 'damaged life in small forms — closer to a notebook than a system' },
        { work: 'The Essay as Form', hook: 'why a thought that will not close is not a failure of method' },
        { work: 'Aesthetic Theory, “Situation”', hook: 'art that still hurts, against the administered smoothness of a finished paragraph' },
    ],
    zizek: [
        { work: 'The Sublime Object of Ideology, ch. 1', hook: 'the symptom the draft enjoys while exposing it' },
        { work: 'The Plague of Fantasies, “The Seven Veils of Fantasy”', hook: 'what must remain unseen for the scene to work' },
        { work: 'How to Read Lacan, ch. 3', hook: 'the short version of the big Other the notebook is still writing to' },
    ],
    lenin: [
        { work: 'What Is to Be Done?, §§', hook: 'from a mood to an organisation of the next step' },
        { work: 'The State and Revolution, ch. 1', hook: 'what a state is for, against the wish that it simply fade' },
        { work: 'Imperialism, the Highest Stage of Capitalism', hook: 'a concrete map of force, not a general complaint' },
    ],
    arendt: [
        { work: 'The Human Condition, ch. V', hook: 'action as appearing among others, not as inner resolve' },
        { work: 'Between Past and Future, “The Crisis in Education”', hook: 'what is conserved so that something new can begin' },
        { work: 'Eichmann in Jerusalem, the postscript', hook: 'thoughtlessness as a political fact, not a private failing' },
    ],
    rand: [
        { work: 'Introduction to Objectivist Epistemology, ch. 1–2', hook: 'concept-formation — whether the draft is naming or borrowing' },
        { work: 'The Romantic Manifesto, “The Psycho-Epistemology of Art”', hook: 'what a work is for if it is not a request for permission' },
        { work: 'Atlas Shrugged, Francisco’s money speech', hook: 'a value stated without apology — use it as a test, not as scripture' },
    ],
}

function clip(text: string, n = 180): string {
    const plain = String(text || '')
        .replace(/[#>*_`[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    if (plain.length <= n) return plain
    return `${plain.slice(0, n).replace(/\s+\S*$/, '')}…`
}

export function compactNoticeText(raw: string, max = 1400): string {
    return String(raw || '')
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max)
}

export function pickReading(philosopherId: string, cursor = 0): Reading {
    const list = READINGS[philosopherId] || READINGS.nietzsche
    return list[Math.abs(cursor) % list.length]
}

export function composeNotebookNotice(
    philosopherId: string,
    notebooks: NotebookBrief[],
    cursor = 0
): { kind: AssistantNoticeKind; title: string; body: string; notebookId?: string } {
    const reading = pickReading(philosopherId, cursor)
    const latest = notebooks[0]
    const other = notebooks[1]

    if (!latest) {
        return {
            kind: 'reading',
            title: `A place to start: ${reading.work}`,
            body: compactNoticeText(
                `${reading.work} is worth having open while you begin. ${reading.hook.charAt(0).toUpperCase()}${reading.hook.slice(1)}.\n\nWhen a notebook exists, I will read it and send something that belongs to that page — not a reminder to write.`
            ),
        }
    }

    const snippet = clip(latest.content, 160)
    const connect = other
        ? `\n\nIt also sits next to “${other.title}”. The two pages are doing related work and have not yet been made to answer each other.`
        : ''

    if (cursor % 3 === 1 && other) {
        return {
            kind: 'suggestion',
            title: `“${latest.title}” and “${other.title}” are still two files`,
            body: compactNoticeText(
                `I read both. “${latest.title}” ${snippet ? `opens on “${snippet}”` : 'is still finding its object'}. “${other.title}” is running a second argument alongside it.\n\nA useful next move is one paragraph that states the disagreement between them, even if you later throw the paragraph away.\n\nCompanion: *${reading.work}* — ${reading.hook}.${connect}`
            ),
            notebookId: latest.id,
        }
    }

    if (cursor % 3 === 2) {
        return {
            kind: 'question',
            title: `What is “${latest.title}” refusing to decide?`,
            body: compactNoticeText(
                `${snippet ? `The line I keep returning to: “${snippet}”` : `“${latest.title}” is still circling.`} That is not a defect. It is the place the argument has not yet chosen.\n\nIf you answer in the margin, make it one sentence. I will send a reading that meets that sentence rather than another general note.\n\n*${reading.work}* is the text I would put beside this page — ${reading.hook}.`
            ),
            notebookId: latest.id,
        }
    }

    return {
        kind: 'reading',
        title: `On “${latest.title}”: ${reading.work}`,
        body: compactNoticeText(
            `I read “${latest.title}”. ${snippet ? `This is the stretch that is doing the work: “${snippet}”` : 'The page is still gathering its object, which is already a beginning.'}\n\n*${reading.work}* belongs next to it — ${reading.hook}. Not as homework. As a second voice in the same room.\n\nIf a sentence in the notebook is already doing what that text does, mark it. If not, the gap is the next paragraph.${connect}`
        ),
        notebookId: latest.id,
    }
}
