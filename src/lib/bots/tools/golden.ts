import { needsLiveWeb } from '../search-intent'
import { isNotebookTask } from '../../notebook-chat-bind'

export type GoldenCase = {
    id: string
    prompt: string
    needsLiveWeb: boolean
    notebookTask: boolean
    identityLock: boolean
}

/** Fixed Ask AI tours. Protocol tests assert the flags; live smoke is optional. */
export const ASK_AI_GOLDEN: GoldenCase[] = [
    {
        id: 'identity',
        prompt: 'Sen kimsin?',
        needsLiveWeb: false,
        notebookTask: false,
        identityLock: true,
    },
    {
        id: 'news',
        prompt: 'Bugün yapay zeka haberlerinde öne çıkan 3 gelişmeyi kaynaklarıyla yaz.',
        needsLiveWeb: true,
        notebookTask: false,
        identityLock: false,
    },
    {
        id: 'mermaid',
        prompt: 'Draw a mermaid diagram of a checkout flow: cart, pay, done.',
        needsLiveWeb: false,
        notebookTask: false,
        identityLock: false,
    },
    {
        id: 'open_posts',
        prompt: 'Open the posts window.',
        needsLiveWeb: false,
        notebookTask: false,
        identityLock: false,
    },
    {
        id: 'notebook_write',
        prompt: 'Bu not defterine kısa bir bölüm ekle: saha notları.',
        needsLiveWeb: false,
        notebookTask: true,
        identityLock: false,
    },
    {
        id: 'revise',
        prompt: 'Rengi değiştir, aynı diyagramı navy yap.',
        needsLiveWeb: false,
        notebookTask: false,
        identityLock: false,
    },
    {
        id: 'site_search',
        prompt: 'Bu sitede unfinished work üzerine yayınlanmış yazı ve defterleri bul.',
        needsLiveWeb: false,
        notebookTask: false,
        identityLock: false,
    },
    {
        id: 'smalltalk',
        prompt: 'Merhaba.',
        needsLiveWeb: false,
        notebookTask: false,
        identityLock: false,
    },
]

export function evaluateGoldenCase(item: GoldenCase) {
    return {
        ...item,
        liveWeb: needsLiveWeb(item.prompt),
        notebook: isNotebookTask(item.prompt),
    }
}
