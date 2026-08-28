import { stripChartArtifactMarkup } from '../ai/chart-artifacts'
import { stripThinkingBlocks } from '../bots/thinking-tags'
import {
    extractArtifactsFromContent,
    stripExtractedArtifactMarkup,
} from '../../components/ClaudeWorkspaceChat/utils/extractArtifacts'
import { classifyIntent } from './intent'
import type { ArtifactDocument, ArtifactTurn } from './kinds'
import { artifactPlaceholder } from './renderers'

/**
 * Tool-produced documents win; fenced extraction is the fallback for
 * models that still dump source in the reply.
 */
export function mergeProducedArtifacts(
    produced: ArtifactDocument[] | undefined,
    extracted: ArtifactDocument[]
): ArtifactDocument[] {
    const primary = (produced || []).filter((item) => item && String(item.content || '').trim())
    if (primary.length === 0) return extracted
    const seen = new Set(primary.map((item) => `${item.type}::${String(item.content).slice(0, 80)}`))
    const extra = extracted.filter((item) => {
        const key = `${item.type}::${String(item.content || '').slice(0, 80)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
    return [...primary, ...extra]
}

/**
 * Server/client shared canonicalizer: parse the model text into documents +
 * the public bubble. Extraction stays in one function; this is the policy.
 */
export function finalizeArtifactTurn(
    prompt: string,
    rawText: string,
    produced?: ArtifactDocument[],
    opts?: { scrape?: boolean }
): ArtifactTurn {
    const intent = classifyIntent(prompt)
    const publicText = stripThinkingBlocks(String(rawText || ''))
    const producedDocs = (produced || []).filter((item) => item && String(item.content || '').trim())
    const scrape = opts?.scrape !== false && producedDocs.length === 0
    const extracted = scrape
        ? (extractArtifactsFromContent(publicText, prompt) as ArtifactDocument[])
        : []
    const artifacts = mergeProducedArtifacts(producedDocs, extracted)
    let visibleText = stripChartArtifactMarkup(publicText)
    if (artifacts.length > 0 || !scrape) {
        visibleText = stripExtractedArtifactMarkup(visibleText)
    }
    visibleText = visibleText.trim()
    if (!visibleText && artifacts[0]) {
        visibleText = artifactPlaceholder(artifacts[0])
    }
    return { intent, artifacts, visibleText }
}
