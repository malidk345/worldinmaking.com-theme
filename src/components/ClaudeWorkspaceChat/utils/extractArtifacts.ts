import { Artifact, ArtifactType } from '../types';
import { extractChartArtifacts, isChartRequest, parseChartSpec } from 'lib/ai/chart-artifacts';
import { extractUiScreenSource, isUiDesignRequest, looksLikeReactSource } from 'lib/ai/design-request';
import {
  artifactLooksLikeMermaid,
  cleanMermaidSource,
  isDiagramRequest,
  isMermaidLanguage,
  isMermaidSource,
} from 'lib/mermaid-patterns';

/**
 * Extracts Artifact objects from assistant response text or user prompt directives.
 * Supports:
 * 1. Explicit <antArtifact identifier="..." type="..." title="...">...content...</antArtifact> or <artifact> tags
 * 2. Markdown code blocks (```html, ```react, ```svg, ```markdown, ```table, ```json, etc.)
 * 3. Document fallback when user explicitly requests a document ("belge oluştur", "belge üret", "create document")
 */
export function titleFromArtifactContent(content: string, fallback = 'Untitled'): string {
  const heading = content.match(/^#{1,3}\s+(.+)$/m)
  if (heading?.[1]) return heading[1].trim().slice(0, 80)
  const first = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('<') && !line.startsWith('```') && !line.startsWith('{') && !line.startsWith('|'))
  if (first) {
    return first.replace(/^[*_`>~>\-\d.]+(?:\s+)/, '').trim().slice(0, 80) || fallback
  }
  return fallback
}

function normalizeArtifactBody(content: string): string {
  return content.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function isPromptLikeTitle(title: string, userPrompt: string): boolean {
  const titleNorm = title.toLowerCase().replace(/[\s\-_?!.]+/g, '')
  const promptNorm = userPrompt.toLowerCase().replace(/[\s\-_?!.]+/g, '')
  if (titleNorm.length < 8 || promptNorm.length < 8) return false
  if (titleNorm === promptNorm) return true
  const almostWholePrompt = titleNorm.length >= promptNorm.length * 0.8
  if (almostWholePrompt && (titleNorm.includes(promptNorm) || promptNorm.includes(titleNorm))) return true
  return false
}

export function dedupeArtifacts<T extends { id?: string; identifier?: string; type: string; title: string; content: string }>(
  items: T[]
): T[] {
  const result: T[] = []
  for (const item of items) {
    const body = normalizeArtifactBody(item.content)
    const existingIndex = result.findIndex((candidate) => {
      if (item.id && candidate.id && item.id === candidate.id) return true
      if (item.identifier && candidate.identifier && item.identifier === candidate.identifier) return true
      const other = normalizeArtifactBody(candidate.content)
      if (!body || !other) return false
      if (body === other) return true
      if (body.includes(other) || other.includes(body)) return true
      return item.title.trim().toLowerCase() === candidate.title.trim().toLowerCase()
    })
    if (existingIndex < 0) {
      result.push(item)
      continue
    }
    const current = result[existingIndex]
    const currentBody = normalizeArtifactBody(current.content)
    const incomingIsTighterTable = item.type === 'table' && current.type !== 'table'
    const incomingIsInnerCopy = body.length > 20 && currentBody.includes(body) && body.length < currentBody.length
    if (incomingIsTighterTable || incomingIsInnerCopy) result[existingIndex] = item
  }
  return result
}

function isPromptEcho(content: string, userPrompt: string): boolean {
  const body = normalizeArtifactBody(content)
  const prompt = normalizeArtifactBody(userPrompt)
  if (body.length < 8 || prompt.length < 8) return false
  return body === prompt || (body.length <= prompt.length + 16 && (body.includes(prompt) || prompt.includes(body)))
}

function dropPromptEchoes<T extends { title: string; content: string }>(items: T[], userPrompt: string): T[] {
  const kept = items.filter((item) => !isPromptLikeTitle(item.title, userPrompt) && !isPromptEcho(item.content, userPrompt))
  return kept.length > 0 ? kept : items
}

function resolveArtifactTitle(rawTitle: string | undefined, content: string, userPrompt: string, fallback: string): string {
  const fromContent = titleFromArtifactContent(content, fallback)
  const title = (rawTitle || '').trim() || fromContent
  if (isPromptLikeTitle(title, userPrompt)) return fromContent === title ? fallback : fromContent
  return title
}

function extractGfmTables(content: string): string[] {
  const tables: string[] = []
  const tablePattern =
    /(?:^|\n)((?:[^\n]*\n)?\|[^\n]+\|\r?\n\|[-:| \t]+\|(?:\r?\n\|[^\n]+\|)*)/g
  let match: RegExpExecArray | null
  while ((match = tablePattern.exec(content)) !== null) {
    const table = match[1].trim()
    if (table.split('\n').filter(Boolean).length >= 2) tables.push(table)
  }
  return tables
}

export function stripExtractedArtifactMarkup(text: string): string {
  return String(text || '')
    .replace(/<(?:antArtifact|artifact)\b[\s\S]*?<\/(?:antArtifact|artifact)>/gi, '')
    .replace(/<(?:antArtifact|artifact)\b[\s\S]*$/gi, '')
    .replace(/```[a-z0-9_-]*[^\n]*\n[\s\S]*?```/gi, '')
    .replace(/```[a-z0-9_-]*[^\n]*\n[\s\S]*$/gi, '')
    .trim()
}

export function extractArtifactsFromContent(content: string, userPrompt: string): Artifact[] {
  if (!content || !content.trim()) return [];
  const chartArtifacts: Artifact[] = extractChartArtifacts(content, userPrompt).map((artifact, index) => ({
    id: `art-${Date.now()}-chart-${index + 1}`,
    title: artifact.title,
    type: 'chart',
    language: 'json',
    content: artifact.content,
    chartSpec: artifact.chartSpec,
    description: artifact.description,
    version: 1,
    createdAt: new Date().toISOString(),
  }));
  const artifacts: Artifact[] = [];
  const now = new Date().toISOString();

  // 1. Explicit <antArtifact> or <artifact> tags
  const antArtifactRegex = /<(?:antArtifact|artifact)\s+([^>]*?)>([\s\S]*?)<\/(?:antArtifact|artifact)>/gi;
  let match: RegExpExecArray | null;

  function takeUnclosedAntArtifact(source: string): { attrs: string; body: string } | null {
    const opens = [...source.matchAll(/<(?:antArtifact|artifact)\s+([^>]*?)>/gi)]
    const last = opens[opens.length - 1]
    if (!last || last.index === undefined) return null
    const body = source.slice(last.index + last[0].length)
    if (/<\/(?:antArtifact|artifact)>/i.test(body)) return null
    return { attrs: last[1] || '', body }
  }

  while ((match = antArtifactRegex.exec(content)) !== null) {
    const attrStr = match[1];
    const artContent = match[2]?.trim();

    const titleMatch = attrStr.match(/title=["']([^"']+)["']/i) || attrStr.match(/identifier=["']([^"']+)["']/i);
    const identifierMatch = attrStr.match(/identifier=["']([^"']+)["']/i);
    const typeMatch = attrStr.match(/type=["']([^"']+)["']/i);
    const langMatch = attrStr.match(/language=["']([^"']+)["']/i);
    const rawType = (typeMatch ? typeMatch[1] : 'markdown').toLowerCase();

    // Chart envelopes are parsed by the shared, validated chart parser above.
    if (rawType === 'chart' || rawType === 'visualization') continue;

    const type: ArtifactType = classifyArtifactType(rawType, langMatch?.[1], artContent);
    const title = resolveArtifactTitle(titleMatch?.[1], artContent, userPrompt, 'Untitled');

    if (artContent) {
      artifacts.push({
        id: `art-${Date.now()}-${artifacts.length + 1}`,
        identifier: identifierMatch?.[1],
        title,
        type,
        language: type === 'mermaid' ? 'mermaid' : langMatch ? langMatch[1] : undefined,
        content: type === 'mermaid' ? cleanMermaidSource(artContent) : artContent,
        description: type === 'mermaid' ? 'Diagram' : type === 'markdown' || type === 'table' ? 'Document' : 'Generated artifact',
        version: 1,
        createdAt: now,
      });
    }
  }

  if (artifacts.length === 0) {
    const unclosed = takeUnclosedAntArtifact(content)
    if (unclosed?.body.trim()) {
      const titleMatch = unclosed.attrs.match(/title=["']([^"']+)["']/i)
      const identifierMatch = unclosed.attrs.match(/identifier=["']([^"']+)["']/i)
      const typeMatch = unclosed.attrs.match(/type=["']([^"']+)["']/i)
      const langMatch = unclosed.attrs.match(/language=["']([^"']+)["']/i)
      const rawType = (typeMatch ? typeMatch[1] : 'react').toLowerCase()
      if (rawType !== 'chart' && rawType !== 'visualization') {
        const artContent = unclosed.body.replace(/^```[a-z0-9_-]*[ \t]*\r?\n?/i, '').trim()
        const type: ArtifactType = classifyArtifactType(rawType, langMatch?.[1], artContent)
        artifacts.push({
          id: `art-${Date.now()}-open`,
          identifier: identifierMatch?.[1],
          title: resolveArtifactTitle(titleMatch?.[1], artContent, userPrompt, 'Untitled'),
          type,
          language: type === 'mermaid' ? 'mermaid' : langMatch ? langMatch[1] : undefined,
          content: type === 'mermaid' ? cleanMermaidSource(artContent) : artContent,
          description: type === 'mermaid' ? 'Diagram' : 'Generated artifact',
          version: 1,
          createdAt: now,
        })
      }
    }
  }

  const hadTaggedArtifacts = artifacts.length > 0
  extractFencedArtifacts(content, artifacts, chartArtifacts, userPrompt, now, hadTaggedArtifacts)

  if (hadTaggedArtifacts) {
    const merged = finalizeArtifacts([...chartArtifacts, ...artifacts], userPrompt)
    const hasUi = merged.some((item) => item.type === 'react' || item.type === 'html')
    if (hasUi || !isUiDesignRequest(userPrompt)) return merged
  }

  // 2. Remaining fallbacks when no tagged artifact was produced.
  // "tablo" is NOT a document request — it used to wrap the whole assistant
  // reply as a second markdown artifact next to the real table.
  const isDocumentRequested = /(belge|doküman|dokuman|document|artifact|taslak|dilekçe|dilekce|sözleşme|sozlesme|rapor)/i.test(userPrompt);
  const isTableRequested = /\b(tablo|table|karşılaştırma|karsilastirma|comparison)\b/i.test(userPrompt);

  // 3. A markdown table in the visible reply is at most one table artifact.
  if (artifacts.length === 0 && isTableRequested) {
    const tables = extractGfmTables(content)
    if (tables[0]) {
      artifacts.push({
        id: `art-${Date.now()}-table`,
        identifier: 'table-1',
        title: resolveArtifactTitle(undefined, content, userPrompt, 'Tablo'),
        type: 'table',
        language: 'markdown',
        content: tables[0],
        description: 'Document',
        version: 1,
        createdAt: now,
      })
    }
  }

  if (!artifacts.some((item) => item.type === 'mermaid') && isDiagramRequest(userPrompt)) {
    const body = cleanMermaidSource(content)
    if (isMermaidSource(body)) {
      artifacts.push({
        id: `art-${Date.now()}-mermaid`,
        identifier: 'diagram-1',
        title: resolveArtifactTitle(undefined, body, userPrompt, 'Diagram'),
        type: 'mermaid',
        language: 'mermaid',
        content: body,
        description: 'Diagram',
        version: 1,
        createdAt: now,
      })
    }
  }

  if (!artifacts.some((item) => item.type === 'react' || item.type === 'html') && isUiDesignRequest(userPrompt)) {
    const screen = extractUiScreenSource(content)
    if (screen) {
      artifacts.push({
        id: `art-${Date.now()}-ui`,
        identifier: 'ui-1',
        title: resolveArtifactTitle(screen.title, screen.content, userPrompt, 'Designed screen'),
        type: 'react',
        language: 'react',
        content: screen.content,
        description: 'Sandbox screen',
        version: 1,
        createdAt: now,
      })
    }
  }

  // 4. Fallback: only real document asks ("belge oluştur"), never table/chart/UI keywords.
  if (artifacts.length === 0 && chartArtifacts.length === 0 && isDocumentRequested && content.length > 15) {
    const isReactContent = content.includes('import React') || content.includes("from 'react'") || content.includes('from "react"');

    artifacts.push({
      id: `art-${Date.now()}-doc`,
      identifier: isReactContent ? 'ui-1' : 'doc-1',
      title: resolveArtifactTitle(undefined, content, userPrompt, isReactContent ? 'Interface' : 'Untitled'),
      type: isReactContent ? 'react' : 'markdown',
      language: isReactContent ? 'react' : 'markdown',
      content: isReactContent ? content.replace(/```(?:react|jsx|js)?/gi, '').replace(/```/g, '').trim() : content,
      description: isReactContent ? 'AI Generated UI' : 'Document',
      version: 1,
      createdAt: now,
    });
  }

  return finalizeArtifacts([...chartArtifacts, ...artifacts], userPrompt);
}

function classifyArtifactType(rawType: string, language: string | undefined, content: string): ArtifactType {
  const known: ArtifactType[] = ['code', 'html', 'svg', 'markdown', 'react', 'json', 'table', 'mermaid']
  let type: ArtifactType = (known.includes(rawType as ArtifactType) ? rawType : 'markdown') as ArtifactType
  if (type === 'mermaid' || isMermaidLanguage(language) || isMermaidSource(content)) return 'mermaid'
  if (type === 'code' && looksLikeReactSource(content)) return 'react'
  return type
}

function extractFencedArtifacts(
  content: string,
  artifacts: Artifact[],
  chartArtifacts: Artifact[],
  userPrompt: string,
  now: string,
  mermaidOnly: boolean
): void {
  const codeBlockRegex = /```([a-z0-9_-]*)[ \t]*\r?\n([\s\S]*?)```/gi
  let codeMatch: RegExpExecArray | null
  let blockCount = 0

  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    const lang = (codeMatch[1] || 'markdown').toLowerCase()
    const blockContent = (codeMatch[2] || '').trim()
    const isMermaidBlock = isMermaidLanguage(lang) || isMermaidSource(blockContent)
    const minLength = isMermaidBlock ? 8 : 20
    if (!blockContent || blockContent.length < minLength) continue

    const chartSpec = parseChartSpec(blockContent)
    const isChartBlock =
      ['chart', 'chartjson'].includes(lang) ||
      (lang === 'json' && isChartRequest(userPrompt) && Boolean(chartSpec))
    if (isChartBlock && chartSpec && !chartArtifacts.some((artifact) => artifact.content === JSON.stringify(chartSpec))) {
      chartArtifacts.push({
        id: `art-${Date.now()}-chart-${chartArtifacts.length + 1}`,
        title: chartSpec.title || titleFromArtifactContent(blockContent, 'Chart'),
        type: 'chart',
        language: 'json',
        content: JSON.stringify(chartSpec),
        chartSpec,
        description: 'Chart JSON converted to a validated artifact',
        version: 1,
        createdAt: now,
      })
    }
    if (isChartBlock) continue
    if (mermaidOnly && !isMermaidBlock) continue

    let artType: ArtifactType = classifyArtifactType(lang, lang, blockContent)
    if (['html', 'htm'].includes(lang)) artType = 'html'
    else if (['jsx', 'tsx', 'react'].includes(lang) || looksLikeReactSource(blockContent)) artType = 'react'
    else if (['svg'].includes(lang)) artType = 'svg'
    else if (isMermaidBlock) artType = 'mermaid'
    else if (['json'].includes(lang)) artType = 'json'
    else if (['csv', 'table'].includes(lang)) artType = 'table'
    else if (['js', 'ts', 'py', 'sh', 'bash', 'css', 'sql', 'python', 'javascript', 'typescript'].includes(lang)) {
      artType = 'code'
    }

    artifacts.push({
      id: `art-${Date.now()}-${blockCount + 1}`,
      title: resolveArtifactTitle(undefined, blockContent, userPrompt, artType === 'mermaid' ? 'Diagram' : lang ? `${lang} artifact` : 'Untitled'),
      type: artType,
      language: artType === 'mermaid' ? 'mermaid' : lang,
      content: artType === 'mermaid' ? cleanMermaidSource(blockContent) : blockContent,
      description: artType === 'mermaid' ? 'Diagram' : `Generated Artifact (${lang})`,
      version: 1,
      createdAt: now,
    })
    blockCount++
  }

  if (blockCount === 0) {
    const openFence = content.match(/```([a-z0-9_-]*)[ \t]*\r?\n([\s\S]*)$/i)
    const openBody = openFence?.[2]?.trim() || ''
    const lang = (openFence?.[1] || '').toLowerCase()
    const isMermaidBlock = isMermaidLanguage(lang) || isMermaidSource(openBody)
    if (openBody.length >= (isMermaidBlock ? 8 : 20) && !openBody.includes('```')) {
      if (mermaidOnly && !isMermaidBlock) return
      const isUI =
        ['jsx', 'tsx', 'react'].includes(lang) ||
        looksLikeReactSource(openBody) ||
        openBody.includes('export default function') ||
        openBody.includes('className=')
      const type: ArtifactType = isMermaidBlock ? 'mermaid' : isUI ? 'react' : 'code'
      artifacts.push({
        id: `art-${Date.now()}-open-fence`,
        title: resolveArtifactTitle(undefined, openBody, userPrompt, type === 'mermaid' ? 'Diagram' : lang ? `${lang} artifact` : 'Untitled'),
        type,
        language: type === 'mermaid' ? 'mermaid' : lang || 'jsx',
        content: type === 'mermaid' ? cleanMermaidSource(openBody) : openBody,
        description: type === 'mermaid' ? 'Diagram' : `Generated Artifact (${lang})`,
        version: 1,
        createdAt: now,
      })
    }
  }
}

function promoteMermaidArtifacts(items: Artifact[]): Artifact[] {
  return items.map((item) => {
    if (item.type === 'mermaid' || artifactLooksLikeMermaid(item)) {
      return {
        ...item,
        type: 'mermaid',
        language: 'mermaid',
        content: cleanMermaidSource(item.content),
        description: 'Diagram',
      }
    }
    return item
  })
}

function finalizeArtifacts(items: Artifact[], userPrompt: string): Artifact[] {
  return promoteMermaidArtifacts(promoteUiArtifacts(dropPromptEchoes(dedupeArtifacts(items), userPrompt)))
}

function promoteUiArtifacts(items: Artifact[]): Artifact[] {
  return items.map((item) => {
    if (item.type === 'react' || item.type === 'html' || item.type === 'mermaid') return item
    if ((item.type === 'code' || item.type === 'markdown') && looksLikeReactSource(item.content)) {
      return {
        ...item,
        type: 'react',
        language: item.language && item.language !== 'markdown' ? item.language : 'tsx',
        description: 'Sandbox screen',
      }
    }
    return item
  })
}
