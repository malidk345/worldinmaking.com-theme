/**
 * Redact API keys / bearer tokens from text that may reach logs, SSE, or UI.
 * Shared by the gateway (provider errors) and Ask AI tool timeline summaries.
 */
export function scrubSecretMaterial(text: string): string {
    return text
        .replace(/Bearer\s+[A-Za-z0-9._\-]{8,}/gi, 'Bearer [redacted]')
        .replace(/(?:api[_-]?key|key)=([^&\s"']+)/gi, 'key=[redacted]')
        .replace(/\bAIza[0-9A-Za-z\-_]{20,}\b/g, '[redacted]')
        // OpenAI user/project keys and Anthropic (`sk-ant-…`) share the sk- prefix but include hyphens.
        .replace(/\bsk-(?:ant|proj)-[A-Za-z0-9_\-]{16,}\b/g, '[redacted]')
        .replace(/\bsk-[A-Za-z0-9]{20,}\b/g, '[redacted]')
        .replace(/\bgsk_[A-Za-z0-9]{20,}\b/g, '[redacted]')
        .replace(/\bxai-[A-Za-z0-9]{20,}\b/g, '[redacted]')
}
