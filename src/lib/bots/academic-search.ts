/**
 * Live Academic Corpus Search for WorldInMaking AI.
 *
 * Fans out to OpenAlex, Crossref, Semantic Scholar, arXiv, PubMed Central,
 * Europe PMC, TR Dizin, CORE and DOAJ (plus SEP / IEP encyclopedia lookup for
 * philosophy), merges duplicates, fuses per-source ranks (reciprocal rank
 * fusion + a minimum relevance threshold), and resolves open-access PDFs via
 * Unpaywall. Turkish `queryOriginal` is sent to TR Dizin / Crossref / OpenAlex
 * (language:tr), English `query` to the rest. Results are shared across users
 * via the Cloudflare Cache API when available. Every source reports a status (ok / failed / skipped + reason) so
 * the model can tell "search was unavailable" apart from "no literature".
 *
 * Optional API keys (read at request time from the Cloudflare Pages / process
 * env via runtime-env — never logged):
 *   OPENALEX_API_KEY          → OpenAlex `api_key` query param
 *   SEMANTIC_SCHOLAR_API_KEY  → Semantic Scholar `x-api-key` header
 *   NCBI_API_KEY              → NCBI E-utilities `api_key` query param
 *   ACADEMIC_CONTACT_EMAIL    → polite-pool contact (Crossref / Unpaywall / NCBI)
 * Everything still works (degraded) without keys.
 */

import { searchPhilosophicalCorpus } from './tools/philosophical-corpus'
import type { EnvStore } from './runtime-env'
import { searchFetchSignal } from './web-search'
import {
    AcademicSourceError,
    NON_LETTER_DIGIT_RE,
    NON_LETTER_DIGIT_SPLIT_RE,
    QUERY_JUNK_RE,
    TOKEN_JUNK_RE,
    __resetCooldownsForTests,
    abortError,
    assertAcademicNotAborted,
    cleanDoi,
    clipText,
    createSerialQueue,
    decodeEntities,
    doiUrl,
    fetchAcademic,
    foldText,
    isPdfLike,
    looksTurkish,
    mapWithConcurrency,
    pickOaPdfUrl,
    readJson,
    readText,
    resolveAcademicApiKeys,
    s2Queue,
    stripTags,
    truncateAtWord,
    userAgent,
    type AcademicApiKeys,
    type AcademicSourceReason,
} from './academic-common'
import { coreQueue, doajQueue, queryCore, queryDoaj, queryTrDizin } from './academic-sources-extra'
import {
    ENCYCLOPEDIA_NAMES,
    filterRelevantEntries,
    searchIep,
    searchSep,
    type EncyclopediaEntry,
} from './academic-encyclopedia'
import {
    ACADEMIC_DOI_MISS_TTL_S,
    ACADEMIC_DOI_TTL_S,
    ACADEMIC_PARTIAL_TTL_S,
    ACADEMIC_SEARCH_TTL_S,
    academicCacheGet,
    academicCachePut,
} from './academic-cache'

export {
    AcademicSourceError,
    DEFAULT_ACADEMIC_CONTACT_EMAIL,
    cleanDoi,
    foldText,
    looksTurkish,
    resolveAcademicApiKeys,
    retryDelayFromHeader,
} from './academic-common'
export type { AcademicApiKeys, AcademicSourceReason } from './academic-common'
export type { EncyclopediaEntry } from './academic-encyclopedia'

export type AcademicSourceLabel =
    | 'OpenAlex'
    | 'Crossref'
    | 'ArXiv'
    | 'Semantic Scholar'
    | 'PMC / PubMed'
    | 'Europe PMC'
    | 'TR Dizin'
    | 'CORE'
    | 'DOAJ'
    | 'Philosophical Canon'
    | 'Web Search'

export interface AcademicPaper {
    id: string
    title: string
    authors: string[]
    year?: number
    venue?: string
    citationCount: number
    doi?: string
    pdfUrl?: string
    /** Landing page (never stored in `doi`). */
    url?: string
    abstract?: string
    /** OpenAlex topics / Crossref subjects (OpenAlex `concepts` is deprecated). */
    topics?: string[]
    /** ISO 639-1 language when the source reports one. */
    language?: string
    /** Source work type (article, book, book-chapter, …) when reported. */
    type?: string
    isOpenAccess?: boolean
    source: AcademicSourceLabel
    /** Every source that returned this work (after duplicate merge). */
    sources?: AcademicSourceLabel[]
    score?: number
    /** 1-based rank per result list (e.g. `openalex`, `openalex:tr`) — input to rank fusion. */
    ranks?: Record<string, number>
    /** Query-term coverage 0..1 (max over English / original phrasing). */
    relevance?: number
}

export type AcademicWorkType = 'article' | 'book' | 'book-chapter' | 'review' | 'preprint' | 'dissertation'
export const ACADEMIC_WORK_TYPES: readonly AcademicWorkType[] = [
    'article',
    'book',
    'book-chapter',
    'review',
    'preprint',
    'dissertation',
]

export interface AcademicSearchOptions {
    limit?: number
    field?: string
    yearFrom?: number
    yearTo?: number
    sortBy?: 'citations' | 'recent' | 'relevance'
    openAccessOnly?: boolean
    /** ISO 639-1 code, e.g. 'tr', 'en'. */
    language?: string
    type?: AcademicWorkType
    /** User's original-language phrasing (e.g. Turkish) — sent to TR Dizin / Crossref / OpenAlex(lang). */
    queryOriginal?: string
    /** Skip the shared Cache API lookup/store. */
    noCache?: boolean
    /** Request env (Cloudflare bindings). Falls back to getRuntimeEnv(). */
    env?: EnvStore
}

export type AcademicSourceId =
    | 'openalex'
    | 'crossref'
    | 'semantic_scholar'
    | 'arxiv'
    | 'pubmed'
    | 'europepmc'
    | 'trdizin'
    | 'core'
    | 'doaj'
    | 'sep'
    | 'iep'

export interface AcademicSourceStatus {
    source: AcademicSourceId
    status: 'ok' | 'failed' | 'skipped'
    reason?: AcademicSourceReason
    httpStatus?: number
    count: number
    ms: number
    /** Whether an API key was sent (never the key itself). */
    keyed?: boolean
    /** Query variant language when a source ran on the original (e.g. Turkish) phrasing. */
    lang?: string
}

export interface AcademicSearchResult {
    ok: boolean
    query: string
    total: number
    papers: AcademicPaper[]
    formatted: string
    bibliography?: string
    error?: string
    /** True when at least one attempted source failed. */
    degraded?: boolean
    /** True when every attempted scholarly source failed. */
    allSourcesFailed?: boolean
    sources?: AcademicSourceStatus[]
    /** Model-facing note about degraded coverage. */
    notice?: string
    /** How `field` and filters were applied (for the payload header). */
    fieldFilter?: string
    /** Encyclopedia entries (SEP / IEP) — reference works, NOT papers. */
    encyclopedia?: EncyclopediaEntry[]
    /** Papers dropped by the minimum relevance threshold. */
    droppedWeak?: number
    /** Served from the shared cache. */
    cached?: boolean
    /** Original-language phrasing used for the Turkish fan-out. */
    queryOriginal?: string
}

const SEARCH_TIMEOUT_MS = 12_000
const S2_TIMEOUT_MS = 6_000
const UNPAYWALL_TIMEOUT_MS = 4_000
const UNPAYWALL_CONCURRENCY = 4
const UNPAYWALL_MAX_LOOKUPS = 10
const ABSTRACT_KEEP_CHARS = 600
const ENCYCLOPEDIA_LIMIT = 2

// ---------------------------------------------------------------------------
// Rate-limit queues (module-level)
// ---------------------------------------------------------------------------

/** arXiv asks for ≤ 1 request / 3 s. */
const arxivQueue = createSerialQueue(3_000)

/** Test hook: reset queues / cool-downs; `minIntervalMs` applies to arXiv, `extraMs` to CORE + DOAJ. */
export function __resetAcademicSearchStateForTests(minIntervalMs = 3_000, extraMs = 0): void {
    arxivQueue.reset(minIntervalMs)
    coreQueue.reset(extraMs)
    doajQueue.reset(extraMs)
    s2Queue.reset(extraMs)
    __resetCooldownsForTests()
}


// ---------------------------------------------------------------------------
// Field profiles & routing
// ---------------------------------------------------------------------------

type FieldDomain = 'humanities' | 'social' | 'biomedical' | 'stem'

export interface FieldProfile {
    key: string
    label: string
    domain: FieldDomain
    /** OpenAlex `topics.subfield.id` (ASJC-based ids) or `topics.field.id`. */
    openAlex: { subfields?: number[]; fields?: number[] }
    /** Semantic Scholar `fieldsOfStudy`. */
    s2?: string[]
    /** arXiv carries relevant literature for this field. */
    arxiv?: boolean
}

type FieldProfileEntry = FieldProfile & { aliases: string[] }

