import { isChartRequest } from '../ai/chart-artifacts'
import { isDiagramRequest } from '../mermaid-patterns'
import type { ArtifactIntent } from './kinds'

const BUILD_VERB =
    /(yap\b|yapar m[ıi]s[ıi]n|yapabilir misin|oluştur|olustur|kur\b|çiz\b|ciz\b|tasarla|hazırla|hazirla|kodla|üret|uret|\bbuild\b|\bmake\b|\bcreate\b|\bdesign\b|\bgenerate\b|\bimplement\b|\bdraw\b|\bmock\b|code me|write me|put together|whip up|spin up|set up|craft)/i

const SOFT_ASK =
    /(\bi want\b|\bi need\b|\bshow me\b|\bgive me\b|\bcan you\b|\bcould you\b|\bplease\b|\bwanna\b|\blet's\b|\blets\b)/i

const ASK_ONLY =
    /(nedir|neden|ne demek|nasıl çalış|nasil calis|anlat\b|açıkla|acikla|yorumla|tartış|tartis|\bexplain\b|\bsummarize\b|\bdiscuss\b|\bwhat is\b|\bwhy is\b|\bhow does\b|\btell me about\b|\bwhat does\b)/i

const DOC_ONLY =
    /(belge|doküman|dokuman|\bdocument\b|dilekçe|dilekce|sözleşme|sozlesme|rapor yaz|write a (?:report|letter|essay|contract))/i

const TABLE_ONLY = /\b(tablo|table|karşılaştırma|karsilastirma|comparison)/i

const SCREEN_HINT =
    /(ekran|arayüz|arayuz|sayfa tasarla|\bui\b|\bux\b|dashboard|widget|oyun|\bgame\b|landing|login screen|mockup|wireframe|interface|screen|calculator|todo|kanban|quiz|gallery|calendar|portfolio|\bapp\b|timer|clock|weather|navbar|homepage)/i

const ADMIN_NAV = /(open admin|admin os|admin panelini aç|\/admin\b)/i

const CODE_ONLY =
    /\b(source code|kodu yaz|write (?:the )?code|typescript|python script|sql query)\b/i

/**
 * Exclusive intent. Priority is the contract:
 * mermaid → table → chart → markdown doc → react UI → code → chat.
 */
export function classifyIntent(prompt: string): ArtifactIntent {
    const text = String(prompt || '').trim()
    if (!text) return 'chat'
    if (ADMIN_NAV.test(text)) return 'chat'
    if (isDiagramRequest(text)) return 'mermaid'
    if (TABLE_ONLY.test(text) && !SCREEN_HINT.test(text)) return 'table'
    if (isChartRequest(text) && !SCREEN_HINT.test(text)) return 'chart'
    if (DOC_ONLY.test(text) && !SCREEN_HINT.test(text)) return 'markdown'
    if (ASK_ONLY.test(text) && !BUILD_VERB.test(text)) return 'chat'
    if (CODE_ONLY.test(text) && !SCREEN_HINT.test(text) && !isChartRequest(text)) return 'code'
    if (BUILD_VERB.test(text) || (SOFT_ASK.test(text) && SCREEN_HINT.test(text)) || SCREEN_HINT.test(text)) {
        if (isChartRequest(text) && !SCREEN_HINT.test(text)) return 'chart'
        return 'react_ui'
    }
    if (isChartRequest(text)) return 'chart'
    return 'chat'
}

export function isAdminNavigationRequest(prompt: string): boolean {
    return ADMIN_NAV.test(String(prompt || ''))
}
