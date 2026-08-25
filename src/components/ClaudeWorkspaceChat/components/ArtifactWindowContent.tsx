import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Artifact } from '../types'
import { artifactToNotebookMarkdown } from '../../../lib/notebook-artifact-block'
import { Copy, Check, FileInput, Code2, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { ReactPreviewIframe } from '../sandbox/ReactPreviewIframe'

const ChartArtifactRenderer = dynamic(
  () => import('./ChartArtifactRenderer').then((module) => module.ChartArtifactRenderer),
  { ssr: false }
)

import { Spinner } from '../../../notebook-app/lib/lemon-ui/Spinner'

const LazyMermaidDiagram = React.lazy(() => import('../../../notebook-app/lib/lemon-ui/LemonMarkdown/MermaidDiagram'))

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  return (
    <div className="w-full flex justify-center overflow-auto py-4">
      <React.Suspense fallback={<div className="p-4 flex justify-center"><Spinner /></div>}>
        <LazyMermaidDiagram code={chart} naturalWidth />
      </React.Suspense>
    </div>
  )
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
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)

  // Always show Preview first when opened or switched
  useEffect(() => {
    setActiveTab('preview')
  }, [artifact?.id, artifact?.type])

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  return (
    <div className="relative flex h-full w-full flex-col bg-primary text-primary overflow-hidden font-sans">
      {/* Minimalist Floating Controls Dock */}
      <div className="flex shrink-0 items-center justify-between border-b border-primary/20 bg-primary/80 backdrop-blur-md px-3 py-1.5 z-10">
        {/* Tab Switcher: Preview & Code */}
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

        {/* Action: Add to notebook */}
        {onInsertToNotebook && (
          <button
            type="button"
            onClick={() => onInsertToNotebook(artifactToNotebookMarkdown(artifact))}
            className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary px-3 py-1 text-xs font-medium text-primary hover:bg-accent cursor-pointer transition-colors shadow-2xs"
            title="Add to notebook as a block"
          >
            <FileInput className="h-3.5 w-3.5 text-secondary" />
            <span>Add to notebook</span>
          </button>
        )}
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
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-end px-3 py-1.5 bg-accent/30 border-b border-primary/20">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Copy code"
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