/** Aliases are folded (lowercase, no diacritics, ı→i). */
const FIELD_PROFILES: FieldProfileEntry[] = [
    { key: 'philosophy', label: 'Philosophy', domain: 'humanities', openAlex: { subfields: [1211] }, s2: ['Philosophy'], aliases: ['philosophy', 'felsefe', 'ethics', 'etik', 'ahlak', 'ahlak felsefesi', 'moral philosophy', 'epistemology', 'epistemoloji', 'bilgi felsefesi', 'metaphysics', 'metafizik', 'ontology', 'ontoloji', 'aesthetics', 'estetik', 'phenomenology', 'fenomenoloji', 'existentialism', 'varolusculuk', 'political philosophy', 'siyaset felsefesi', 'philosophy of mind', 'zihin felsefesi', 'philosophy of technology', 'teknoloji felsefesi', 'continental philosophy', 'analytic philosophy', 'logic', 'mantik'] },
    { key: 'history-philosophy-science', label: 'History and Philosophy of Science', domain: 'humanities', openAlex: { subfields: [1207, 1211] }, s2: ['Philosophy', 'History'], aliases: ['philosophy of science', 'bilim felsefesi', 'history of science', 'bilim tarihi', 'history and philosophy of science'] },
    { key: 'history', label: 'History', domain: 'humanities', openAlex: { subfields: [1202] }, s2: ['History'], aliases: ['history', 'tarih'] },
    { key: 'literature', label: 'Literature and Literary Theory', domain: 'humanities', openAlex: { subfields: [1208] }, s2: ['Art'], aliases: ['literature', 'literary theory', 'literary studies', 'edebiyat', 'edebiyat kurami'] },
    { key: 'religion', label: 'Religious Studies', domain: 'humanities', openAlex: { subfields: [1212] }, s2: ['Philosophy', 'History'], aliases: ['religion', 'religious studies', 'theology', 'ilahiyat', 'din', 'din felsefesi', 'philosophy of religion'] },
    { key: 'linguistics', label: 'Language and Linguistics', domain: 'humanities', openAlex: { subfields: [1203, 3310] }, s2: ['Linguistics'], aliases: ['linguistics', 'language', 'dilbilim', 'dil bilimi', 'philosophy of language', 'dil felsefesi'] },
    { key: 'classics', label: 'Classics', domain: 'humanities', openAlex: { subfields: [1205] }, s2: ['History'], aliases: ['classics', 'classical studies', 'klasik filoloji'] },
    { key: 'arts', label: 'Visual and Performing Arts', domain: 'humanities', openAlex: { subfields: [1213, 1210] }, s2: ['Art'], aliases: ['art', 'arts', 'art history', 'sanat', 'sanat tarihi', 'music', 'muzik', 'visual arts', 'film', 'sinema', 'theatre', 'tiyatro'] },
    { key: 'humanities', label: 'Arts and Humanities', domain: 'humanities', openAlex: { fields: [12] }, s2: ['Philosophy', 'History', 'Art'], aliases: ['humanities', 'arts and humanities', 'insan bilimleri', 'beseri bilimler'] },
    { key: 'sociology', label: 'Sociology and Political Science', domain: 'social', openAlex: { subfields: [3312] }, s2: ['Sociology'], aliases: ['sociology', 'sosyoloji', 'social theory', 'toplum bilimi'] },
    { key: 'political-science', label: 'Political Science', domain: 'social', openAlex: { subfields: [3320, 3312] }, s2: ['Political Science'], aliases: ['political science', 'politics', 'siyaset', 'siyaset bilimi', 'international relations', 'uluslararasi iliskiler'] },
    { key: 'education', label: 'Education', domain: 'social', openAlex: { subfields: [3304] }, s2: ['Education'], aliases: ['education', 'egitim', 'pedagogy', 'pedagoji'] },
    { key: 'law', label: 'Law', domain: 'social', openAlex: { subfields: [3308] }, s2: ['Law'], aliases: ['law', 'hukuk', 'legal studies', 'jurisprudence'] },
    { key: 'anthropology', label: 'Anthropology', domain: 'social', openAlex: { subfields: [3314] }, s2: ['Sociology'], aliases: ['anthropology', 'antropoloji'] },
    { key: 'cultural-studies', label: 'Cultural Studies', domain: 'social', openAlex: { subfields: [3316, 3318] }, s2: ['Sociology'], aliases: ['cultural studies', 'kultur calismalari', 'gender studies', 'toplumsal cinsiyet'] },
    { key: 'communication', label: 'Communication', domain: 'social', openAlex: { subfields: [3315] }, s2: ['Sociology'], aliases: ['communication', 'media studies', 'iletisim', 'medya'] },
    { key: 'geography', label: 'Geography', domain: 'social', openAlex: { subfields: [3305] }, s2: ['Geography'], aliases: ['geography', 'cografya', 'urban studies', 'sehircilik'] },
    { key: 'social-sciences', label: 'Social Sciences', domain: 'social', openAlex: { fields: [33] }, s2: ['Sociology', 'Political Science'], aliases: ['social sciences', 'social science', 'sosyal bilimler'] },
    { key: 'economics', label: 'Economics', domain: 'social', openAlex: { fields: [20] }, s2: ['Economics'], arxiv: true, aliases: ['economics', 'ekonomi', 'iktisat', 'econometrics', 'finance', 'finans'] },
    { key: 'business', label: 'Business and Management', domain: 'social', openAlex: { fields: [14] }, s2: ['Business'], aliases: ['business', 'management', 'isletme', 'yonetim'] },
    { key: 'psychology', label: 'Psychology', domain: 'biomedical', openAlex: { fields: [32] }, s2: ['Psychology'], aliases: ['psychology', 'psikoloji', 'psychiatry', 'psikiyatri'] },
    { key: 'cognitive-science', label: 'Cognitive Science', domain: 'stem', openAlex: { fields: [32, 28, 17] }, s2: ['Psychology', 'Computer Science'], arxiv: true, aliases: ['cognitive science', 'bilissel bilim', 'cognition'] },
    { key: 'neuroscience', label: 'Neuroscience', domain: 'biomedical', openAlex: { fields: [28] }, s2: ['Medicine', 'Biology'], arxiv: true, aliases: ['neuroscience', 'sinirbilim', 'norobilim'] },
    { key: 'medicine', label: 'Medicine', domain: 'biomedical', openAlex: { fields: [27, 36] }, s2: ['Medicine'], aliases: ['medicine', 'tip', 'health', 'saglik', 'public health', 'halk sagligi', 'nursing', 'hemsirelik', 'clinical', 'klinik', 'epidemiology', 'bioethics', 'biyoetik', 'medical ethics'] },
    { key: 'biology', label: 'Biology', domain: 'biomedical', openAlex: { fields: [13, 11, 24] }, s2: ['Biology'], arxiv: true, aliases: ['biology', 'biyoloji', 'genetics', 'genetik', 'ecology', 'ekoloji', 'evolution', 'evrim', 'biochemistry'] },
    { key: 'artificial-intelligence', label: 'Artificial Intelligence', domain: 'stem', openAlex: { subfields: [1702] }, s2: ['Computer Science'], arxiv: true, aliases: ['artificial intelligence', 'ai', 'yapay zeka', 'machine learning', 'makine ogrenmesi', 'deep learning', 'ai ethics', 'yapay zeka etigi'] },
    { key: 'computer-science', label: 'Computer Science', domain: 'stem', openAlex: { fields: [17] }, s2: ['Computer Science'], arxiv: true, aliases: ['computer science', 'bilgisayar bilimi', 'bilgisayar bilimleri', 'computing', 'informatics', 'bilisim'] },
    { key: 'mathematics', label: 'Mathematics', domain: 'stem', openAlex: { fields: [26] }, s2: ['Mathematics'], arxiv: true, aliases: ['mathematics', 'math', 'matematik', 'statistics', 'istatistik', 'mathematical logic'] },
    { key: 'physics', label: 'Physics and Astronomy', domain: 'stem', openAlex: { fields: [31] }, s2: ['Physics'], arxiv: true, aliases: ['physics', 'fizik', 'astronomy', 'astronomi', 'cosmology', 'kozmoloji', 'quantum', 'kuantum'] },
    { key: 'chemistry', label: 'Chemistry', domain: 'stem', openAlex: { fields: [16] }, s2: ['Chemistry'], aliases: ['chemistry', 'kimya'] },
    { key: 'engineering', label: 'Engineering', domain: 'stem', openAlex: { fields: [22] }, s2: ['Engineering'], arxiv: true, aliases: ['engineering', 'muhendislik'] },
    { key: 'environmental-science', label: 'Environmental Science', domain: 'stem', openAlex: { fields: [23] }, s2: ['Environmental Science'], aliases: ['environmental science', 'environment', 'cevre', 'climate', 'iklim', 'climate change', 'iklim degisikligi'] },
]


function toProfile(entry: FieldProfileEntry): FieldProfile {
    return { key: entry.key, label: entry.label, domain: entry.domain, openAlex: entry.openAlex, s2: entry.s2, arxiv: entry.arxiv }
}

/** Maps a free-text `field` (English or Turkish) to a known profile, else undefined. */
export function resolveFieldProfile(field?: string): FieldProfile | undefined {
    const folded = foldText(field || '').replace(NON_LETTER_DIGIT_RE, ' ').trim()
    if (!folded) return undefined
    for (const entry of FIELD_PROFILES) {
        if (entry.key === folded || entry.aliases.includes(folded)) return toProfile(entry)
    }
    for (const entry of FIELD_PROFILES) {
        if (entry.aliases.some((alias) => alias.length > 3 && ` ${folded} `.includes(` ${alias} `))) return toProfile(entry)
    }
    return undefined
}

const BIOMEDICAL_RE =
    /\b(disease|diseases|clinical|patient|patients|cancer|tumou?r|genes?|genetic|genom\w*|protein\w*|cells?|drugs?|therapy|therapeutic|covid|sars|virus|viral|vaccin\w*|brain|neuro\w*|health|medical|medicine|epidemiolog\w*|psychiatr\w*|depression|anxiety|dementia|alzheimer\w*|surgery|surgical|sleep|nutrition|diabetes|obesity|pharmac\w*|hospital|nursing|immun\w*|bacteri\w*|microbio\w*|dna|rna|infection\w*|mortality|symptom\w*|diagnos\w*|biomedical|placebo|clinical trial|hastalik\w*|tedavi|saglik|klinik|hasta|kanser|ilac|tibbi|beyin|psikiyatri|depresyon)\b/i

const STEM_RE =
    /\b(algorithms?|algorithmic|neural|machine learning|deep learning|reinforcement learning|artificial intelligence|ai|llms?|language models?|transformers?|computation\w*|computer|computing|quantum|physics|cosmolog\w*|mathemat\w*|theorem|statistic\w*|probabilit\w*|bayesian|formal (logic|epistemology|semantics|verification)|modal logic|game theory|robot\w*|cryptograph\w*|computational complexity|information theory|simulation|optimi[sz]ation|yapay zeka|makine ogrenmesi|algoritma\w*|kuantum|fizik|matematik\w*|hesaplama\w*)\b/i

export function looksBiomedical(text: string): boolean {
    return BIOMEDICAL_RE.test(foldText(text))
}

export function looksStem(text: string): boolean {
    return STEM_RE.test(foldText(text))
}

export interface SourceRoutingPlan {
    run: Record<AcademicSourceId, boolean>
    skipReason: Partial<Record<AcademicSourceId, AcademicSourceReason>>
    profile?: FieldProfile
    /** Turkish phrasing to fan out (TR Dizin / Crossref / OpenAlex language:tr), when present. */
    turkishText?: string
    /** Humanities-ish query/field (drives DOAJ / CORE / encyclopedias). */
    humanities?: boolean
    philosophy?: boolean
}

function normalizeLanguage(language?: string): string | undefined {
    const code = String(language || '').trim().toLowerCase()
    return /^[a-z]{2}$/.test(code) ? code : undefined
}

const TURKISH_STUDIES_RE =
    /\b(osmanli\w*|ottoman\w*|turkiye\w*|turkey|turkish|turk|turkler\w*|anadolu\w*|anatolia\w*|cumhuriyet\w*|ataturk\w*|kemalis\w*|tanzimat|mesrutiyet\w*|selcuklu\w*|seljuk\w*|istanbul|ankara|kurt\w*|kurdish|alevi\w*|bektasi\w*|divan edebiyati)\b/i

const HUMANITIES_RE =
    /\b(philosoph\w*|felsef\w*|ethic\w*|etik|ahlak\w*|virtue|erdem\w*|metaphysic\w*|metafizik|ontolog\w*|ontoloji|epistemolog\w*|phenomenolog\w*|fenomenoloji|existential\w*|aesthetic\w*|estetik|hermeneutic\w*|history|historical|tarih\w*|literature|literary|edebiyat\w*|poetry|siir|novel|roman|theolog\w*|religio\w*|ilahiyat|din|islam\w*|christian\w*|marx\w*|alienation|yabancilasma\w*|hegel\w*|kant\w*|heidegger\w*|nietzsche\w*|aristotle\w*|aristoteles|plato\w*|platon|socrat\w*|sokrates|spinoza|descartes|hume|locke|rousseau|foucault|derrida|husserl|wittgenstein|sartre|arendt|adorno|habermas|benjamin|levinas|deleuze|gestell|dasein|being|varlik|modernit\w*|modernles\w*|culture|kultur\w*|art|sanat|music|muzik|mytholog\w*|classics|antiquity|medieval|renaissance|enlightenment|aydinlanma|sociology|sosyoloji|anthropolog\w*|antropoloji)\b/i

const PHILOSOPHY_RE =
    /\b(philosoph\w*|felsef\w*|ethic\w*|etik|ahlak\w*|virtue|erdem\w*|metaphysic\w*|metafizik|ontolog\w*|ontoloji|epistemolog\w*|phenomenolog\w*|fenomenoloji|existential\w*|varolus\w*|aesthetic\w*|estetik|hermeneutic\w*|marx\w*|alienation|yabancilasma\w*|hegel\w*|kant\w*|heidegger\w*|nietzsche\w*|aristotle\w*|aristoteles|plato\w*|platon|socrat\w*|sokrates|spinoza|descartes|hume|locke|rousseau|foucault|derrida|husserl|wittgenstein|sartre|arendt|adorno|habermas|levinas|deleuze|kierkegaard|leibniz|gestell|dasein|stoic\w*|epicur\w*|utilitarian\w*|deontolog\w*|consequential\w*|free will|consciousness|bilinc|mind|zihin)\b/i

export function looksHumanities(text: string): boolean {
    return HUMANITIES_RE.test(foldText(text))
}

export function looksPhilosophy(text: string): boolean {
    return PHILOSOPHY_RE.test(foldText(text))
}

export function looksTurkishStudies(text: string): boolean {
    return TURKISH_STUDIES_RE.test(foldText(text))
}

/**
 * Decides which sources run. PubMed/Europe PMC only for biomedical field/query;
 * arXiv only for STEM-ish fields/queries (and not for book/dissertation/review
 * types or non-English language filters). Open-access-only never skips arXiv.
 * TR Dizin: Turkish query/original, language tr or Turkish-studies topic.
 * DOAJ / CORE: humanities (field or query) or open-access-only.
 * SEP / IEP: philosophy field or query.
 */
export function planAcademicSources(query: string, options?: AcademicSearchOptions): SourceRoutingPlan {
    const profile = resolveFieldProfile(options?.field)
    const original = String(options?.queryOriginal || '').trim()
    const hint = `${query} ${original} ${options?.field || ''}`
    const biomedical = profile?.domain === 'biomedical' || looksBiomedical(hint)
    const stem = Boolean(profile?.arxiv) || looksStem(hint)
    const lang = normalizeLanguage(options?.language)
    const type = options?.type
    const nonPreprintType = type === 'book' || type === 'book-chapter' || type === 'dissertation' || type === 'review'
    const turkishStudies = looksTurkishStudies(hint)
    const humanities =
        profile?.domain === 'humanities' || (!profile && !stem && !biomedical && (looksHumanities(hint) || turkishStudies))
    const philosophyField = profile?.key === 'philosophy' || profile?.key === 'history-philosophy-science' || profile?.key === 'religion'
    const philosophy = philosophyField || (!biomedical && looksPhilosophy(hint))
    const originalTurkish = original && original.toLowerCase() !== query.toLowerCase() && looksTurkish(original)
    const queryTurkish = looksTurkish(query)
    const turkishText = originalTurkish ? original : queryTurkish ? query : lang === 'tr' ? original || query : undefined

    const run: Record<AcademicSourceId, boolean> = {
        openalex: true,
        crossref: true,
        semantic_scholar: true,
        arxiv: true,
        pubmed: true,
        europepmc: true,
        trdizin: true,
        core: true,
        doaj: true,
        sep: true,
        iep: true,
    }
    const skipReason: SourceRoutingPlan['skipReason'] = {}
    const skip = (id: AcademicSourceId, reason: AcademicSourceReason) => {
        run[id] = false
        skipReason[id] = reason
    }
    if (!biomedical) {
        skip('pubmed', 'skipped_by_field')
        skip('europepmc', 'skipped_by_field')
    } else if (type === 'book' || type === 'book-chapter' || type === 'dissertation') {
        skip('pubmed', 'skipped_by_filter')
        skip('europepmc', 'skipped_by_filter')
    }
    if (!stem) {
        skip('arxiv', 'skipped_by_field')
    } else if (nonPreprintType || (lang && lang !== 'en')) {
        skip('arxiv', 'skipped_by_filter')
    }
    if (!(turkishText || lang === 'tr' || turkishStudies)) {
        skip('trdizin', 'skipped_by_field')
    } else if (lang && lang !== 'tr' && !turkishStudies) {
        skip('trdizin', 'skipped_by_filter')
    }
    const oaWanted = Boolean(options?.openAccessOnly)
    for (const id of ['doaj', 'core'] as const) {
        if (!(humanities || oaWanted)) skip(id, 'skipped_by_field')
        else if (type === 'book' || type === 'book-chapter') skip(id, 'skipped_by_filter')
    }
    for (const id of ['sep', 'iep'] as const) {
        if (!philosophy) skip(id, 'skipped_by_field')
    }
    return { run, skipReason, profile, turkishText: turkishText || undefined, humanities, philosophy }
}

const LANGUAGE_NAMES: Record<string, { pubmed: string; epmc: string }> = {
    en: { pubmed: 'english', epmc: 'eng' },
    tr: { pubmed: 'turkish', epmc: 'tur' },
    de: { pubmed: 'german', epmc: 'ger' },
    fr: { pubmed: 'french', epmc: 'fre' },
    es: { pubmed: 'spanish', epmc: 'spa' },
    it: { pubmed: 'italian', epmc: 'ita' },
    pt: { pubmed: 'portuguese', epmc: 'por' },
    ru: { pubmed: 'russian', epmc: 'rus' },
    nl: { pubmed: 'dutch', epmc: 'dut' },
    zh: { pubmed: 'chinese', epmc: 'chi' },
    ja: { pubmed: 'japanese', epmc: 'jpn' },
    ar: { pubmed: 'arabic', epmc: 'ara' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reconstruct abstract text from OpenAlex inverted index */
export function reconstructAbstract(invertedIndex?: Record<string, number[]> | null, maxChars = ABSTRACT_KEEP_CHARS): string {
    if (!invertedIndex || typeof invertedIndex !== 'object') return ''
    const wordEntries: Array<[number, string]> = []
    for (const [word, positions] of Object.entries(invertedIndex)) {
        if (Array.isArray(positions)) {
            for (const pos of positions) {
                wordEntries.push([pos, word])
            }
        }
    }
    wordEntries.sort((a, b) => a[0] - b[0])
    const full = wordEntries.map((entry) => entry[1]).join(' ')
    return full.length > maxChars ? `${full.slice(0, maxChars)}…` : full
}


// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function googleScholarUrl(title: string): string {
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`
}

/** Markdown listing with DOI, open-access PDF (Unpaywall / OA location) and Google Scholar links. */
export function formatAcademicResults(papers: AcademicPaper[], encyclopedia: EncyclopediaEntry[] = []): string {
    const encBlock = encyclopedia.length
        ? `\n\n**Encyclopedia entries (reference works, not papers)**\n${encyclopedia
              .map((e) => `- ${ENCYCLOPEDIA_NAMES[e.source]}: [${e.title}](${e.url})${e.excerpt ? ` — ${e.excerpt}` : ''}`)
              .join('\n')}`
        : ''
    if (!papers || papers.length === 0) return `No academic papers found matching the query.${encBlock}`

    return papers
        .map((p, idx) => {
            const authorStr = p.authors.length > 0 ? p.authors.join(', ') : 'Unknown Author'
            const yearStr = p.year ? ` (${p.year})` : ''
            const venueStr = p.venue ? ` — *${p.venue}*` : ''
            const citeStr = p.citationCount > 0 ? ` [Cited by ${p.citationCount}]` : ''
            const topicStr = p.topics && p.topics.length > 0 ? `\n   - **Topics:** ${p.topics.join(', ')}` : ''
            const srcs = p.sources && p.sources.length > 0 ? p.sources : [p.source]
            const sourceStr = p.source ? `\n   - **Source:** ${srcs.join(', ')}` : ''
            let item = `${idx + 1}. **${p.title}**${yearStr}\n   - **Authors:** ${authorStr}${venueStr}${citeStr}${topicStr}${sourceStr}`
            const doi = cleanDoi(p.doi)
            if (doi) item += `\n   - **DOI:** https://doi.org/${doi}`
            if (p.pdfUrl) {
                const pdfLabel = /\.pdf(\?|$)/i.test(p.pdfUrl) ? 'Open Access PDF' : 'Open Access full text'
                item += `\n   - **${pdfLabel}:** [Read / Download](${p.pdfUrl})`
            } else if (p.url) {
                item += `\n   - **Link:** ${p.url}`
            }
            const links: string[] = []
            if (doi) links.push(`[Unpaywall](https://unpaywall.org/${doi})`)
            links.push(`[Google Scholar](${googleScholarUrl(p.title)})`)
            item += `\n   - **Find full text:** ${links.join(' · ')}`
            if (p.abstract) item += `\n   - **Abstract:** ${p.abstract}`
            return item
        })
        .join('\n\n') + encBlock
}

/** Formats papers into standard APA bibliography format suitable for WIM notebooks */
export function formatApaBibliography(papers: AcademicPaper[]): string {
    if (!papers || papers.length === 0) return ''

    const lines = papers.map((p) => {
        const authors = p.authors.length > 0 ? p.authors.join(', ') : 'Anonymous'
        const year = p.year ? `(${p.year})` : '(n.d.)'
        const venue = p.venue ? `*${p.venue}*.` : ''
        const doi = p.doi ? ` ${p.doi}` : ''
        return `${authors} ${year}. ${p.title}. ${venue}${doi}`
    })

    return `### References\n\n${lines.join('\n\n')}`
}

function formatAuthorsShort(authors: string[]): string {
    if (!authors || authors.length === 0) return 'Unknown author'
    const shown = authors.slice(0, 3).join('; ')
    return authors.length > 3 ? `${shown} et al.` : shown
}

/** One compact line: `[P1] Authors (Year). Title. Venue. DOI. cites:N. OA:url|yes|no. src:… Abstract: …` */
export function formatPaperLine(p: AcademicPaper, index: number, abstractChars: number): string {
    const parts: string[] = []
    const year = p.year ? ` (${p.year})` : ' (n.d.)'
    parts.push(`[P${index + 1}] ${truncateAtWord(formatAuthorsShort(p.authors), 120)}${year}. ${truncateAtWord(p.title, 220)}.`)
    if (p.venue) parts.push(`${truncateAtWord(p.venue, 90)}.`)
    const doi = cleanDoi(p.doi)
    if (doi) parts.push(`https://doi.org/${doi.slice(0, 120)}.`)
    if (p.citationCount > 0) parts.push(`cites:${p.citationCount}.`)
    if (p.pdfUrl) parts.push(`OA:${p.pdfUrl.slice(0, 200)}.`)
    else parts.push(p.isOpenAccess ? 'OA:yes.' : 'OA:no.')
    if (!doi && !p.pdfUrl) {
        parts.push(p.url ? `link:${p.url.slice(0, 200)}.` : `scholar:${googleScholarUrl(p.title).slice(0, 200)}.`)
    }
    const srcs = p.sources && p.sources.length > 0 ? p.sources : [p.source]
    parts.push(`src:${srcs.join('+')}.`)
    if (abstractChars > 0 && p.abstract) parts.push(`Abstract: ${truncateAtWord(p.abstract, abstractChars)}`)
    return parts.join(' ')
}

function formatStatusLine(sources: AcademicSourceStatus[]): string {
    return sources
        .map((s) => {
            const id = s.lang ? `${s.source}[${s.lang}]` : s.source
            if (s.status === 'ok') return `${id} ok(${s.count})`
            return `${id} ${s.status}(${s.reason || 'error'}${s.httpStatus ? ` ${s.httpStatus}` : ''})`
        })
        .join(' · ')
}

export const ACADEMIC_CITE_INSTRUCTION =
    'Cite only these papers, by their [P#] id, using exactly the metadata shown (authors, year, title, venue, DOI). Never invent papers, authors, years, DOIs or page numbers.'

export const ENCYCLOPEDIA_NOTE =
    'Items marked ENCYCLOPEDIA are reference-work entries (SEP / IEP), not papers: cite them by [P#] as encyclopedia entries, never as journal articles, and do not quote beyond the excerpt shown.'

