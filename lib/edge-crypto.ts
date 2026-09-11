// Edge Runtime-safe random hex string generator.
// Node's `crypto.randomBytes` is unavailable on Cloudflare's Edge Runtime, so we
// use the Web Crypto API (`crypto.getRandomValues`), which is available globally
// in both the Edge Runtime and modern browsers.
export function randomHex(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
