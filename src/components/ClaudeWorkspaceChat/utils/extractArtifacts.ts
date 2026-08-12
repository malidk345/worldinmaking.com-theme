import { Artifact, ArtifactType } from '../types';

/**
 * Extracts Artifact objects from assistant response text or user prompt directives.
 * Supports:
 * 1. Explicit <antArtifact identifier="..." type="..." title="...">...content...</antArtifact> or <artifact> tags
 * 2. Markdown code blocks (```html, ```react, ```svg, ```markdown, ```table, ```json, etc.)
 * 3. Document fallback when user explicitly requests a document ("belge oluştur", "belge üret", "create document")
 */
export function extractArtifactsFromContent(content: string, userPrompt: string): Artifact[] {
  if (!content || !content.trim()) return [];
  const artifacts: Artifact[] = [];
  const now = new Date().toISOString();

  // 1. Explicit <antArtifact> or <artifact> tags
  const antArtifactRegex = /<(?:antArtifact|artifact)\s+([^>]*?)>([\s\S]*?)<\/(?:antArtifact|artifact)>/gi;
  let match: RegExpExecArray | null;

  while ((match = antArtifactRegex.exec(content)) !== null) {
    const attrStr = match[1];
    const artContent = match[2]?.trim();

    const titleMatch = attrStr.match(/title=["']([^"']+)["']/i) || attrStr.match(/identifier=["']([^"']+)["']/i);
    const typeMatch = attrStr.match(/type=["']([^"']+)["']/i);
    const langMatch = attrStr.match(/language=["']([^"']+)["']/i);

    const title = titleMatch ? titleMatch[1] : 'Generated Document';
    const rawType = (typeMatch ? typeMatch[1] : 'markdown').toLowerCase();
    const type: ArtifactType = (['code', 'html', 'svg', 'markdown', 'react', 'json', 'table'].includes(rawType)
      ? rawType
      : 'markdown') as ArtifactType;

    if (artContent) {
      artifacts.push({
        id: `art-${Date.now()}-${artifacts.length + 1}`,
        title,
        type,
        language: langMatch ? langMatch[1] : undefined,
        content: artContent,
        description: `Created for "${userPrompt.slice(0, 40)}"`,
        version: 1,
        createdAt: now,
      });
    }
  }

  if (artifacts.length > 0) return artifacts;

  // 2. Code block & Document extraction (```html, ```react, ```svg, ```markdown, etc.)
  const isDocumentRequested = /(belge|doküman|dokuman|document|artifact|şema|sema|tablo|taslak|dilekçe|dilekce|sözleşme|sozlesme|rapor)/i.test(userPrompt);

  const codeBlockRegex = /```([a-z0-9_-]*)\n([\s\S]*?)```/gi;
  let codeMatch: RegExpExecArray | null;
  let blockCount = 0;

  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    const lang = (codeMatch[1] || 'markdown').toLowerCase();
    const blockContent = codeMatch[2]?.trim();

    if (!blockContent || blockContent.length < 20) continue;

    let artType: ArtifactType = 'markdown';
    if (['html', 'htm'].includes(lang)) artType = 'html';
    else if (['jsx', 'tsx', 'react'].includes(lang)) artType = 'react';
    else if (['svg'].includes(lang)) artType = 'svg';
    else if (['json'].includes(lang)) artType = 'json';
    else if (['csv', 'table'].includes(lang)) artType = 'table';
    else if (['js', 'ts', 'py', 'sh', 'bash', 'css', 'sql', 'python', 'javascript', 'typescript'].includes(lang)) artType = 'code';

    let title = `${userPrompt.slice(0, 30).trim()} Document`;
    if (lang === 'html') title = 'HTML Canvas Preview';
    else if (lang === 'svg') title = 'SVG Diagram';
    else if (lang === 'react' || lang === 'tsx') title = 'React Component';
    else if (artType === 'code') title = `${lang.toUpperCase()} Script`;

    artifacts.push({
      id: `art-${Date.now()}-${blockCount + 1}`,
      title,
      type: artType,
      language: lang,
      content: blockContent,
      description: `Generated Artifact (${lang})`,
      version: 1,
      createdAt: now,
    });
    blockCount++;
  }

  // 3. Fallback: If user explicitly asked for a document ("belge oluştur") and no explicit tag or code block was parsed, turn response into a Markdown Document Artifact!
  if (artifacts.length === 0 && isDocumentRequested && content.length > 15) {
    artifacts.push({
      id: `art-${Date.now()}-doc`,
      title: `${userPrompt.slice(0, 35).trim()}`,
      type: 'markdown',
      language: 'markdown',
      content: content,
      description: 'AI Generated Document',
      version: 1,
      createdAt: now,
    });
  }

  return artifacts;
}