/** `[P7] ENCYCLOPEDIA (Stanford Encyclopedia of Philosophy) "Title" — Authors. url. Excerpt: …` */
export function formatEncyclopediaLine(e: EncyclopediaEntry, index: number, excerptChars: number): string {
    const parts: string[] = [`[P${index + 1}] ENCYCLOPEDIA (${ENCYCLOPEDIA_NAMES[e.source]}) "${truncateAtWord(e.title, 160)}"`]
    if (e.authors?.length) parts.push(`— ${truncateAtWord(e.authors.join('; '), 100)}.`)
    parts.push(`${e.url.slice(0, 200)}.`)
    if (excerptChars > 0 && e.excerpt) parts.push(`Excerpt: ${truncateAtWord(e.excerpt, Math.min(excerptChars, 300))}`)
    return parts.join(' ')
}

/**
 * Compact, size-bounded payload for the model. Never cuts mid-line: shortens
 * abstracts first, then drops whole lowest-ranked papers.
 */
export function formatAcademicPayloadForModel(result: AcademicSearchResult, maxChars = 4_000): string {
    const header: string[] = []
    const n = result.papers.length
    const enc = result.encyclopedia || []
    const encLabel = enc.length ? ` + ${enc.length} encyclopedia entr${enc.length === 1 ? 'y' : 'ies'}` : ''
    header.push(
        `ACADEMIC SEARCH "${truncateAtWord(result.query || '', 160)}"${result.queryOriginal ? ` / "${truncateAtWord(result.queryOriginal, 120)}"` : ''} — ${n} paper${n === 1 ? '' : 's'}${encLabel}${result.fieldFilter ? ` (${truncateAtWord(result.fieldFilter, 200)})` : ''}`
    )
    if (result.sources && result.sources.length > 0) header.push(`Sources: ${formatStatusLine(result.sources)}`)
    if (result.notice) header.push(`NOTE: ${truncateAtWord(result.notice, 600)}`)
    header.push(n + enc.length > 0 ? ACADEMIC_CITE_INSTRUCTION : 'No papers were returned by the sources that responded.')
    if (enc.length) header.push(ENCYCLOPEDIA_NOTE)

    const head = header.join('\n')
    if (head.length >= maxChars) return truncateAtWord(head, maxChars - 1)
    if (n + enc.length === 0) return head

    const encLines = (chars: number) => enc.map((e, i) => formatEncyclopediaLine(e, n + i, chars))
    for (const abstractChars of [300, 220, 150, 90, 0]) {
        const lines = [...result.papers.map((p, i) => formatPaperLine(p, i, abstractChars)), ...encLines(Math.min(abstractChars, 200))]
        const text = `${head}\n${lines.join('\n')}`
        if (text.length <= maxChars) return text
    }
    // Encyclopedia lines keep their numbers (they follow the papers), so drop them first.
    const paperLines = result.papers.map((p, i) => formatPaperLine(p, i, 0))
    const withoutEnc = `${head}\n${paperLines.join('\n')}`
    if (n > 0 && withoutEnc.length <= maxChars) {
        const note = `\n(${enc.length} encyclopedia entr${enc.length === 1 ? 'y' : 'ies'} omitted for length)`
        return enc.length && withoutEnc.length + note.length <= maxChars ? withoutEnc + note : withoutEnc
    }
    for (let keep = paperLines.length - 1; keep >= 1; keep--) {
        const omitted = paperLines.length - keep
        const text = `${head}\n${paperLines.slice(0, keep).join('\n')}\n(${omitted} lower-ranked paper${omitted === 1 ? '' : 's'} omitted for length)`
        if (text.length <= maxChars) return text
    }
    return head
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'under',
    'bir', 've', 'ile', 'icin', 'için', 'olan', 'nedir', 'nasil', 'nasıl',
    'uzerine', 'hakkinda', 'paper', 'papers', 'research', 'academic', 'article', 'makale', 'study', 'studies',
])

