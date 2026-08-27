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
 * Server/client shared canonicalizer: parse the model text into documents +
 * the public bubble. Extraction stays in one function; this is the policy.
 */
export function finalizeArtifactTurn(prompt: string, rawText: string): ArtifactTurn {
    const intent = classifyIntent(prompt)
    const publicText = stripThinkingBlocks(String(rawText || ''))
    const artifacts = extractArtifactsFromContent(publicText, prompt) as ArtifactDocument[]
    let visibleText = stripChartArtifactMarkup(publicText)
    if (artifacts.length > 0) {
        visibleText = stripExtractedArtifactMarkup(visibleText)
    }
    visibleText = visibleText.trim()
    if (!visibleText && artifacts[0]) {
        visibleText = artifactPlaceholder(artifacts[0])
    }
    return { intent, artifacts, visibleText }
}
