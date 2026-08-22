import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Artifact } from '../types'
import { artifactToNotebookMarkdown } from '../../../lib/notebook-artifact-block'
import { Copy, Download, Check, FileInput, Code2, Play, X } from 'lucide-react'
import { useApp } from '../../../context/App'
import { useWindow } from '../../../context/Window'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { ReactPreviewIframe } from '../sandbox/ReactPreviewIframe'

const ChartArtifactRenderer = dynamic(
  () => import('./ChartArtifactRenderer').then((module) => module.ChartArtifactRenderer),
  { ssr: false }
)

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' })
        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, chart.trim())
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Diagram could not be rendered.')
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) return (
    <div className="p-4 text-rose-600 text-sm font-mono bg-rose-50 rounded-lg border border-rose-200">
      {error}
    </div>
  )
  return <div ref={ref} className="w-full flex justify-center overflow-auto py-4" />
}

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
  const { closeWindow } = useApp()
  const { appWindow } = useWindow()
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (artifact?.type === 'react' || artifact?.type === 'html' || artifact?.type === 'chart' || artifact?.type === 'svg') {
      setActiveTab('preview')
    } else {
      setActiveTab('code')
    }
  }, [artifact?.id, artifact?.type])

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getArtifactExtension = (art: Artifact) => {
    if (art.language) return art.language.toLowerCase()
    switch (art.type) {
      case 'react': return 'tsx'
      case 'html': return 'html'
      case 'svg': return 'svg'
      case 'json': return 'json'
      case 'markdown': return 'md'
      default: return 'txt'
    }
  }

  const handleDownload = () => {
    const ext = getArtifactExtension(artifact)
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title.replace(/\s+/g, '_').toLowerCase()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isMermaidContent =
    artifact.type === 'mermaid' ||
    artifact.language === 'mermaid' ||
    /^```mermaid\n/.test(artifact.content.trim()) ||
    (artifact.type === 'code' &&
      /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|sankey-beta|xychart-beta)\s/m.test(
        artifact.content.trim()
      ))

  const mermaidSource = artifact.content
    .replace(/^```mermaid\n/, '')
    .replace(/\n```$/, '')
    .trim()

  const getIframeSrcDoc = () => {
    if (artifact.type === 'svg') {
      return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;">${artifact.content}</body></html>`
    }
    if (artifact.type === 'html') {
      const hasTailwind = artifact.content.includes('tailwind')
      const tailwindScript = hasTailwind ? '' : '<script src="https://cdn.tailwindcss.com"></script>'
      if (artifact.content.includes('</head>')) {
        return artifact.content.replace('</head>', `${tailwindScript}</head>`)
      }
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${tailwindScript}</head><body>${artifact.content}</body></html>`
    }
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;"><pre style="white-space:pre-wrap;">${artifact.content}</pre></body></html>`
  }

  const formatLabel = isMermaidContent ? 'MERMAID' : getArtifactExtension(artifact).toUpperCase()

  return (
    <div className="flex h-full w-full flex-col bg-primary text-primary overflow-hidden font-sans">
      {/* Top action toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-primary/20 bg-accent/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary border border-primary/20">
            {formatLabel}
          </span>
          <h3 className="text-xs font-semibold line-clamp-1 m-0 text-primary">{artifact.title}</h3>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tab Switcher */}
          <div className="flex rounded-md border border-primary/20 bg-primary p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors cursor-pointer ${
                activeTab === 'preview' ? 'bg-accent font-semibold text-primary shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              <Play className="h-3 w-3" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors cursor-pointer ${
                activeTab === 'code' ? 'bg-accent font-semibold text-primary shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              <Code2 className="h-3 w-3" />
              <span>Code</span>
            </button>
          </div>

          {/* Action buttons */}
          {onInsertToNotebook && (
            <button
              type="button"
              onClick={() => onInsertToNotebook(artifactToNotebookMarkdown(artifact))}
              className="flex items-center gap-1 rounded border border-primary/20 bg-primary px-2 py-1 text-xs text-primary hover:bg-accent cursor-pointer transition-colors"
              title="Add to notebook as a block"
            >
              <FileInput className="h-3.5 w-3.5 text-secondary" />
              <span>Notebook</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded border border-primary/20 bg-primary px-2 py-1 text-xs text-primary hover:bg-accent cursor-pointer transition-colors"
            title="Copy source code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-secondary" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 rounded border border-primary/20 bg-primary px-2 py-1 text-xs text-primary hover:bg-accent cursor-pointer transition-colors"
            title="Download file"
          >
            <Download className="h-3.5 w-3.5 text-secondary" />
          </button>

          {appWindow && (
            <button
              type="button"
              onClick={() => closeWindow(appWindow)}
              className="flex items-center justify-center rounded border border-primary/20 bg-primary p-1 text-xs text-secondary hover:bg-rose-500 hover:text-white cursor-pointer transition-colors ml-1"
              title="Close window"
              aria-label="Close window"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main content body */}
      <div className="flex-1 min-h-0 overflow-auto bg-primary">
        {activeTab === 'preview' ? (
          <div className="h-full w-full">
            {artifact.type === 'chart' ? (
              <div className="h-full p-4 overflow-auto">
                <ChartArtifactRenderer spec={artifact.chartSpec || artifact.content} />
              </div>
            ) : isMermaidContent ? (
              <div className="h-full p-4 overflow-auto">
                <MermaidDiagram chart={mermaidSource} />
              </div>
            ) : artifact.type === 'react' ? (
              <div className="h-full w-full">
                <ReactPreviewIframe
                  title={artifact.title}
                  source={artifact.content}
                  onHealed={(nextSource) => onHealArtifact?.(artifact, nextSource)}
                />
              </div>
            ) : artifact.type === 'html' || artifact.type === 'svg' ? (
              <iframe
                title={artifact.title}
                srcDoc={getIframeSrcDoc()}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : artifact.type === 'markdown' ? (
              <div className="p-6 max-w-3xl mx-auto prose dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {artifact.content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="p-4 font-mono text-xs overflow-auto h-full m-0 bg-accent/20">
                {artifact.content}
              </pre>
            )}
          </div>
        ) : (
          <pre className="p-4 font-mono text-xs leading-relaxed overflow-auto h-full m-0 bg-accent/20 text-primary selection:bg-accent">
            <code>{artifact.content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