export function tokenizeAcademicQuery(query: string): string[] {
    return String(query || '')
        .toLowerCase()
        .replace(QUERY_JUNK_RE, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

export function scoreAcademicPaper(query: string, paper: AcademicPaper, fieldLabel?: string): number {
    const tokens = tokenizeAcademicQuery(query)
    const title = (paper.title || '').toLowerCase()
    const titleWords = title.split(NON_LETTER_DIGIT_SPLIT_RE)
    const abstract = (paper.abstract || '').toLowerCase()
    const authors = (paper.authors || []).join(' ').toLowerCase()
    const topics = (paper.topics || []).join(' ').toLowerCase()
    let score = 0
    for (const token of tokens) {
        if (title.includes(token)) score += 8
        if (titleWords.includes(token)) score += 6
        if (authors.includes(token)) score += 10
        if (topics.includes(token)) score += 3
        if (abstract.includes(token)) score += 2
    }
    score += Math.log10((paper.citationCount || 0) + 1) * 4
    if (paper.pdfUrl) score += /\.pdf(\?|$)/i.test(paper.pdfUrl) ? 6 : 3
    if (paper.doi) score += 2
    if (paper.abstract) score += 1
    if (fieldLabel && topics.includes(fieldLabel.toLowerCase())) score += 3
    if (paper.sources && paper.sources.length > 1) score += 1
    if (paper.source === 'Web Search') score -= 10
    if (paper.source === 'Philosophical Canon') score += 1
    if (paper.source === 'OpenAlex' || paper.source === 'Crossref' || paper.source === 'Europe PMC') score += 2
    const year = paper.year || 0
    if (year >= 2018) score += 1
    if (year >= 2022) score += 1
    return score
}

/** Reciprocal-rank-fusion constant (Cormack et al.; 60 is the usual default). */
export const RRF_K = 60
/** Minimum share of query terms a paper must contain (title / abstract / topics / authors). */
export const MIN_RELEVANCE = 0.5

function foldedTokens(query: string): string[] {
    return Array.from(new Set(tokenizeAcademicQuery(foldText(query)).filter((t) => !STOP_WORDS.has(t))))
}

/** Token sets for relevance: English `query` and (optionally) the original-language phrasing. */
export function queryTokenSets(query: string, queryOriginal?: string): string[][] {
    const sets = [foldedTokens(query)]
    if (queryOriginal && queryOriginal.trim() && queryOriginal.trim() !== query.trim()) sets.push(foldedTokens(queryOriginal))
    return sets.filter((set) => set.length > 0)
}

function tokenIn(text: string, token: string): boolean {
    if (text.includes(token)) return true
    // Light stemming for inflected forms (Turkish suffixes, English plurals): drop 2 chars on long tokens.
    return token.length >= 7 && text.includes(token.slice(0, token.length - 2))
}

/** Query-term coverage 0..1 (best of the token sets) and title coverage. */
export function relevanceCoverage(paper: AcademicPaper, sets: string[][]): { coverage: number; titleCoverage: number } {
    if (sets.length === 0) return { coverage: 1, titleCoverage: 1 }
    const title = foldText(paper.title || '')
    const body = foldText(
        `${paper.title || ''} ${paper.abstract || ''} ${(paper.topics || []).join(' ')} ${(paper.authors || []).join(' ')}`
    )
    let best = { coverage: 0, titleCoverage: 0 }
    for (const set of sets) {
        const coverage = set.filter((t) => tokenIn(body, t)).length / set.length
        const titleCoverage = set.filter((t) => tokenIn(title, t)).length / set.length
        if (coverage > best.coverage || (coverage === best.coverage && titleCoverage > best.titleCoverage)) {
            best = { coverage, titleCoverage }
        }
    }
    return best
}

/** Single-term queries need the term; longer queries need ≥ MIN_RELEVANCE of the terms. */
export function passesRelevanceThreshold(paper: AcademicPaper, sets: string[][]): boolean {
    if (sets.length === 0) return true
    const { coverage } = relevanceCoverage(paper, sets)
    const shortest = Math.min(...sets.map((set) => set.length))
    return shortest <= 1 ? coverage >= 1 : coverage >= MIN_RELEVANCE
}

/**
 * Fused score = Σ 100/(RRF_K + rank) over every result list that returned the
 * paper + query-term relevance + modest citation / OA / DOI bonuses.
 * One extra source agreeing (+~1.5) outweighs a highly cited paper (≤ +1.2).
 */
export function fusedAcademicScore(paper: AcademicPaper, sets: string[][], fieldLabel?: string): number {
    let rrf = 0
    for (const rank of Object.values(paper.ranks || {})) {
        if (typeof rank === 'number' && rank > 0) rrf += 100 / (RRF_K + rank)
    }
    const { coverage, titleCoverage } = relevanceCoverage(paper, sets)
    let score = rrf + coverage * 4 + titleCoverage * 2
    score += Math.min(Math.log10((paper.citationCount || 0) + 1) * 0.3, 1.2)
    if (paper.pdfUrl || paper.isOpenAccess) score += 0.3
    if (cleanDoi(paper.doi)) score += 0.1
    if (fieldLabel && (paper.topics || []).some((t) => t.toLowerCase().includes(fieldLabel.toLowerCase()))) score += 0.3
    if (paper.source === 'Web Search') score -= 3
    return Math.round(score * 1000) / 1000
}

export function rankAcademicPapers(
    query: string,
    papers: AcademicPaper[],
    sortBy: AcademicSearchOptions['sortBy'] = 'relevance',
    fieldLabel?: string,
    queryOriginal?: string
): AcademicPaper[] {
    const sets = queryTokenSets(query, queryOriginal)
    const scored = papers.map((paper) => ({
        ...paper,
        score: fusedAcademicScore(paper, sets, fieldLabel),
        relevance: relevanceCoverage(paper, sets).coverage,
    }))
    scored.sort((a, b) => {
        if (sortBy === 'citations' && b.citationCount !== a.citationCount) return b.citationCount - a.citationCount
        if (sortBy === 'recent' && (b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0)
        return (b.score || 0) - (a.score || 0)
    })
    return scored
}

// ---------------------------------------------------------------------------
// Duplicate merge
// ---------------------------------------------------------------------------

/** Unicode-aware title key: NFKD, strip marks, ı→i, keep only \p{L}\p{N}. */
export function normalizeTitleKey(title: string): string {
    const key = foldText(title).replace(NON_LETTER_DIGIT_RE, '')
    return key.length >= 6 ? key : ''
}

function mergeInto(base: AcademicPaper, other: AcademicPaper): void {
    if ((!base.title || /^untitled/i.test(base.title)) && other.title) base.title = other.title
    if (other.authors.length > base.authors.length) base.authors = other.authors
    if (!base.year && other.year) base.year = other.year
    if ((!base.venue || base.venue === 'arXiv Preprint') && other.venue) base.venue = other.venue
    base.citationCount = Math.max(base.citationCount || 0, other.citationCount || 0)
    if (!cleanDoi(base.doi) && cleanDoi(other.doi)) base.doi = other.doi
    if (other.pdfUrl && (!base.pdfUrl || (!isPdfLike(base.pdfUrl) && isPdfLike(other.pdfUrl)))) base.pdfUrl = other.pdfUrl
    if (!base.url && other.url) base.url = other.url
    if ((other.abstract?.length || 0) > (base.abstract?.length || 0)) base.abstract = other.abstract
    if (other.topics?.length) base.topics = Array.from(new Set([...(base.topics || []), ...other.topics])).slice(0, 5)
    if (!base.language && other.language) base.language = other.language
    if (!base.type && other.type) base.type = other.type
    if (other.isOpenAccess) base.isOpenAccess = true
    if (other.ranks) {
        const ranks = { ...(base.ranks || {}) }
        for (const [key, rank] of Object.entries(other.ranks)) ranks[key] = Math.min(ranks[key] ?? rank, rank)
        base.ranks = ranks
    }
    base.sources = Array.from(new Set([...(base.sources || [base.source]), ...(other.sources || [other.source])]))
}

/**
 * Merge duplicates across sources by DOI, else by normalized title (only when
 * the two copies do not carry different DOIs). Missing abstract / PDF / venue /
 * citation count are filled from the other copies; input order sets priority.
 */
export function mergeAcademicPapers(papers: AcademicPaper[]): AcademicPaper[] {
    const out: AcademicPaper[] = []
    const byDoi = new Map<string, AcademicPaper>()
    const byTitle = new Map<string, AcademicPaper>()
    for (const raw of papers) {
        if (!raw || !raw.title) continue
        const paper: AcademicPaper = {
            ...raw,
            authors: [...(raw.authors || [])],
            sources: raw.sources ? [...raw.sources] : [raw.source],
            ranks: raw.ranks ? { ...raw.ranks } : undefined,
        }
        const doi = cleanDoi(paper.doi)
        const titleKey = normalizeTitleKey(paper.title)
        let target = doi ? byDoi.get(doi) : undefined
        if (!target && titleKey) {
            const candidate = byTitle.get(titleKey)
            const candidateDoi = candidate ? cleanDoi(candidate.doi) : ''
            if (candidate && (!doi || !candidateDoi || candidateDoi === doi)) target = candidate
        }
        if (target) {
            mergeInto(target, paper)
        } else {
            target = paper
            out.push(paper)
        }
        const targetDoi = cleanDoi(target.doi)
        if (targetDoi && !byDoi.has(targetDoi)) byDoi.set(targetDoi, target)
        if (doi && !byDoi.has(doi)) byDoi.set(doi, target)
        if (titleKey && !byTitle.has(titleKey)) byTitle.set(titleKey, target)
    }
    return out
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export interface AcademicSourceContext {
    query: string
    options: AcademicSearchOptions
    limit: number
    keys: AcademicApiKeys
    profile?: FieldProfile
    signal?: AbortSignal
}

function searchText(ctx: AcademicSourceContext): string {
    // Unmapped fields degrade to search text; mapped fields become real filters.
    const text = !ctx.profile && ctx.options.field ? `${ctx.query} ${ctx.options.field}` : ctx.query
    return text.replace(/\s+/g, ' ').trim()
}

export function buildOpenAlexUrl(ctx: AcademicSourceContext): string {
    const { options, profile, keys } = ctx
    const filters: string[] = []
    if (options.yearFrom) filters.push(`publication_year:>${options.yearFrom - 1}`)
    if (options.yearTo) filters.push(`publication_year:<${options.yearTo + 1}`)
    if (options.openAccessOnly) filters.push('is_oa:true')
    const lang = normalizeLanguage(options.language)
    if (lang) filters.push(`language:${lang}`)
    filters.push(options.type ? `type:${options.type}` : 'type:article|book|book-chapter|review')
    if (profile?.openAlex.subfields?.length) filters.push(`topics.subfield.id:${profile.openAlex.subfields.join('|')}`)
    else if (profile?.openAlex.fields?.length) filters.push(`topics.field.id:${profile.openAlex.fields.join('|')}`)

    const params = new URLSearchParams()
    params.set('search', searchText(ctx))
    params.set('per_page', String(Math.min(ctx.limit, 10)))
    params.set('filter', filters.join(','))
    params.set(
        'select',
        'id,title,publication_year,doi,cited_by_count,primary_location,best_oa_location,authorships,open_access,abstract_inverted_index,topics,language,type'
    )
    if (options.sortBy === 'citations') params.set('sort', 'cited_by_count:desc')
    else if (options.sortBy === 'recent') params.set('sort', 'publication_date:desc')
    if (keys.openAlexKey) params.set('api_key', keys.openAlexKey)
    else params.set('mailto', keys.contactEmail)
    return `https://api.openalex.org/works?${params.toString()}`
}

/** OpenAlex work record (subset used here). */
export interface OpenAlexWork {
    id: string
    title?: string
    publication_year?: number
    doi?: string
    cited_by_count?: number
    primary_location?: { source?: { display_name?: string }; pdf_url?: string; landing_page_url?: string }
    best_oa_location?: { pdf_url?: string; landing_page_url?: string }
    authorships?: Array<{ author?: { display_name?: string } }>
    open_access?: { is_oa?: boolean; oa_url?: string }
    abstract_inverted_index?: Record<string, number[]>
    topics?: Array<{ display_name?: string; subfield?: { display_name?: string } }>
    language?: string
    type?: string
    referenced_works?: string[]
    related_works?: string[]
}

/** OpenAlex work → AcademicPaper (shared by search and the citation graph). */
export function openAlexWorkToPaper(r: OpenAlexWork): AcademicPaper {
    const authors = (r.authorships || [])
        .map((a) => a.author?.display_name?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, 4)
    const topicNames: string[] = []
    for (const t of r.topics || []) {
        if (t.display_name) topicNames.push(t.display_name.trim())
        if (t.subfield?.display_name) topicNames.push(t.subfield.display_name.trim())
    }
    const topics = Array.from(new Set(topicNames)).slice(0, 4)
    return {
        id: r.id || `openalex-${Math.random()}`,
        title: r.title?.trim() || 'Untitled Academic Paper',
        authors,
        year: r.publication_year,
        venue: r.primary_location?.source?.display_name?.trim() || undefined,
        citationCount: r.cited_by_count || 0,
        doi: doiUrl(r.doi),
        pdfUrl: pickOaPdfUrl(
            r.best_oa_location?.pdf_url,
            r.primary_location?.pdf_url,
            r.open_access?.oa_url,
            r.best_oa_location?.landing_page_url
        ),
        url: r.primary_location?.landing_page_url || undefined,
        abstract: reconstructAbstract(r.abstract_inverted_index) || undefined,
        topics: topics.length > 0 ? topics : undefined,
        language: r.language || undefined,
        type: r.type || undefined,
        isOpenAccess: r.open_access?.is_oa === true ? true : undefined,
        source: 'OpenAlex' as const,
    }
}

async function queryOpenAlex(ctx: AcademicSourceContext): Promise<AcademicPaper[]> {
    const res = await fetchAcademic(
        buildOpenAlexUrl(ctx),
        { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
        SEARCH_TIMEOUT_MS,
        ctx.signal
    )
    const data = await readJson<{ results?: OpenAlexWork[] }>(res)
    if (!data || !Array.isArray(data.results)) throw new AcademicSourceError('parse_error')
    return data.results.slice(0, ctx.limit).map(openAlexWorkToPaper)
}

const CROSSREF_TYPES: Partial<Record<AcademicWorkType, string[]>> = {
    article: ['journal-article', 'proceedings-article'],
    book: ['book', 'monograph', 'edited-book'],
    'book-chapter': ['book-chapter'],
    preprint: ['posted-content'],
    dissertation: ['dissertation'],
}

export function buildCrossrefUrl(ctx: AcademicSourceContext): string {
    const { options } = ctx
    const filters: string[] = []
    if (options.yearFrom) filters.push(`from-pub-date:${options.yearFrom}-01-01`)
    if (options.yearTo) filters.push(`until-pub-date:${options.yearTo}-12-31`)
    for (const t of (options.type && CROSSREF_TYPES[options.type]) || []) filters.push(`type:${t}`)
    const params = new URLSearchParams()
    params.set('query', searchText(ctx))
    // Over-fetch a little when language / OA are post-filtered.
    params.set('rows', String(Math.min(ctx.limit + (options.language || options.openAccessOnly ? 5 : 0), 15)))
    if (filters.length) params.set('filter', filters.join(','))
    if (options.sortBy === 'citations') {
        params.set('sort', 'is-referenced-by-count')
        params.set('order', 'desc')
    } else if (options.sortBy === 'recent') {
        params.set('sort', 'published')
        params.set('order', 'desc')
    }
    // `language` is not a valid Crossref select; skip `select` when we must post-filter by language.
    if (!options.language) {
        params.set(
            'select',
            'DOI,URL,title,author,issued,published-print,published-online,container-title,is-referenced-by-count,abstract,subject,link,type,license'
        )
    }
    params.set('mailto', ctx.keys.contactEmail)
    return `https://api.crossref.org/works?${params.toString()}`
}

/** Crossref work record (subset used here). */
export interface CrossrefItem {
    DOI?: string
    URL?: string
    title?: string[]
    author?: Array<{ given?: string; family?: string; name?: string }>
    issued?: { 'date-parts'?: number[][] }
    'published-print'?: { 'date-parts'?: number[][] }
    'published-online'?: { 'date-parts'?: number[][] }
    'container-title'?: string[]
    'is-referenced-by-count'?: number
    abstract?: string
    subject?: string[]
    link?: Array<{ URL?: string; 'content-type'?: string }>
    language?: string
    type?: string
    license?: Array<{ URL?: string }>
}

/** Crossref work → AcademicPaper (shared by search and the citation graph). */
export function crossrefItemToPaper(item: CrossrefItem): AcademicPaper {
    const rawTitle = Array.isArray(item.title) && item.title.length > 0 ? item.title[0] : 'Untitled Work'
    const authors: string[] = []
    if (Array.isArray(item.author)) {
        for (const a of item.author.slice(0, 4)) {
            const name = [a.given, a.family].filter(Boolean).join(' ') || a.name || ''
            if (name.trim()) authors.push(name.trim())
        }
    }
    const yearParts =
        item.issued?.['date-parts']?.[0] ||
        item['published-print']?.['date-parts']?.[0] ||
        item['published-online']?.['date-parts']?.[0]
    const year = Array.isArray(yearParts) && typeof yearParts[0] === 'number' ? yearParts[0] : undefined
    const venue =
        Array.isArray(item['container-title']) && item['container-title'].length > 0
            ? stripTags(item['container-title'][0]) || undefined
            : undefined
    // Crossref `link` entries are often subscription TDM endpoints; only
    // treat a PDF link as open when the record carries a CC licence.
    const ccLicensed = Array.isArray(item.license) && item.license.some((l) => /creativecommons\.org/i.test(l.URL || ''))
    let pdfUrl: string | undefined
    if (ccLicensed && Array.isArray(item.link)) {
        const pdfLink = item.link.find((l) => l['content-type']?.toLowerCase().includes('pdf'))
        if (pdfLink?.URL) pdfUrl = pdfLink.URL
    }
    const doi = doiUrl(item.DOI)
    return {
        id: item.DOI || `crossref-${Math.random()}`,
        title: stripTags(rawTitle),
        authors,
        year,
        venue,
        citationCount: typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : 0,
        doi,
        pdfUrl,
        url: !doi && item.URL ? item.URL : undefined,
        abstract: typeof item.abstract === 'string' ? clipText(stripTags(item.abstract), ABSTRACT_KEEP_CHARS) : undefined,
        topics: Array.isArray(item.subject) ? item.subject.slice(0, 4) : undefined,
        language: typeof item.language === 'string' ? item.language.slice(0, 2).toLowerCase() : undefined,
        type: item.type,
        isOpenAccess: ccLicensed ? true : undefined,
        source: 'Crossref' as const,
    }
}

async function queryCrossref(ctx: AcademicSourceContext): Promise<AcademicPaper[]> {
    const res = await fetchAcademic(
        buildCrossrefUrl(ctx),
        { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
        SEARCH_TIMEOUT_MS,
        ctx.signal
    )
    const data = await readJson<{ message?: { items?: CrossrefItem[] } }>(res)
    const items = data?.message?.items
    if (!Array.isArray(items)) throw new AcademicSourceError('parse_error')
    return items.map(crossrefItemToPaper)
}

const S2_TYPES: Partial<Record<AcademicWorkType, string>> = {
    article: 'JournalArticle',
    book: 'Book',
    'book-chapter': 'BookSection',
    review: 'Review',
}

export function buildSemanticScholarUrl(ctx: AcademicSourceContext): string {
    const { options, profile } = ctx
    const params = new URLSearchParams()
    params.set('query', searchText(ctx))
    params.set('limit', String(Math.min(ctx.limit, 5)))
    params.set('fields', 'title,authors,year,venue,citationCount,externalIds,openAccessPdf,abstract,isOpenAccess')
    if (options.yearFrom || options.yearTo) params.set('year', `${options.yearFrom || ''}-${options.yearTo || ''}`)
    if (options.openAccessOnly) params.set('openAccessPdf', '')
    if (profile?.s2?.length) params.set('fieldsOfStudy', profile.s2.join(','))
    const s2Type = options.type ? S2_TYPES[options.type] : undefined
    if (s2Type) params.set('publicationTypes', s2Type)
    return `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`
}

/** Semantic Scholar paper record (subset used here). */
export interface S2Paper {
    paperId?: string
    title?: string
    year?: number
    venue?: string
    citationCount?: number
    authors?: Array<{ name?: string }>
    externalIds?: { DOI?: string; ArXiv?: string; CorpusId?: number | string; PubMedCentral?: string }
    openAccessPdf?: { url?: string } | null
    abstract?: string | null
    isOpenAccess?: boolean
}

/** Semantic Scholar paper → AcademicPaper (shared by search and the citation graph). */
export function s2PaperToPaper(p: S2Paper): AcademicPaper {
    const authors = (p.authors || [])
        .map((a) => a.name?.trim())
        .filter((n): n is string => Boolean(n))
        .slice(0, 4)
    const pdfUrl =
        (p.openAccessPdf?.url && p.openAccessPdf.url.startsWith('http') ? p.openAccessPdf.url : undefined) ||
        (p.externalIds?.ArXiv ? `https://arxiv.org/pdf/${p.externalIds.ArXiv}.pdf` : undefined)
    return {
        id: p.paperId || `s2-${Math.random()}`,
        title: p.title?.trim() || 'Untitled Paper',
        authors,
        year: p.year,
        venue: p.venue?.trim() || undefined,
        citationCount: p.citationCount || 0,
        doi: doiUrl(p.externalIds?.DOI),
        pdfUrl,
        url: p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : undefined,
        abstract: clipText(p.abstract || undefined, ABSTRACT_KEEP_CHARS),
        isOpenAccess: p.isOpenAccess === true || Boolean(pdfUrl) ? true : undefined,
        source: 'Semantic Scholar' as const,
    }
}

async function querySemanticScholar(ctx: AcademicSourceContext): Promise<AcademicPaper[]> {
    const headers: Record<string, string> = { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' }
    if (ctx.keys.semanticScholarKey) headers['x-api-key'] = ctx.keys.semanticScholarKey
    const res = await fetchAcademic(buildSemanticScholarUrl(ctx), { headers }, S2_TIMEOUT_MS, ctx.signal)
    const data = await readJson<{ data?: S2Paper[]; total?: number }>(res)
    if (!data || typeof data !== 'object') throw new AcademicSourceError('parse_error')
    if (!Array.isArray(data.data)) {
        if (typeof data.total === 'number') return []
        throw new AcademicSourceError('parse_error')
    }
    return data.data.map(s2PaperToPaper)
}

export function buildArxivUrl(ctx: AcademicSourceContext): string {
    const { options } = ctx
    const tokens = tokenizeAcademicQuery(ctx.query)
        .map((t) => t.replace(TOKEN_JUNK_RE, ''))
        .filter(Boolean)
        .slice(0, 6)
    let search = tokens.length > 0 ? tokens.map((t) => `all:${t}`).join(' AND ') : `all:${ctx.query.replace(/[():"]/g, ' ').trim()}`
    if (options.yearFrom || options.yearTo) {
        const from = options.yearFrom ? `${options.yearFrom}01010000` : '199101010000'
        const to = options.yearTo ? `${options.yearTo}12312359` : '209912312359'
        search += ` AND submittedDate:[${from} TO ${to}]`
    }
    const params = new URLSearchParams()
    params.set('search_query', search)
    params.set('start', '0')
    params.set('max_results', String(Math.min(ctx.limit, 5)))
    if (options.sortBy === 'recent') {
        params.set('sortBy', 'submittedDate')
        params.set('sortOrder', 'descending')
    }
    return `https://export.arxiv.org/api/query?${params.toString()}`
}

async function queryArXiv(ctx: AcademicSourceContext): Promise<AcademicPaper[]> {
    const startedAt = Date.now()
    return arxivQueue.run(
        async () => {
            const remaining = SEARCH_TIMEOUT_MS - (Date.now() - startedAt)
            const res = await fetchAcademic(
                buildArxivUrl(ctx),
                { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail) } },
                Math.max(remaining, 1_000),
                ctx.signal
            )
            const xml = await readText(res)
            if (!xml.includes('<feed')) throw new AcademicSourceError('parse_error')
            const entries = xml.split('<entry>')
            entries.shift()
            const papers: AcademicPaper[] = []
            for (const entry of entries.slice(0, ctx.limit)) {
                const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
                const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/)
                const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/)
                const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/)
                const doiMatch = entry.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/)
                const authors = Array.from(entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g))
                    .map((m) => decodeEntities(m[1].trim()))
                    .slice(0, 4)
                const rawTitle = titleMatch ? stripTags(titleMatch[1]) : ''
                const rawSummary = summaryMatch ? stripTags(summaryMatch[1]) : ''
                const rawId = idMatch ? idMatch[1].trim() : ''
                const year = publishedMatch ? parseInt(publishedMatch[1].slice(0, 4), 10) : undefined
                if (!rawTitle) continue
                papers.push({
                    id: rawId || `arxiv-${Math.random()}`,
                    title: rawTitle,
                    authors,
                    year: Number.isFinite(year) ? year : undefined,
                    venue: 'arXiv Preprint',
                    citationCount: 0,
                    doi: doiMatch ? doiUrl(doiMatch[1]) : undefined,
                    pdfUrl: rawId.includes('arxiv.org/abs/') ? `${rawId.replace('arxiv.org/abs/', 'arxiv.org/pdf/')}.pdf` : undefined,
                    url: rawId || undefined,
                    abstract: clipText(rawSummary, 500),
                    isOpenAccess: true,
                    type: 'preprint',
                    source: 'ArXiv',
                })
            }
            return papers
        },
        // Give up waiting for our queue slot after ~7 s so the fetch keeps budget.
        SEARCH_TIMEOUT_MS - 5_000,
        ctx.signal
    )
}

