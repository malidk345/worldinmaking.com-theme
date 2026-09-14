/**
 * Curated Canonical Philosophical Corpus & Verified Citation Engine.
 * Provides authentic, verified text fragments, section citations, and aphorism references
 * from primary texts to ground philosophical RAG without LLM hallucination.
 */

export interface CanonicalCitation {
    thinker: string
    thinkerSlug: 'nietzsche' | 'spinoza' | 'kant' | 'schopenhauer' | 'marcus_aurelius' | 'plato' | 'aristotle' | 'camus' | 'kierkegaard'
    work: string
    section: string
    fragment: string
    keyThemes: string[]
    originalContext?: string
}

export const PHILOSOPHICAL_CANON: CanonicalCitation[] = [
    // --- Friedrich Nietzsche ---
    {
        thinker: 'Friedrich Nietzsche',
        thinkerSlug: 'nietzsche',
        work: 'Beyond Good and Evil',
        section: 'Aphorism 146',
        fragment: 'He who fights with monsters might take care lest he thereby become a monster. And if you gaze for long into an abyss, the abyss gazes also into you.',
        keyThemes: ['abyss', 'monsters', 'psychology', 'self-overcoming', 'danger', 'morality'],
        originalContext: 'Epigrams and Interludes (Jenseits von Gut und Böse)',
    },
    {
        thinker: 'Friedrich Nietzsche',
        thinkerSlug: 'nietzsche',
        work: 'The Gay Science',
        section: 'Book IV, Aphorism 341',
        fragment: 'What if some day or night a demon were to steal after you into your loneliest loneliness and say to you: "This life as you now live it and have lived it, you will have to live once more and innumerable times more..." Would you not throw yourself down and gnash your teeth and curse the demon? Or have you once experienced a tremendous moment when you would have answered: "You are a god and never have I heard anything more divine."',
        keyThemes: ['eternal recurrence', 'amor fati', 'demon', 'heaviest burden', 'affirmation of life'],
        originalContext: 'The Greatest Weight (Das größte Schwergewicht)',
    },
    {
        thinker: 'Friedrich Nietzsche',
        thinkerSlug: 'nietzsche',
        work: 'The Gay Science',
        section: 'Book III, Aphorism 125',
        fragment: 'God is dead. God remains dead. And we have killed him. How shall we comfort ourselves, the murderers of all murderers? What was holiest and mightiest of all that the world has yet owned has bled to death under our knives: who will wipe this blood off us?',
        keyThemes: ['death of god', 'madman', 'nihilism', 'secularization', 'modernity', 'values'],
        originalContext: 'The Parable of the Madman',
    },
    {
        thinker: 'Friedrich Nietzsche',
        thinkerSlug: 'nietzsche',
        work: 'Thus Spoke Zarathustra',
        section: 'Prologue, §4',
        fragment: 'Man is a rope, tied between beast and Übermensch — a rope over an abyss. A dangerous across, a dangerous on-the-way, a dangerous looking-back, a dangerous shuddering and stopping. What is great in man is that he is a bridge and not an end: what can be loved in man is that he is an overture and a going under.',
        keyThemes: ['ubermensch', 'overman', 'bridge', 'abyss', 'evolution', 'striving'],
        originalContext: 'Zarathustra’s first address to the marketplace in the town The Motley Cow.',
    },
    {
        thinker: 'Friedrich Nietzsche',
        thinkerSlug: 'nietzsche',
        work: 'Twilight of the Idols',
        section: 'Maxims and Arrows, §8',
        fragment: 'Out of life’s school of war: what does not destroy me, makes me stronger.',
        keyThemes: ['resilience', 'strength', 'suffering', 'adversity', 'growth'],
        originalContext: 'Sprueche und Pfeile',
    },
    {
        thinker: 'Friedrich Nietzsche',
        thinkerSlug: 'nietzsche',
        work: 'On the Genealogy of Morality',
        section: 'First Essay, §13',
        fragment: 'To demand of strength that it should not express itself as strength, that it should not be a desire to overcome, a desire to cast down, a desire to become master, a thirst for enemies and resistances and triumphs, is just as absurd as to demand of weakness that it should express itself as strength.',
        keyThemes: ['master morality', 'slave morality', 'ressentiment', 'will to power', 'birds of prey'],
        originalContext: 'The Lambs and the Birds of Prey',
    },

    // --- Baruch Spinoza ---
    {
        thinker: 'Baruch Spinoza',
        thinkerSlug: 'spinoza',
        work: 'Ethics',
        section: 'Part I, Proposition 14',
        fragment: 'Except God, no substance can be or be conceived. (Praeter Deum nulla dari neque concipi potest substantia.)',
        keyThemes: ['substance', 'monism', 'pantheism', 'god or nature', 'deus sive natura'],
        originalContext: 'Of God (De Deo)',
    },
    {
        thinker: 'Baruch Spinoza',
        thinkerSlug: 'spinoza',
        work: 'Ethics',
        section: 'Part III, Proposition 6',
        fragment: 'Each thing, in so far as it is in itself, endeavors to persist in its own being. (Unaquaeque res, quantum in se est, in suo esse perseverare conatur.)',
        keyThemes: ['conatus', 'striving', 'self-preservation', 'desire', 'essence'],
        originalContext: 'Of the Origin and Nature of the Affects',
    },
    {
        thinker: 'Baruch Spinoza',
        thinkerSlug: 'spinoza',
        work: 'Ethics',
        section: 'Part V, Proposition 42',
        fragment: 'Blessedness is not the reward of virtue, but virtue itself; neither do we enjoy it because we restrain our lusts; on the contrary, because we enjoy it, we are able to restrain them.',
        keyThemes: ['blessedness', 'beatitudo', 'virtue', 'freedom', 'intellectual love of god', 'amor dei intellectualis'],
        originalContext: 'Of the Power of the Intellect, or of Human Freedom',
    },
    {
        thinker: 'Baruch Spinoza',
        thinkerSlug: 'spinoza',
        work: 'Ethics',
        section: 'Part II, Proposition 7',
        fragment: 'The order and connection of ideas is the same as the order and connection of things. (Ordo et connexio idearum idem est ac ordo et connexio rerum.)',
        keyThemes: ['parallelism', 'mind and body', 'dual-aspect monism', 'epistemology', 'determinism'],
        originalContext: 'Of the Nature and Origin of the Mind',
    },

    // --- Immanuel Kant ---
    {
        thinker: 'Immanuel Kant',
        thinkerSlug: 'kant',
        work: 'Critique of Practical Reason',
        section: 'Conclusion, 5:161',
        fragment: 'Two things fill the mind with ever new and increasing admiration and awe, the more often and steadily we reflect upon them: the starry heavens above me and the moral law within me.',
        keyThemes: ['moral law', 'starry heavens', 'awe', 'categorical imperative', 'duty', 'sublime'],
        originalContext: 'Kritik der praktischen Vernunft (Beschluss)',
    },
    {
        thinker: 'Immanuel Kant',
        thinkerSlug: 'kant',
        work: 'Groundwork of the Metaphysics of Morals',
        section: 'Chapter 2, 4:421',
        fragment: 'Act only according to that maxim whereby you can at the same time will that it should become a universal law.',
        keyThemes: ['categorical imperative', 'universal law', 'deontology', 'maxim', 'duty'],
        originalContext: 'Formula of Universal Law (Grundlegung zur Metaphysik der Sitten)',
    },
    {
        thinker: 'Immanuel Kant',
        thinkerSlug: 'kant',
        work: 'Groundwork of the Metaphysics of Morals',
        section: 'Chapter 2, 4:429',
        fragment: 'Act in such a way that you treat humanity, whether in your own person or in the person of any other, never merely as a means to an end, but always at the same time as an end.',
        keyThemes: ['humanity as an end', 'dignity', 'autonomy', 'formula of humanity', 'ethics'],
        originalContext: 'Formula of the End in Itself',
    },
    {
        thinker: 'Immanuel Kant',
        thinkerSlug: 'kant',
        work: 'Critique of Pure Reason',
        section: 'Introduction, B1',
        fragment: 'There can be no doubt that all our knowledge begins with experience... But though all our knowledge begins with experience, it by no means follows that all arises out of experience.',
        keyThemes: ['a priori', 'a posteriori', 'synthetic a priori', 'experience', 'transcendental idealism'],
        originalContext: 'Kritik der reinen Vernunft (B-Edition Introduction)',
    },

    // --- Arthur Schopenhauer ---
    {
        thinker: 'Arthur Schopenhauer',
        thinkerSlug: 'schopenhauer',
        work: 'The World as Will and Representation',
        section: 'Volume 1, §1',
        fragment: 'The world is my representation: this is a truth valid in reference to every creature that lives and knows, though man alone can bring it into reflective, abstract consciousness.',
        keyThemes: ['representation', 'vorstellung', 'idealism', 'epistemology', 'subject and object'],
        originalContext: 'Die Welt als Wille und Vorstellung, Book 1',
    },
    {
        thinker: 'Arthur Schopenhauer',
        thinkerSlug: 'schopenhauer',
        work: 'The World as Will and Representation',
        section: 'Volume 1, §57',
        fragment: 'Life swings like a pendulum to and fro between pain and boredom, and these two are in fact its ultimate constituents.',
        keyThemes: ['pessimism', 'pendulum', 'will', 'suffering', 'desire', 'boredom'],
        originalContext: 'The vanity and suffering of life under the blind Will',
    },
    {
        thinker: 'Arthur Schopenhauer',
        thinkerSlug: 'schopenhauer',
        work: 'The World as Will and Representation',
        section: 'Volume 1, §68',
        fragment: 'If a man is constantly aware of the suffering of all that lives, and makes the suffering of others his own, he must arrive at the denial of the will to live; the phenomenon of asceticism and quietism then appears.',
        keyThemes: ['denial of will', 'asceticism', 'compassion', 'mitleid', 'salvation', 'quietism'],
        originalContext: 'Ethical transition from egoism to saintliness',
    },

    // --- Marcus Aurelius ---
    {
        thinker: 'Marcus Aurelius',
        thinkerSlug: 'marcus_aurelius',
        work: 'Meditations',
        section: 'Book IV, §3',
        fragment: 'Men seek retreats for themselves, houses in the country, sea-shores, and mountains... But this is wholly the mark of a most common sort of men, since it is in your power whenever you will to retire into yourself. For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul.',
        keyThemes: ['inner citadel', 'stoicism', 'tranquility', 'retreat', 'mind', 'ataraxia'],
        originalContext: 'The Inner Citadel (Ta Eis Heauton)',
    },
    {
        thinker: 'Marcus Aurelius',
        thinkerSlug: 'marcus_aurelius',
        work: 'Meditations',
        section: 'Book II, §1',
        fragment: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own...',
        keyThemes: ['morning meditation', 'human nature', 'duty', 'patience', 'cosmopolitanism'],
        originalContext: 'Daily philosophical preparation',
    },
    {
        thinker: 'Marcus Aurelius',
        thinkerSlug: 'marcus_aurelius',
        work: 'Meditations',
        section: 'Book VIII, §47',
        fragment: 'If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.',
        keyThemes: ['perception', 'judgment', 'dichotomy of control', 'epictetus', 'mental freedom'],
        originalContext: 'Reframing external obstacles',
    },

    // --- Plato ---
    {
        thinker: 'Plato',
        thinkerSlug: 'plato',
        work: 'The Republic',
        section: 'Book VII, 514a–517c',
        fragment: 'Behold! human beings living in an underground cave, which has a mouth open towards the light and reaching all along the cave; here they have been from their childhood, and have their legs and necks chained so that they cannot move, and can only see before them, being prevented by the chains from turning round their heads.',
        keyThemes: ['allegory of the cave', 'forms', 'shadows', 'truth', 'enlightenment', 'education'],
        originalContext: 'Allegory of the Cave (Socrates speaking to Glaucon)',
    },
    {
        thinker: 'Plato',
        thinkerSlug: 'plato',
        work: 'Apology',
        section: '38a',
        fragment: 'The unexamined life is not worth living for a human being. (ho de anexetastos bios ou biōtos anthrōpōi)',
        keyThemes: ['unexamined life', 'socrates', 'virtue', 'philosophy', 'self-inquiry'],
        originalContext: 'Socrates’ speech at his trial in Athens',
    },

    // --- Aristotle ---
    {
        thinker: 'Aristotle',
        thinkerSlug: 'aristotle',
        work: 'Nicomachean Ethics',
        section: 'Book I, 1097b',
        fragment: 'Happiness (eudaimonia), then, is something final and self-sufficient, and is the end of action. We call that which is in itself worthy of pursuit more final than that which is worthy of pursuit for the sake of something else.',
        keyThemes: ['eudaimonia', 'flourishing', 'highest good', 'teleology', 'virtue ethics'],
        originalContext: 'Definition of human flourishing',
    },
    {
        thinker: 'Aristotle',
        thinkerSlug: 'aristotle',
        work: 'Nicomachean Ethics',
        section: 'Book II, 1106b',
        fragment: 'Virtue, then, is a state of character concerned with choice, lying in a mean, i.e. the mean relative to us, this being determined by reason, and by that reason by which the man of practical wisdom would determine it.',
        keyThemes: ['doctrine of the mean', 'golden mean', 'virtue', 'phronesis', 'practical wisdom'],
        originalContext: 'Virtue as the intermediate between excess and deficiency',
    },

    // --- Albert Camus ---
    {
        thinker: 'Albert Camus',
        thinkerSlug: 'camus',
        work: 'The Myth of Sisyphus',
        section: 'Chapter 1',
        fragment: 'There is but one truly serious philosophical problem, and that is suicide. Judging whether life is or is not worth living amounts to answering the fundamental question of philosophy.',
        keyThemes: ['absurd', 'suicide', 'meaning of life', 'existentialism', 'lucidity'],
        originalContext: 'An Absurd Reasoning (Le Mythe de Sisyphe)',
    },
    {
        thinker: 'Albert Camus',
        thinkerSlug: 'camus',
        work: 'The Myth of Sisyphus',
        section: 'The Myth of Sisyphus (Conclusion)',
        fragment: 'One must imagine Sisyphus happy. The struggle itself toward the heights is enough to fill a man\'s heart.',
        keyThemes: ['sisyphus', 'revolt', 'defiance', 'happiness', 'absurd hero', 'rock'],
        originalContext: 'Conclusion of The Myth of Sisyphus',
    },

    // --- Søren Kierkegaard ---
    {
        thinker: 'Søren Kierkegaard',
        thinkerSlug: 'kierkegaard',
        work: 'Fear and Trembling',
        section: 'Problemata I',
        fragment: 'Faith is precisely the paradox that the single individual is higher than the universal, though in such a way that the movement is repeated, so that after the single individual has been in the universal, he now as the single individual isolates himself as higher than the universal.',
        keyThemes: ['knight of faith', 'teleological suspension of the ethical', 'abraham', 'paradox', 'anxiety'],
        originalContext: 'Under the pseudonym Johannes de silentio',
    },
    {
        thinker: 'Søren Kierkegaard',
        thinkerSlug: 'kierkegaard',
        work: 'The Concept of Anxiety',
        section: 'Chapter V',
        fragment: 'Anxiety is the dizziness of freedom, which emerges when the spirit wants to posit the synthesis and freedom looks down into its own possibility, laying hold of finiteness to support itself.',
        keyThemes: ['anxiety', 'dread', 'angst', 'freedom', 'possibility', 'dizziness'],
        originalContext: 'Begrebet Angest (Vigilius Haufniensis)',
    },
]

