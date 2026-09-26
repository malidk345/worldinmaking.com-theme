/**
 * Explicit academic asks → one-line routing hint (package E4).
 *
 * In the audit the model answered "papers citing X", "what does X cite",
 * "similar papers" and "give me exact quotes" with a fresh keyword search
 * instead of related_papers / find_quotes. The tool descriptions now lead with
 * those trigger phrases; this adds a per-turn nudge ONLY when the user's
 * message matches (English + Turkish), so ordinary turns pay no extra tokens.
 * It is advice for the model, never an automatic tool call.
 *
 * Note: without the `u` flag `\b` is ASCII-only, so a Turkish word ending in a
 * non-ASCII letter ("kaynakçası") needs an explicit letter lookahead instead.
 */

export type AcademicRouteIntent = 'citations' | 'references' | 'similar' | 'quotes'

const INTENT_PATTERNS: Array<{ intent: AcademicRouteIntent; re: RegExp }> = [
    {
        intent: 'quotes',
        re: /\b(?:exact|direct|verbatim|word[- ]for[- ]word)\s+(?:quotes?|quotations?|passages?|wording|lines?)\b|\bgive me (?:some |a few )?quotes?\b|\bquote (?:me |directly |the (?:paper|article|author|text|passage))|\bwith page numbers\b|\bpage[- ]level (?:evidence|support)\b|(?:birebir|doğrudan|aynen|tam)\s+alıntı|alıntı(?:lar)?\s*(?:ver|yap|getir|bul|göster)|\bsayfa numaralı alıntı/i,
    },
    {
        intent: 'references',
        re: /\bwhat (?:does|did) .{1,120}? cite\b|\bwhich (?:works|papers|sources) (?:does|did) .{1,120}? cite\b|\b(?:its|their|the paper['’]?s|the article['’]?s|this paper['’]?s) (?:references|bibliography|reference list|sources)\b|\bworks? (?:it|they|this paper) cites?\b|\bcited (?:in|by) (?:this|that|the) (?:paper|article)['’]?s? (?:references|bibliography)\b|kaynakçası(?:nda|ndaki)?(?![a-zçğıöşü])|(?:hangi|neler(?:e|i)) (?:kaynaklara|çalışmalara|eserlere) atıf (?:yap|ver)/i,
    },
    {
        intent: 'citations',
        re: /\b(?:papers?|works?|articles?|studies|research|literature) (?:that |which )?(?:cit(?:e|es|ing)|build(?:s|ing)? on|respond(?:s|ing)? to)\b|\bwho (?:cites|cited|has cited|built on|responded to)\b|\bcited by\b|\bciting (?:papers|works|articles|studies)\b|\bcitations? (?:of|to) (?:this|that|the) (?:paper|article|study|work)\b|atıf (?:yapan|alan|yapılan|veren)|atıfta bulunan|(?:bu|şu) (?:makaleye|çalışmaya|esere) atıf/i,
    },
    {
        intent: 'similar',
        re: /\b(?:similar|related|comparable) (?:papers?|works?|articles?|studies|literature|research)\b|\bpapers? (?:like|similar to)\b|\bmore (?:papers )?like (?:this|that|it)\b|benzer (?:makale|çalışma|yayın|araştırma)|(?:ilgili|ilişkili) (?:makale|çalışma|yayın)lar/i,
    },
]

/** All explicit academic intents in a message (quotes first, then graph directions). */
export function detectAcademicRouteIntents(message: string): AcademicRouteIntent[] {
    const text = String(message || '').slice(0, 2_000)
    if (!text.trim()) return []
    return INTENT_PATTERNS.filter(({ re }) => re.test(text)).map(({ intent }) => intent)
}

const GRAPH_DIRECTION: Record<Exclude<AcademicRouteIntent, 'quotes'>, string> = {
    citations: 'citations',
    references: 'references',
    similar: 'similar',
}

/** Short hint for the context block ('' when the message is not an explicit ask). */
export function formatAcademicRoutingHint(message: string): string {
    const intents = detectAcademicRouteIntents(message)
    if (!intents.length) return ''
    const parts: string[] = []
    const graph = intents.filter((i): i is Exclude<AcademicRouteIntent, 'quotes'> => i !== 'quotes')
    if (graph.length) {
        const directions = graph.map((i) => `"${GRAPH_DIRECTION[i]}"`).join(' / ')
        parts.push(
            `call related_papers (paper = its [P#] or DOI; direction ${directions}) instead of a new keyword search — search_academic_corpus first only if the paper has no [P#]/DOI yet`
        )
    }
    if (intents.includes('quotes')) {
        parts.push(`call find_quotes (paper = [P#] or DOI, claim in the paper's language) and quote only what it returns`)
    }
    return `Tool routing (the user explicitly asked): ${parts.join('; ')}.`
}