function ncbiCommonParams(ctx: AcademicSourceContext): URLSearchParams {
    const params = new URLSearchParams()
    params.set('db', 'pmc')
    params.set('retmode', 'json')
    params.set('tool', 'worldinmaking')
    params.set('email', ctx.keys.contactEmail)
    if (ctx.keys.ncbiKey) params.set('api_key', ctx.keys.ncbiKey)
    return params
}

export function buildPubmedSearchUrl(ctx: AcademicSourceContext): string {
    const { options } = ctx
    const params = ncbiCommonParams(ctx)
    let term = ctx.query
    if (options.openAccessOnly) term += ' AND open access[filter]'
    const lang = normalizeLanguage(options.language)
    if (lang && LANGUAGE_NAMES[lang]) term += ` AND ${LANGUAGE_NAMES[lang].pubmed}[lang]`
    params.set('term', term)
    params.set('retmax', String(Math.min(ctx.limit, 5)))
    if (options.yearFrom || options.yearTo) {
        params.set('datetype', 'pdat')
        params.set('mindate', String(options.yearFrom || 1800))
        params.set('maxdate', String(options.yearTo || 3000))
    }
    if (options.sortBy === 'recent') params.set('sort', 'pub_date')
    return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params.toString()}`
}

async function queryNcbiPmc(ctx: AcademicSourceContext): Promise<AcademicPaper[]> {
    const headers = { 'User-Agent': userAgent(ctx.keys.contactEmail) }
    const searchRes = await fetchAcademic(buildPubmedSearchUrl(ctx), { headers }, SEARCH_TIMEOUT_MS, ctx.signal)
    const searchData = await readJson<{ esearchresult?: { idlist?: string[] } }>(searchRes)
    if (!searchData?.esearchresult) throw new AcademicSourceError('parse_error')
    const idList = searchData.esearchresult.idlist
    if (!Array.isArray(idList) || idList.length === 0) return []
    assertAcademicNotAborted(ctx.signal)

    const params = ncbiCommonParams(ctx)
    params.set('id', idList.join(','))
    const summaryRes = await fetchAcademic(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${params.toString()}`,
        { headers },
        SEARCH_TIMEOUT_MS,
        ctx.signal
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summaryData = await readJson<{ result?: Record<string, any> }>(summaryRes)
    if (!summaryData?.result) throw new AcademicSourceError('parse_error')

    const papers: AcademicPaper[] = []
    for (const uid of idList) {
        const item = summaryData.result[uid]
        if (!item || !item.title) continue
        const authors: string[] = []
        if (Array.isArray(item.authors)) {
            for (const a of item.authors.slice(0, 4)) {
                if (a?.name) authors.push(String(a.name).trim())
            }
        }
        let year: number | undefined
        if (item.pubdate) {
            const yearMatch = String(item.pubdate).match(/\b(19|20)\d{2}\b/)
            if (yearMatch) year = parseInt(yearMatch[0], 10)
        }
        let doi: string | undefined
        if (Array.isArray(item.articleids)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const doiEntry = item.articleids.find((aid: any) => aid?.idtype === 'doi')
            if (doiEntry?.value) doi = doiUrl(String(doiEntry.value))
        }
        papers.push({
            id: `pmc-${uid}`,
            title: stripTags(String(item.title)),
            authors,
            year,
            venue: item.source ? String(item.source).trim() : 'PubMed Central',
            citationCount: 0,
            doi,
            // PMC hosts the full text; this is the article's PDF route.
            pdfUrl: `https://pmc.ncbi.nlm.nih.gov/articles/PMC${uid}/pdf/`,
            url: `https://pmc.ncbi.nlm.nih.gov/articles/PMC${uid}/`,
            isOpenAccess: true,
            source: 'PMC / PubMed' as const,
        })
    }
    return papers
}

export function buildEuropePmcUrl(ctx: AcademicSourceContext): string {
    const { options } = ctx
    const clauses = [`(${ctx.query})`]
    if (options.yearFrom || options.yearTo) clauses.push(`PUB_YEAR:[${options.yearFrom || 1800} TO ${options.yearTo || 3000}]`)
    if (options.openAccessOnly) clauses.push('OPEN_ACCESS:y')
    const lang = normalizeLanguage(options.language)
    if (lang && LANGUAGE_NAMES[lang]) clauses.push(`LANG:${LANGUAGE_NAMES[lang].epmc}`)
    const params = new URLSearchParams()
    params.set('query', clauses.join(' AND '))
    params.set('format', 'json')
    params.set('pageSize', String(Math.min(ctx.limit, 5)))
    params.set('resultType', 'core')
    if (options.sortBy === 'citations') params.set('sort', 'CITED desc')
    else if (options.sortBy === 'recent') params.set('sort', 'P_PDATE_D desc')
    return `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`
}