export interface CorpusSearchResult {
    query: string
    thinkerFilter?: string
    workFilter?: string
    count: number
    matches: Array<{
        thinker: string
        work: string
        section: string
        fragment: string
        relevance: number
        context?: string
    }>
}

export function searchPhilosophicalCorpus(
    query: string,
    options?: { thinker?: string; work?: string; limit?: number }
): CorpusSearchResult {
    const rawQuery = String(query || '').trim().toLowerCase()
    const queryTokens = rawQuery.split(/\s+/).filter((t) => t.length > 1)
    const thinkerFilter = options?.thinker && options.thinker !== 'all' ? options.thinker.toLowerCase().replace(/[\s_-]+/g, '') : undefined
    const workFilter = options?.work ? options.work.toLowerCase().trim() : undefined
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 10) : 4

    const scored = PHILOSOPHICAL_CANON.map((entry) => {
        if (thinkerFilter) {
            const entrySlug = entry.thinkerSlug.replace(/_/g, '')
            const entryName = entry.thinker.toLowerCase().replace(/[\s_-]+/g, '')
            if (!entrySlug.includes(thinkerFilter) && !entryName.includes(thinkerFilter)) {
                return null
            }
        }

        if (workFilter) {
            const entryWork = entry.work.toLowerCase()
            if (!entryWork.includes(workFilter)) {
                return null
            }
        }

        let score = 0
        const haystack = `${entry.thinker} ${entry.work} ${entry.section} ${entry.fragment} ${entry.keyThemes.join(' ')} ${entry.originalContext || ''}`.toLowerCase()

        if (haystack.includes(rawQuery)) {
            score += 10
        }

        for (const token of queryTokens) {
            if (entry.keyThemes.some((t) => t.includes(token))) score += 4
            if (entry.work.toLowerCase().includes(token)) score += 3
            if (entry.fragment.toLowerCase().includes(token)) score += 2
            if (entry.thinker.toLowerCase().includes(token)) score += 2
        }

        return score > 0 ? { entry, score } : null
    }).filter(Boolean) as Array<{ entry: CanonicalCitation; score: number }>

    scored.sort((a, b) => b.score - a.score)
    const selected = scored.slice(0, limit)

    return {
        query,
        thinkerFilter: options?.thinker,
        workFilter: options?.work,
        count: selected.length,
        matches: selected.map(({ entry, score }) => ({
            thinker: entry.thinker,
            work: entry.work,
            section: entry.section,
            fragment: entry.fragment,
            relevance: score,
            context: entry.originalContext,
        })),
    }
}
