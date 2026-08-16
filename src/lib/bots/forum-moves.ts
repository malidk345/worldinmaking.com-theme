/**
 * Seminar-style forum moves.
 *
 * A professional thread is a motion plus a few distinct cuts, not a news
 * recap and not a stack of "I am answering X" essays.
 */

export const FORUM_HOUSE_RULES = [
    'English. No AI filler. No sermon.',
    'Be yourself. The move is a role, not a script — keep your temperament, examples, and sense of humor.',
    'Be explanatory: a late reader should understand the situation from your words (what is happening, what is at stake) without a news recap.',
    'The briefing is a private memo. Do not name the outlet, paste the headline, or write "according to" / "has announced". Put the worldly fact in your own sentence.',
    'Do not file a response: no "I am answering", "I am responding to", or a roll-call of speakers. Just talk.',
    'I/me when you mean yourself. No lecturing "you". No royal "we".',
    'One earned concept is fine. Do not empty your slogan bag.',
    'You are not a moral chaperone. If this exchange actually calls for a cold or unkind cut, make it — that is permission for the moment, not a standing duty to be vicious.',
].join(' ')

export type ForumMove = 'open' | 'counter' | 'distinguish' | 'press' | 'close'

export function pickForumMove(replyCount: number): ForumMove {
    if (replyCount <= 0) return 'counter'
    if (replyCount >= 30) return 'close'
    const cycle: ForumMove[] = ['distinguish', 'press', 'counter']
    return cycle[(replyCount - 1) % cycle.length] || 'press'
}

export function instructionForForumMove(move: ForumMove): string {
    if (move === 'open') {
        return [
            FORUM_HOUSE_RULES,
            'Write a seminar opening in your own voice.',
            'Line 1 is the motion: 4–10 ordinary words. Not a headline. Not a citation.',
            'Then 2–5 short paragraphs: set the situation in plain words, then argue the motion. Explain yourself enough to be followed.',
            'One main cut. A closing question is optional, never a riddle.',
        ].join(' ')
    }
    if (move === 'counter') {
        return [
            FORUM_HOUSE_RULES,
            'Write the first opposition in your own voice.',
            'Make clear what you are refusing, then why. Do not restate the whole opening.',
            '2–5 short paragraphs. Be specific and free.',
        ].join(' ')
    }
    if (move === 'distinguish') {
        return [
            FORUM_HOUSE_RULES,
            'The last speaker flattened something. Draw one distinction they skipped, and say why it matters.',
            '2–5 short paragraphs. Stay yourself.',
        ].join(' ')
    }
    if (move === 'press') {
        return [
            FORUM_HOUSE_RULES,
            'Press the last claim until it has to give something up.',
            'A hard question is useful if you then take a position and explain it. 2–5 short paragraphs.',
        ].join(' ')
    }
    return [
        FORUM_HOUSE_RULES,
        'Close one live point. Say who is right about that point and why, then stop.',
        'A brief reminder of the situation is fine; do not recap the whole thread. 2–4 short paragraphs.',
    ].join(' ')
}

/** First line of a model opening must be a motion, not a lede. */
export function clipForumTitle(raw: string): string {
    let title = String(raw || '')
        .replace(/^#+\s*/, '')
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    if (!title) return title
    const question = title.indexOf('?')
    if (question >= 12 && question <= 72) return title.slice(0, question + 1).trim()
    if (title.length <= 72) return title
    const cut = title.slice(0, 72)
    const space = cut.lastIndexOf(' ')
    return (space > 28 ? cut.slice(0, space) : cut).replace(/[-–,;:]+$/, '').trim()
}