async function queryEuropePmc(ctx: AcademicSourceContext): Promise<AcademicPaper[]> {
    const res = await fetchAcademic(
        buildEuropePmcUrl(ctx),
        { headers: { 'User-Agent': userAgent(ctx.keys.contactEmail), Accept: 'application/json' } },
        SEARCH_TIMEOUT_MS,
        ctx.signal
    )
    const data = await readJson<{
        resultList?: {
            result?: Array<{
                id?: string
                title?: string
                authorString?: string
                journalTitle?: string
                pubYear?: string
                doi?: string
                pmcid?: string
                citedByCount?: number
                abstractText?: string
                isOpenAccess?: string
            }>
        }
    }>(res)
    const rows = data?.resultList?.result
    if (!Array.isArray(rows)) throw new AcademicSourceError('parse_error')
    return rows.slice(0, ctx.limit).map((row) => {
        const pmcid = row.pmcid ? String(row.pmcid).replace(/^PMC/i, '') : ''
        const authors = String(row.authorString || '')
            .split(',')
            .map((name) => name.trim().replace(/\.$/, ''))
            .filter(Boolean)
            .slice(0, 4)
        const year = row.pubYear ? parseInt(row.pubYear, 10) : undefined
        return {
            id: row.id || `epmc-${pmcid || row.doi || Math.random()}`,
            title: stripTags(String(row.title || 'Untitled')).replace(/\.$/, ''),
            authors,
            year: Number.isFinite(year) ? year : undefined,
            venue: row.journalTitle?.trim() || undefined,
            citationCount: typeof row.citedByCount === 'number' ? row.citedByCount : 0,
            doi: doiUrl(row.doi),
            pdfUrl: pmcid ? `https://europepmc.org/articles/PMC${pmcid}?pdf=render` : undefined,
            url: pmcid ? `https://europepmc.org/article/PMC/PMC${pmcid}` : undefined,
            abstract: typeof row.abstractText === 'string' ? clipText(stripTags(row.abstractText), ABSTRACT_KEEP_CHARS) : undefined,
            isOpenAccess: row.isOpenAccess === 'Y' ? true : undefined,
            source: 'Europe PMC' as const,
        }
    })
}

/** Open-access location via Unpaywall for a DOI (undefined when closed / failed). */
export async function resolveOaPdfViaUnpaywall(doi: string, email: string, signal?: AbortSignal, useCache = true): Promise<string | undefined> {
    assertAcademicNotAborted(signal)
    const bare = cleanDoi(doi)
    if (!bare) return undefined
    if (useCache) {
        const hit = await academicCacheGet<{ url: string | null }>('unpaywall', { doi: bare })
        if (hit) return hit.url || undefined
    }
    const found = await fetchUnpaywall(bare, email, signal)
    if (useCache && found.definitive) {
        await academicCachePut('unpaywall', { doi: bare }, { url: found.url || null }, ACADEMIC_DOI_TTL_S)
    }
    return found.url
}

