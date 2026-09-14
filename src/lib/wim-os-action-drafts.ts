/**
 * Pure helper for normalizing WIM OS action payloads and handling draft storage.
 */

export const WIM_FORUM_DRAFT_STORAGE_KEY = 'wim_forum_topic_draft_v1';

export interface ForumDraftPayload {
    title?: string;
    content?: string;
    category?: string;
}

export interface QuestionFormInitialValues {
    subject: string;
    body: string;
    topic?: string;
}

/**
 * Normalizes an OS action payload into the shape expected by QuestionForm initialValues.
 */
export function normalizeForumDraft(payload: ForumDraftPayload): QuestionFormInitialValues {
    return {
        subject: payload.title || '',
        body: payload.content || '',
        topic: payload.category || 'discussion',
    };
}

/**
 * Writes the normalized forum draft to sessionStorage.
 */
export function writeForumDraft(payload: ForumDraftPayload): void {
    try {
        const normalized = normalizeForumDraft(payload);
        sessionStorage.setItem(WIM_FORUM_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
        console.error('Failed to write forum draft to storage', e);
    }
}

/**
 * Reads and clears the forum draft from sessionStorage.
 */
export function readForumDraft(): QuestionFormInitialValues | null {
    try {
        const draft = sessionStorage.getItem(WIM_FORUM_DRAFT_STORAGE_KEY);
        if (draft) {
            sessionStorage.removeItem(WIM_FORUM_DRAFT_STORAGE_KEY);
            return JSON.parse(draft) as QuestionFormInitialValues;
        }
    } catch (e) {
        console.error('Failed to read forum draft from storage', e);
    }
    return null;
}

/**
 * Sanitizes the system appearance theme or wallpaper string.
 */
export function sanitizeSystemAppearanceTheme(theme?: string, maxLength = 20): string | undefined {
    if (!theme) return undefined;
    return theme.trim().toLowerCase().slice(0, maxLength);
}
