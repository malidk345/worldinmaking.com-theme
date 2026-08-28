/**
 * Deterministic search/format heuristics. No LLM, no runtime-env.
 * Used by intent-router and unit tests.
 */

export interface IntentResult {
    needsSearch: boolean
    searchQuery: string | null
    formatRequest: 'todo' | 'plan' | 'none'
}

export type SearchIntentSource = 'force' | 'heuristic' | 'llm' | 'none'

export interface ResolvedSearchIntent extends IntentResult {
    source: SearchIntentSource
}

export const DEFAULT_INTENT: IntentResult = { needsSearch: false, searchQuery: null, formatRequest: 'none' }

const SEARCH_HINT =
    /haber|\b(araştır|arastir|internette|güncel|guncel|son durum|son dakika|kimdir|ne zaman|hava durumu|seçim|secim|dolar|euro|borsa|skor|fiyat[ıi]?)\b|\b(search|look up|looked up|google|latest|breaking|headline|news|who is|who was|who won|when did|when is|where is|how much|price of|right now|today'?s)\b|\b(20(2\d|3\d)|president|başkan|baskan|ceo|weather|stock|crypto|bitcoin|election|winner)\b/i

const NO_SEARCH_HINT =
    /^(hi|hey|hello|thanks|thank you|merhaba|selam|nasılsın|nasilsin|teşekkür|tesekkurler?)([!.\s]|$)/i

const SELF_HINT =
    /\b(what is your|what's your|who are you|sen kimsin|adın ne|adin ne)\b/i

const CREATIVE_HINT =
    /\b(write|yaz|poem|şiir|siir|rewrite|çevir|cevir|translate|özetle|ozetle|continue|devam et|code|kod yaz|essay|hikaye)\b/i

const OPINION_HINT =
    /\b(think|feel|opinion|sence|bence|düşünüyor|dusunuyor|anlamı nedir|anlami nedir|felsefe|philosophy|meaning of)\b/i

const FACTUAL_QUESTION =
    /\b(who is|who's|what is|what's|when did|when is|where is|how much|how many|kimdir|nedir|ne zaman|nerede|kaç|kac)\b/i

const FOLLOW_UP_HINT =
    /^(ya|peki|peki ya|bir de|o zaman|şimdi|simdi|ya da|what about|how about|and (what|how|the)|also|same for|that one)\b/i

const DEICTIC_HINT =
    /\b(ya|peki|bu|şu|su|o|it|this|that|those|them|orada|aynı|ayni|same|there)\b/i

const NEWS_HINT =
    /(haber|son dakika|son durum|güncel|guncel|breaking|headline|\bnews\b|latest|today'?s|right now|bugün|bugun)/i

export function inferFormat(text: string): IntentResult['formatRequest'] {
    if (/\b(to-?do|yapılacak|yapilacak|checklist)\b/i.test(text)) return 'todo'
    if (/\b(plan|yol haritası|yol haritasi|roadmap)\b/i.test(text)) return 'plan'
    return 'none'
}

export function extractSearchQuery(text: string): string {
    let query = text.trim()
    query = query.replace(/^(lütfen|lutfen|please)\s+/i, '')
    query = query.replace(/^(can you|could you|would you)(\s+please)?\s+/i, '')
    query = query.replace(/^(internette\s+)?(araştır|arastir|arama yap|ara)\s*[:\-]?\s*/i, '')
    query = query.replace(/^(search(\s+the\s+web)?(\s+for)?|look\s+up|google)\s*[:\-]?\s*/i, '')
    return (query.trim() || text.trim()).slice(0, 500)
}

export function isNewsQuery(text: string): boolean {
    return NEWS_HINT.test(text)
}

/** Headlines, prices, "today" — must hit live search, not model memory. */
export function needsLiveWeb(text: string): boolean {
    const value = String(text || '')
    if (!value.trim()) return false
    if (SELF_HINT.test(value) || NO_SEARCH_HINT.test(value)) return false
    return isNewsQuery(value) || SEARCH_HINT.test(value)
}

export function looksLikeFollowUp(text: string): boolean {
    const trimmed = text.trim()
    if (!trimmed) return false
    if (FOLLOW_UP_HINT.test(trimmed)) return true
    const words = trimmed.split(/\s+/).filter(Boolean)
    return words.length <= 5 && /[?؟]$/.test(trimmed)
}

/**
 * Short / deictic follow-ups need the previous user turn or Tavily
 * searches "ya ethereum?" with no topic context.
 */
export function expandSearchQuery(query: string, previousUserText?: string | null): string {
    const current = extractSearchQuery(query)
    const previous = (previousUserText || '').trim()
    if (!previous) return current
    const words = current.split(/\s+/).filter(Boolean)
    const needsContext = words.length <= 4 || DEICTIC_HINT.test(current)
    if (!needsContext) return current
    return `${previous} ${current}`.replace(/\s+/g, ' ').trim().slice(0, 500)
}

/**
 * Cheap, deterministic search/format guess. High confidence skips the LLM hop.
 */
export function inferSearchIntent(question: string): IntentResult & { confidence: 'high' | 'low' } {
    const text = question.trim()
    if (!text) return { ...DEFAULT_INTENT, confidence: 'high' }

    const formatRequest = inferFormat(text)
    const wantsSearch = SEARCH_HINT.test(text)
    const looksCreative = CREATIVE_HINT.test(text)
    const looksOpinion = OPINION_HINT.test(text)
    const greeting = NO_SEARCH_HINT.test(text)

    if (SELF_HINT.test(text)) {
        return { needsSearch: false, searchQuery: null, formatRequest, confidence: 'high' }
    }
    if (wantsSearch && !looksOpinion) {
        return { needsSearch: true, searchQuery: extractSearchQuery(text), formatRequest, confidence: 'high' }
    }
    if (greeting || (looksCreative && !wantsSearch)) {
        return { needsSearch: false, searchQuery: null, formatRequest, confidence: 'high' }
    }
    if (FACTUAL_QUESTION.test(text) && !looksOpinion) {
        return { needsSearch: true, searchQuery: extractSearchQuery(text), formatRequest, confidence: 'high' }
    }
    if (text.length > 400 && !wantsSearch) {
        return { needsSearch: false, searchQuery: null, formatRequest, confidence: 'high' }
    }
    return {
        needsSearch: false,
        searchQuery: wantsSearch ? extractSearchQuery(text) : null,
        formatRequest,
        confidence: 'low',
    }
}