async function fetchUnpaywall(bare: string, email: string, signal?: AbortSignal): Promise<{ url?: string; definitive: boolean }> {
    try {
        const url = `https://api.unpaywall.org/v2/${encodeURIComponent(bare)}?email=${encodeURIComponent(email)}`
        const res = await fetch(url, {
            headers: { 'User-Agent': userAgent(email) },
            signal: searchFetchSignal(UNPAYWALL_TIMEOUT_MS, signal),
        })
        // 404 = Unpaywall does not know the DOI (definitive); other errors are transient.
        if (!res.ok) return { definitive: res.status === 404 }
        const data = (await res.json()) as {
            is_oa?: boolean
            best_oa_location?: { url_for_pdf?: string; url?: string }
        }
        if (data?.is_oa && data.best_oa_location) {
            return { url: data.best_oa_location.url_for_pdf || data.best_oa_location.url || undefined, definitive: true }
        }
        return { definitive: true }
    } catch (err) {
        if (signal?.aborted) throw err instanceof Error ? err : abortError()
        return { definitive: false }
    }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function runSource(
    id: AcademicSourceId,
    fn: () => Promise<AcademicPaper[]>,
    keyed: boolean | undefined,
    signal?: AbortSignal,
    lang?: string
): Promise<{ status: AcademicSourceStatus; papers: AcademicPaper[] }> {
    const t0 = Date.now()
    try {
        const papers = await fn()
        const status: AcademicSourceStatus = { source: id, status: 'ok', count: papers.length, ms: Date.now() - t0, keyed }
        if (lang) status.lang = lang
        return { status, papers }
    } catch (err) {
        if (signal?.aborted) throw err instanceof Error ? err : abortError()
        const reason: AcademicSourceReason = err instanceof AcademicSourceError ? err.reason : 'error'
        const httpStatus = err instanceof AcademicSourceError ? err.httpStatus : undefined
        const status: AcademicSourceStatus = { source: id, status: 'failed', reason, httpStatus, count: 0, ms: Date.now() - t0, keyed }
        if (lang) status.lang = lang
        return { status, papers: [] }
    }
}

function applyPostFilters(papers: AcademicPaper[], options: AcademicSearchOptions): AcademicPaper[] {
    const lang = normalizeLanguage(options.language)
    return papers.filter((p) => {
        if (options.yearFrom && p.year && p.year < options.yearFrom) return false
        if (options.yearTo && p.year && p.year > options.yearTo) return false
        if (lang && p.language && p.language !== lang) return false
        return true
    })
}

function describeFilters(options: AcademicSearchOptions, profile?: FieldProfile): string | undefined {
    const parts: string[] = []
    if (options.field) {
        if (profile) {
            const ids = profile.openAlex.subfields?.length
                ? `OpenAlex subfield ${profile.openAlex.subfields.join('|')}`
                : `OpenAlex field ${(profile.openAlex.fields || []).join('|')}`
            parts.push(`field ${profile.label} [${ids}]`)
        } else {
            parts.push(`field "${options.field}" unmapped, used as search text`)
        }
    }
    if (options.yearFrom || options.yearTo) parts.push(`years ${options.yearFrom || '…'}–${options.yearTo || '…'}`)
    if (options.language) parts.push(`lang ${options.language}`)
    if (options.type) parts.push(`type ${options.type}`)
    if (options.openAccessOnly) parts.push('open access only')
    return parts.length ? parts.join('; ') : undefined
}

const SOURCE_ORDER: AcademicSourceId[] = [
    'openalex',
    'crossref',
    'semantic_scholar',
    'europepmc',
    'pubmed',
    'arxiv',
    'trdizin',
    'doaj',
    'core',
]

type SourceJob = {
    id: AcademicSourceId
    /** Rank-list key for fusion (e.g. `openalex:tr`). */
    listKey: string
    lang?: string
    run?: () => Promise<AcademicPaper[]>
    skipReason?: AcademicSourceReason
    keyed?: boolean
}

function withRanks(papers: AcademicPaper[], listKey: string): AcademicPaper[] {
    return papers.map((p, i) => ({ ...p, ranks: { ...(p.ranks || {}), [listKey]: i + 1 } }))
}

function searchCacheParts(query: string, opts: AcademicSearchOptions, limit: number): Record<string, unknown> {
    return {
        q: query,
        qo: opts.queryOriginal,
        field: opts.field,
        yf: opts.yearFrom,
        yt: opts.yearTo,
        sort: opts.sortBy,
        oa: opts.openAccessOnly,
        lang: opts.language,
        type: opts.type,
        limit,
    }
}

async function runEncyclopedias(
    plan: SourceRoutingPlan,
    query: string,
    email: string,
    signal?: AbortSignal
): Promise<{ statuses: AcademicSourceStatus[]; entries: EncyclopediaEntry[] }> {
    const jobs: Array<{ id: 'sep' | 'iep'; fn: () => Promise<EncyclopediaEntry[]> }> = [
        { id: 'sep', fn: () => searchSep(query, ENCYCLOPEDIA_LIMIT + 2, email, signal) },
        { id: 'iep', fn: () => searchIep(query, ENCYCLOPEDIA_LIMIT + 1, email, signal) },
    ]
    const statuses: AcademicSourceStatus[] = []
    const entries: EncyclopediaEntry[] = []
    const results = await Promise.all(
        jobs.map(async (job) => {
            if (!plan.run[job.id]) {
                return { status: { source: job.id, status: 'skipped' as const, reason: plan.skipReason[job.id], count: 0, ms: 0 }, entries: [] }
            }
            const t0 = Date.now()
            try {
                const found = filterRelevantEntries(query, await job.fn()).slice(0, ENCYCLOPEDIA_LIMIT)
                return { status: { source: job.id, status: 'ok' as const, count: found.length, ms: Date.now() - t0 }, entries: found }
            } catch (err) {
                if (signal?.aborted) throw err instanceof Error ? err : abortError()
                const reason: AcademicSourceReason = err instanceof AcademicSourceError ? err.reason : 'error'
                const httpStatus = err instanceof AcademicSourceError ? err.httpStatus : undefined
                return {
                    status: { source: job.id, status: 'failed' as const, reason, httpStatus, count: 0, ms: Date.now() - t0 },
                    entries: [],
                }
            }
        })
    )
    const seen = new Set<string>()
    for (const r of results) {
        statuses.push(r.status)
        for (const e of r.entries) {
            const key = e.url.replace(/\/+$/, '')
            if (seen.has(key)) continue
            seen.add(key)
            entries.push(e)
        }
    }
    return { statuses, entries }
}

/**
 * Searches the academic corpus across peer-reviewed repositories with advanced filters.
 * Throws AbortError on client Stop; provider failures are reported per source.
 */
export async function searchAcademicCorpus(
    query: string,
    options?: AcademicSearchOptions,
    signal?: AbortSignal
): Promise<AcademicSearchResult> {
    const cleanQuery = String(query || '').trim()
    if (!cleanQuery) {
        return {
            ok: false,
            query: '',
            total: 0,
            papers: [],
            formatted: 'Academic query cannot be empty.',
            error: 'query is required',
        }
    }

    assertAcademicNotAborted(signal)

    const opts: AcademicSearchOptions = { ...(options || {}) }
    opts.language = normalizeLanguage(opts.language)
    if (opts.type && !ACADEMIC_WORK_TYPES.includes(opts.type)) opts.type = undefined
    const queryOriginal = String(opts.queryOriginal || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    opts.queryOriginal = queryOriginal && queryOriginal.toLowerCase() !== cleanQuery.toLowerCase() ? queryOriginal : undefined
    const limit = Math.min(Math.max(opts.limit || 5, 1), 10)
    const sortBy = opts.sortBy || 'relevance'
    const useCache = !opts.noCache

    const cacheParts = searchCacheParts(cleanQuery, { ...opts, sortBy }, limit)
    if (useCache) {
        const hit = await academicCacheGet<AcademicSearchResult>('search', cacheParts)
        assertAcademicNotAborted(signal)
        if (hit && Array.isArray(hit.papers)) {
            console.info('[academic] cache hit', { total: hit.papers.length })
            return { ...hit, cached: true }
        }
    }

    const keys = resolveAcademicApiKeys(opts.env)
    const plan = planAcademicSources(cleanQuery, opts)
    const ctx: AcademicSourceContext = { query: cleanQuery, options: { ...opts, sortBy }, limit, keys, profile: plan.profile, signal }
    const trText = plan.turkishText
    // A separate Turkish pass for OpenAlex / Crossref only when the English query differs.
    const bilingual = Boolean(trText && trText.toLowerCase() !== cleanQuery.toLowerCase())
    const trCtx: AcademicSourceContext = { ...ctx, query: trText || cleanQuery }

    const jobs: SourceJob[] = []
    const add = (id: AcademicSourceId, run: () => Promise<AcademicPaper[]>, extra: Partial<SourceJob> = {}) => {
        if (plan.run[id]) jobs.push({ id, listKey: extra.lang ? `${id}:${extra.lang}` : id, run, ...extra })
        else if (!extra.lang) jobs.push({ id, listKey: id, skipReason: plan.skipReason[id] })
    }
    for (const id of SOURCE_ORDER) {
        switch (id) {
            case 'openalex':
                add(id, () => queryOpenAlex(ctx), { keyed: Boolean(keys.openAlexKey) })
                if (bilingual && !opts.language) {
                    add(id, () => queryOpenAlex({ ...trCtx, options: { ...trCtx.options, language: 'tr' }, limit: Math.min(limit, 5) }), {
                        lang: 'tr',
                        keyed: Boolean(keys.openAlexKey),
                    })
                }
                break
            case 'crossref':
                add(id, () => queryCrossref(ctx))
                if (bilingual) add(id, () => queryCrossref({ ...trCtx, limit: Math.min(limit, 5) }), { lang: 'tr' })
                break
            case 'semantic_scholar':
                add(id, () => querySemanticScholar({ ...ctx, limit: Math.min(limit, 5) }), { keyed: Boolean(keys.semanticScholarKey) })
                break
            case 'europepmc':
                add(id, () => queryEuropePmc({ ...ctx, limit: Math.min(limit, 3) }))
                break
            case 'pubmed':
                add(id, () => queryNcbiPmc({ ...ctx, limit: Math.min(limit, 3) }), { keyed: Boolean(keys.ncbiKey) })
                break
            case 'arxiv':
                add(id, () => queryArXiv({ ...ctx, limit: Math.min(limit, 3) }))
                break
            case 'trdizin':
                add(id, () => queryTrDizin({ ...ctx, limit: Math.min(limit, 5) }, trText || cleanQuery))
                break
            case 'doaj':
                add(id, () => queryDoaj({ ...ctx, limit: Math.min(limit, 5) }, cleanQuery))
                break
            case 'core':
                add(id, () => queryCore({ ...ctx, limit: Math.min(limit, 5) }, cleanQuery))
                break
        }
    }

    const encyclopediaQuery = cleanQuery
    const [settled, enc] = await Promise.all([
        Promise.allSettled(
            jobs.map((job) =>
                job.run
                    ? runSource(job.id, job.run, job.keyed, signal, job.lang)
                    : Promise.resolve({
                          status: { source: job.id, status: 'skipped' as const, reason: job.skipReason, count: 0, ms: 0 },
                          papers: [] as AcademicPaper[],
                      })
            )
        ),
        runEncyclopedias(plan, encyclopediaQuery, keys.contactEmail, signal),
    ])

    // Fail closed on client Stop — do not return partial papers as a successful hit.
    assertAcademicNotAborted(signal)

    const statuses: AcademicSourceStatus[] = []
    const collected: AcademicPaper[] = []
    settled.forEach((entry, i) => {
        const job = jobs[i]
        if (entry.status === 'fulfilled') {
            statuses.push(entry.value.status)
            collected.push(...withRanks(entry.value.papers, job.listKey))
        } else {
            const status: AcademicSourceStatus = { source: job.id, status: 'failed', reason: 'error', count: 0, ms: 0 }
            if (job.lang) status.lang = job.lang
            statuses.push(status)
        }
    })
    statuses.push(...enc.statuses)

    // Encyclopedias are supplementary: they never make a search "ok" on their own
    // and their failure never marks scholarly coverage as degraded.
    const attempted = statuses.filter((s) => s.status !== 'skipped' && s.source !== 'sep' && s.source !== 'iep')
    const failed = attempted.filter((s) => s.status === 'failed')
    const allSourcesFailed = attempted.length > 0 && failed.length === attempted.length

    const sets = queryTokenSets(cleanQuery, opts.queryOriginal)
    const fieldLabel = plan.profile?.label
    let ranked = rankAcademicPapers(cleanQuery, applyPostFilters(mergeAcademicPapers(collected), opts), sortBy, fieldLabel, opts.queryOriginal)
    const beforeThreshold = ranked.length
    ranked = ranked.filter((p) => passesRelevanceThreshold(p, sets))
    const droppedWeak = beforeThreshold - ranked.length

    // Open-access resolution via Unpaywall — parallel, bounded, cached ~30 days.
    const oaPool = ranked.slice(0, opts.openAccessOnly ? limit * 2 : limit)
    const missingPdf = oaPool.filter((p) => !p.pdfUrl && cleanDoi(p.doi)).slice(0, UNPAYWALL_MAX_LOOKUPS)
    if (missingPdf.length > 0) {
        await mapWithConcurrency(missingPdf, UNPAYWALL_CONCURRENCY, async (p) => {
            const resolved = await resolveOaPdfViaUnpaywall(p.doi as string, keys.contactEmail, signal, useCache)
            if (resolved) {
                p.pdfUrl = resolved
                p.isOpenAccess = true
            }
        })
        assertAcademicNotAborted(signal)
        ranked = rankAcademicPapers(cleanQuery, ranked, sortBy, fieldLabel, opts.queryOriginal)
    }
    if (opts.openAccessOnly) ranked = ranked.filter((p) => Boolean(p.pdfUrl) || p.isOpenAccess === true)

    // Fallback to verified philosophical canon if scholarly APIs returned zero results.
    if (ranked.length === 0) {
        try {
            const canonMatches = searchPhilosophicalCorpus(cleanQuery, { limit })
            if (canonMatches && canonMatches.matches.length > 0) {
                const canon: AcademicPaper[] = canonMatches.matches.map((m) => ({
                    id: `canon-${m.thinker.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${m.work.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: `${m.thinker}: ${m.work} (${m.section})`,
                    authors: [m.thinker],
                    year: undefined,
                    venue: 'Philosophical Canon (Primary Source)',
                    // No real citation data for canon excerpts — never fake one.
                    citationCount: 0,
                    abstract: m.fragment,
                    topics: m.context ? [m.context] : undefined,
                    source: 'Philosophical Canon' as const,
                }))
                ranked = rankAcademicPapers(cleanQuery, canon, sortBy)
            }
        } catch {
            // canon is best-effort
        }
    }

    // Per-list ranks are internal to fusion; keep the payload / cache lean.
    const finalPapers = ranked.slice(0, limit).map((p) => {
        const copy: AcademicPaper = { ...p }
        delete copy.ranks
        return copy
    })
    assertAcademicNotAborted(signal)

    const failedList = failed.map((s) => `${s.source}${s.lang ? `[${s.lang}]` : ''}: ${s.reason || 'error'}`).join(', ')
    const notes: string[] = []
    if (allSourcesFailed) {
        notes.push(
            `Academic search unavailable — every scholarly source failed (${failedList}). ` +
                'This is NOT evidence that no literature exists: tell the user the academic search was temporarily unavailable' +
                (finalPapers.length > 0 ? '; the items below are fallback results, not a literature search.' : '.')
        )
    } else if (failed.length > 0) {
        notes.push(`Partial coverage (${failedList}); results come only from the sources that responded.`)
    }
    if (droppedWeak > 0) notes.push(`${droppedWeak} weak match${droppedWeak === 1 ? '' : 'es'} below the relevance threshold dropped.`)
    const notice = notes.length ? notes.join(' ') : undefined

    console.info('[academic] sources', {
        statuses: statuses.map(
            (s) => `${s.source}${s.lang ? `[${s.lang}]` : ''}:${s.status}${s.reason ? `:${s.reason}` : ''}:${s.count}${s.keyed ? ':key' : ''}`
        ),
        total: finalPapers.length,
        encyclopedia: enc.entries.length,
        droppedWeak,
    })

    const result: AcademicSearchResult = {
        ok: !allSourcesFailed,
        query: cleanQuery,
        total: finalPapers.length,
        papers: finalPapers,
        formatted: formatAcademicResults(finalPapers, enc.entries),
        bibliography: formatApaBibliography(finalPapers),
        error: allSourcesFailed ? notice : undefined,
        degraded: failed.length > 0,
        allSourcesFailed,
        sources: statuses,
        notice,
        fieldFilter: describeFilters(opts, plan.profile),
        encyclopedia: enc.entries.length ? enc.entries : undefined,
        droppedWeak: droppedWeak || undefined,
        queryOriginal: opts.queryOriginal,
    }

    // Shared cache: full coverage ~3 days, partial coverage 30 min, total failure never.
    if (useCache && !allSourcesFailed && (finalPapers.length > 0 || enc.entries.length > 0)) {
        await academicCachePut('search', cacheParts, result, failed.length > 0 ? ACADEMIC_PARTIAL_TTL_S : ACADEMIC_SEARCH_TTL_S)
    }
    return result
}

// ---------------------------------------------------------------------------
// DOI verification (Crossref /works/{doi}) — used by deterministic citation checks
// ---------------------------------------------------------------------------

export interface DoiLookup {
    doi: string
    found: boolean
    title?: string
    authors?: string[]
    year?: number
    venue?: string
    /** Lookup failed for transient reasons (network / 5xx / 429) — unknown, not "fake". */
    transient?: boolean
}

/** Crossref `/works/{doi}` lookup, cached ~30 days (misses: 1 day). Never throws except on client abort. */
export async function lookupDoiViaCrossref(
    doi: string,
    options: { env?: EnvStore; signal?: AbortSignal; timeoutMs?: number; noCache?: boolean } = {}
): Promise<DoiLookup> {
    const bare = cleanDoi(doi)
    if (!bare) return { doi: String(doi || ''), found: false }
    const useCache = !options.noCache
    if (useCache) {
        const hit = await academicCacheGet<DoiLookup>('crossref-doi', { doi: bare })
        if (hit && typeof hit.found === 'boolean') return hit
    }
    const keys = resolveAcademicApiKeys(options.env)
    let out: DoiLookup
    try {
        const res = await fetchAcademic(
            `https://api.crossref.org/works/${encodeURIComponent(bare)}?mailto=${encodeURIComponent(keys.contactEmail)}`,
            { headers: { 'User-Agent': userAgent(keys.contactEmail), Accept: 'application/json' } },
            options.timeoutMs ?? 4_000,
            options.signal,
            { noRetry: true }
        )
        const data = await readJson<{
            message?: {
                title?: string[]
                author?: Array<{ given?: string; family?: string; name?: string }>
                issued?: { 'date-parts'?: number[][] }
                'container-title'?: string[]
            }
        }>(res)
        const m = data?.message
        out = {
            doi: bare,
            found: true,
            title: m?.title?.[0] ? stripTags(m.title[0]) : undefined,
            authors: (m?.author || [])
                .map((a) => a.name || [a.given, a.family].filter(Boolean).join(' '))
                .filter(Boolean)
                .slice(0, 4),
            year: m?.issued?.['date-parts']?.[0]?.[0],
            venue: m?.['container-title']?.[0] || undefined,
        }
    } catch (err) {
        if (options.signal?.aborted) throw err instanceof Error ? err : abortError()
        const status = err instanceof AcademicSourceError ? err.httpStatus : undefined
        out = status === 404 ? { doi: bare, found: false } : { doi: bare, found: false, transient: true }
    }
    if (useCache && !out.transient) {
        await academicCachePut('crossref-doi', { doi: bare }, out, out.found ? ACADEMIC_DOI_TTL_S : ACADEMIC_DOI_MISS_TTL_S)
    }
    return out
}
