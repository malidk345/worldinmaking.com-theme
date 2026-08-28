import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Artifact } from '../types'
import { artifactToNotebookMarkdown } from '../../../lib/notebook-artifact-block'
import { artifactLooksLikeMermaid, cleanMermaidSource } from '../../../lib/mermaid-loader'
import { WIM_PAPER, wrapHtmlArtifactDocument } from '../../../lib/wim-artifact-theme'
import { Copy, Check, FileInput, Code2, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { LocalPreviewIframe } from '../sandbox/LocalPreviewIframe'

const ChartArtifactRenderer = dynamic(
  () => import('./ChartArtifactRenderer').then((module) => module.ChartArtifactRenderer),
  { ssr: false }
)

const MermaidPreview = dynamic(
  () => import('../../MermaidPreview').then((module) => module.MermaidPreview),
  { ssr: false }
)

interface ArtifactWindowContentProps {
  artifact: Artifact
  onInsertToNotebook?: (content: string) => void
  onHealArtifact?: (artifact: Artifact, content: string) => void
}

export function ArtifactWindowContent({
  artifact,
  onInsertToNotebook,
  onHealArtifact,
}: ArtifactWindowContentProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)

  useEffect(() => {
    setActiveTab('preview')
  }, [artifact?.id, artifact?.type])

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInsert = () => {
    if (!onInsertToNotebook) return
    onInsertToNotebook(artifactToNotebookMarkdown(artifact))
    setInserted(true)
    setTimeout(() => setInserted(false), 2000)
  }

  const content = String(artifact?.content || '').trim()
  const lang = String(artifact?.language || '').toLowerCase().trim()

  const isMermaid = artifactLooksLikeMermaid(artifact)
  const isChart = artifact.type === 'chart' || Boolean(artifact.chartSpec)
  const isReact = artifact.type === 'react' || ['react', 'tsx', 'jsx', 'wim-ui'].includes(lang)
  const isHtml =
    artifact.type === 'html' ||
    artifact.type === 'svg' ||
    ['html', 'wim-html', 'svg'].includes(lang)
  const mermaidSrc = cleanMermaidSource(content)

  const getIframeSrcDoc = () => {
    if (artifact.type === 'svg' || lang === 'svg') {
      return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:${WIM_PAPER};">${content}</body></html>`
    }
    return wrapHtmlArtifactDocument(content)
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-primary text-primary overflow-hidden font-sans">
      <div className="flex shrink-0 items-center justify-between border-b border-primary/20 bg-primary/80 backdrop-blur-md px-3 py-1.5 z-10">
        <div className="flex items-center gap-1 bg-accent/60 rounded-md p-0.5 border border-primary/20 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
              activeTab === 'preview' ? 'bg-primary text-primary shadow-2xs' : 'text-secondary hover:text-primary'
            }`}
          >
            <Play className="h-3 w-3" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
              activeTab === 'code' ? 'bg-primary text-primary shadow-2xs' : 'text-secondary hover:text-primary'
            }`}
          >
            <Code2 className="h-3 w-3" />
            <span>Code</span>
          </button>
        </div>

        {onInsertToNotebook && (
          <button
            type="button"
            onClick={handleInsert}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium cursor-pointer transition-all shadow-2xs ${
              inserted
                ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-primary/30 bg-primary text-primary hover:bg-accent'
            }`}
          >
            {inserted ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Added to notebook ✓</span>
              </>
            ) : (
              <>
                <FileInput className="h-3.5 w-3.5 text-secondary" />
                <span>Add to notebook</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-primary">
        {activeTab === 'preview' ? (
          <div className="absolute inset-0 min-h-0 w-full">
            {isChart ? (
              <div className="h-full min-h-0 p-4 overflow-auto">
                <div className="h-full min-h-[280px]">
                  <ChartArtifactRenderer spec={artifact.chartSpec || artifact.content} />
                </div>
              </div>
            ) : isMermaid ? (
              <div className="h-full min-h-0 overflow-auto p-4" data-testid="artifact-mermaid-preview">
                <MermaidPreview code={mermaidSrc} naturalWidth />
              </div>
            ) : isReact ? (
              <LocalPreviewIframe
                title={artifact.title}
                source={artifact.content}
                className="absolute inset-0 h-full w-full border-0 bg-primary"
                onHealed={(nextSource) => onHealArtifact?.(artifact, nextSource)}
              />
            ) : isHtml ? (
              <iframe
                title={artifact.title}
                srcDoc={getIframeSrcDoc()}
                className="absolute inset-0 h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : artifact.type === 'markdown' || artifact.type === 'table' ? (
              <div className="h-full overflow-auto p-6">
                <div className="mx-auto max-w-3xl prose dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {artifact.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <pre className="h-full m-0 overflow-auto bg-accent/20 p-4 font-mono text-xs">
                {artifact.content}
              </pre>
            )}
          </div>
        ) : (
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-end px-3 py-1.5 bg-accent/30 border-b border-primary/20">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy code'}</span>
              </button>
            </div>
            <pre className="p-4 font-mono text-xs leading-relaxed overflow-auto flex-1 m-0 bg-accent/20 text-primary selection:bg-accent">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArtifactWindowContent
