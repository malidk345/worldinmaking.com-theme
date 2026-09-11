/**
 * Lightweight slug generator utility.
 * Decoupled from isomorphic-dompurify / jsdom to prevent bundling errors on Edge / Cloudflare runtimes.
 */
export function toSlug(input: string | null | undefined): string {
    if (typeof input !== 'string') return '';

    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
