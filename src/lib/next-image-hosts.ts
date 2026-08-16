/**
 * Hosts next/image is allowed to optimize. Keep in sync with next.config.js
 * `images.remotePatterns`. Anything else must render as a plain <img>.
 */
export const NEXT_IMAGE_HOSTS =
    /^(res\.cloudinary\.com|user-images\.githubusercontent\.com|raw\.githubusercontent\.com|(?:[\w-]+\.)?posthog\.com|(?:[\w-]+\.)?supabase\.co|(?:[\w-]+\.)?supabase\.in)$/i

export function canOptimizeRemoteImage(src: string): boolean {
    const value = (src || '').trim()
    if (!value || value.startsWith('data:') || value.startsWith('blob:')) return false
    if (value.startsWith('/') && !value.startsWith('//')) return true
    try {
        const host = new URL(value, 'https://worldinmaking.com').hostname
        return NEXT_IMAGE_HOSTS.test(host)
    } catch {
        return false
    }
}
