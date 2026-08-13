import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Artifact, ArtifactOrigin } from '../types';
import { X, Eye, Copy, Download, Check, ChevronDown, FileInput, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { normalizeSandboxReactSource, WIM_UI_SOURCE } from '../sandbox/wimUiSource';

const BADGE_LABELS = new Set([
  'YENİ',
  'YENI',
  'BETA',
  'ÖNERİLEN',
  'ONERILEN',
  'KALDIRILDI',
  'NEW',
  'WIP',
  'DRAFT',
  'DEPRECATED',
])

function isBadgeLabel(value: string): boolean {
  return BADGE_LABELS.has(value.trim().toLocaleUpperCase('tr-TR'))
}

const EditorialBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="mr-1.5 inline-flex items-center rounded-full border border-[#e8b4b4] bg-white px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.06em] text-[#c45c5c] font-claude-sans align-middle">
    {children}
  </span>
)

function prepareArtifactMarkdown(source: string): string {
  return source.replace(/<span[^>]*>([^<]+)<\/span>/gi, (_match, label: string) => {
    const text = String(label).trim()
    return isBadgeLabel(text) ? `\`${text}\`` : text
  })
}

const ChartArtifactRenderer = dynamic(
  () => import('./ChartArtifactRenderer').then((module) => module.ChartArtifactRenderer),
  { ssr: false }
);

interface ArtifactsPanelProps {
  artifact: Artifact | null;
  expanded?: boolean;
  origin?: ArtifactOrigin | null;
  onToggleExpand?: () => void;
  onClose: () => void;
  allArtifacts?: Artifact[];
  onSelectArtifact?: (artifact: Artifact) => void;
  onInsertToNotebook?: (content: string) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// ─── Mermaid Renderer ────────────────────────────────────────────────────────
const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
         mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart.trim());
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Diyagram render edilemedi.');
      }
    };
    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) return (
    <div className="p-4 text-rose-600 text-sm font-mono bg-rose-50 rounded-lg border border-rose-200">
      {error}
    </div>
  );
  return <div ref={ref} className="w-full flex justify-center overflow-auto py-4" />;
};

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({
  artifact,
  expanded = false,
  origin = null,
  onToggleExpand,
  onClose,
  allArtifacts = [],
  onSelectArtifact,
  onInsertToNotebook,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState({ width: 400, height: 720 })

  useEffect(() => {
    const parent = frameRef.current?.parentElement
    if (!parent) return
    const update = () => setHost({ width: parent.clientWidth, height: parent.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [artifact?.id])

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getArtifactExtension = (art: Artifact) => {
    if (art.language) return art.language.toLowerCase();
    switch (art.type) {
      case 'react': return 'tsx';
      case 'html': return 'html';
      case 'svg': return 'svg';
      case 'json': return 'json';
      case 'markdown': return 'md';
      default: return 'txt';
    }
  };

  const handleDownload = () => {
    const ext = getArtifactExtension(artifact);
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detect if content is a Mermaid diagram (for code artifacts with mermaid lang, or explicit mermaid blocks)
  const isMermaidContent =
    artifact.type === 'mermaid' ||
    artifact.language === 'mermaid' ||
    /^```mermaid\n/.test(artifact.content.trim()) ||
    (artifact.type === 'code' && /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|sankey-beta|xychart-beta)\s/m.test(artifact.content.trim()));

  const mermaidSource = artifact.content
    .replace(/^```mermaid\n/, '')
    .replace(/\n```$/, '')
    .trim();

  // Safe HTML preview generator for interactive components
  const getIframeSrcDoc = () => {
    if (artifact.type === 'svg') {
      return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;">${artifact.content}</body></html>`;
    }
    if (artifact.type === 'html') {
      // Inject Tailwind CDN if the HTML doesn't already have it
      const hasTailwind = artifact.content.includes('tailwind');
      const tailwindScript = hasTailwind ? '' : '<script src="https://cdn.tailwindcss.com"></script>';
      if (artifact.content.includes('</head>')) {
        return artifact.content.replace('</head>', `${tailwindScript}</head>`);
      }
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${tailwindScript}</head><body>${artifact.content}</body></html>`;
    }
    if (artifact.type === 'react') {
      // Extract component name from `export default function X` or `function X` or `const X =`
      const componentNameMatch =
        artifact.content.match(/export\s+default\s+function\s+(\w+)/) ||
        artifact.content.match(/export\s+default\s+(\w+)/) ||
        artifact.content.match(/^(?:function|const)\s+(\w+)/m);
      const componentName = componentNameMatch?.[1] || null;

      // Build render call: try detected name → common names → render the default export inline
      const renderCall = componentName
        ? `ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${componentName}));`
        : `
          const names = ['App', 'Component', 'Page', 'Demo', 'LocalStorageDemo', 'InteractiveCard'];
          const found = names.find(n => typeof window[n] !== 'undefined');
          if (found) {
            ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window[found]));
          } else {
            document.getElementById('root').innerHTML = '<p style="padding:16px;color:#6D6B67;font-family:sans-serif">Bileşen yüklendi fakat render edilemedi. Bir hata oluşmuş olabilir.</p>';
          }
        `;

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 16px; background: #fff; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${artifact.content}
    ${renderCall}
  </script>
</body>
</html>`;
    }
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;"><pre style="white-space:pre-wrap;">${artifact.content}</pre></body></html>`;
  };

  const versionList = allArtifacts.filter((a) => {
    if (artifact.identifier && a.identifier) return a.identifier === artifact.identifier
    return (
      a.id === artifact.id ||
      a.title.toLowerCase().replace(/\s+/g, '') === artifact.title.toLowerCase().replace(/\s+/g, '')
    )
  }).sort((a, b) => (b.version || 1) - (a.version || 1))

  const displayTitle = artifact.title.replace(/\.[^/.]+$/, '')
  const formatLabel = isMermaidContent ? 'MERMAID' : getArtifactExtension(artifact).toUpperCase()

  const compactHeight = Math.min(340, Math.round(host.height * 0.44))
  const expandedHeight = Math.min(520, Math.round(host.height * 0.68))
  const targetHeight = expanded ? expandedHeight : compactHeight
  const targetWidth = Math.max(host.width - 20, 220)
  const targetLeft = 10
  const centerY = origin?.centerY ?? host.height * 0.48
  const targetTop = clamp(centerY - targetHeight / 2, 48, Math.max(48, host.height - targetHeight - 12))
  const initialFrame = origin
    ? { top: origin.top, left: origin.left, width: origin.width, height: origin.height }
    : { top: centerY - 32, left: targetLeft, width: targetWidth, height: 64 }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Close artifact"
        className="absolute inset-0 z-40 cursor-default bg-black/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        ref={frameRef}
        className="absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
        initial={initialFrame}
        animate={{ top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.85 }}
      >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#ececec] bg-white px-2 sm:gap-3 sm:px-3 font-claude-sans select-none">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <div className="flex h-8 shrink-0 items-center rounded bg-[#f3f4f6] p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex h-7 w-7 items-center justify-center rounded-sm cursor-pointer ${
                activeTab === 'preview' ? 'bg-white text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#8c8c8c] hover:text-[#1f1f1f]'
              }`}
              title="Önizleme"
              aria-label="Preview"
              aria-pressed={activeTab === 'preview'}
            >
              <Eye className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex h-7 w-7 items-center justify-center rounded-sm cursor-pointer ${
                activeTab === 'code' ? 'bg-white text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#8c8c8c] hover:text-[#1f1f1f]'
              }`}
              title="Kod"
              aria-label="Code"
              aria-pressed={activeTab === 'code'}
            >
              <span className="text-[11px] font-semibold leading-none">{'</>'}</span>
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 text-[13px] sm:text-[13.5px] font-normal text-[#6a6a6a]">
            <h2 className="min-w-0 truncate" title={artifact.title}>{displayTitle}</h2>
            <span className="hidden shrink-0 text-[#b0b0b0] sm:inline">·</span>
            <span className="hidden shrink-0 sm:inline">{formatLabel}</span>
          </div>

          {versionList.length > 1 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsVersionMenuOpen(!isVersionMenuOpen)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-[#8b8b8b] hover:text-[#1a1a1a] cursor-pointer"
                title="Sürüm geçmişi"
              >
                <span>v{artifact.version || 1}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {isVersionMenuOpen && (
                <div className="absolute left-0 mt-1 w-36 rounded-lg border border-[#ececec] bg-white shadow-lg py-1 z-50 text-xs">
                  {versionList.map((art) => (
                    <button
                      key={art.id + (art.version || 1)}
                      type="button"
                      onClick={() => {
                        onSelectArtifact?.(art)
                        setIsVersionMenuOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#f7f7f7] cursor-pointer ${
                        art.version === artifact.version ? 'font-semibold text-[#1a1a1a]' : 'text-[#6f6f6f]'
                      }`}
                    >
                      <span>v{art.version || 1} sürümü</span>
                      {art.version === artifact.version && <Check className="h-3 w-3 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCopyOptions(!showCopyOptions)}
              className="flex h-8 items-center gap-1 rounded border border-[#e5e5e5] bg-white px-2.5 text-[13px] text-[#3d3d3d] hover:bg-[#fafafa] cursor-pointer"
              title="Copy"
            >
              <span>{copied ? 'Copied' : 'Copy'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#8c8c8c]" />
            </button>
            {showCopyOptions && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded border border-[#ececec] bg-white py-1 text-xs shadow-lg">
                {onInsertToNotebook && (
                  <button
                    type="button"
                    onClick={() => {
                      onInsertToNotebook(artifact.content)
                      setShowCopyOptions(false)
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[#1a1a1a] hover:bg-[#f7f7f7]"
                  >
                    <FileInput className="h-3.5 w-3.5 text-[#8b8b8b]" />
                    <span>Insert to notebook</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleCopy()
                    setShowCopyOptions(false)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[#1a1a1a] hover:bg-[#f7f7f7]"
                >
                  <Copy className="h-3.5 w-3.5 text-[#8b8b8b]" />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload()
                    setShowCopyOptions(false)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[#1a1a1a] hover:bg-[#f7f7f7]"
                >
                  <Download className="h-3.5 w-3.5 text-[#8b8b8b]" />
                  <span>Download</span>
                </button>
              </div>
            )}
          </div>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex h-8 w-8 items-center justify-center text-[#8c8c8c] hover:text-[#1f1f1f] cursor-pointer"
              title={expanded ? 'Küçült' : 'Büyüt'}
              aria-label={expanded ? 'Collapse artifact' : 'Expand artifact'}
            >
              {expanded ? <Minimize2 className="h-4 w-4" strokeWidth={1.7} /> : <Maximize2 className="h-4 w-4" strokeWidth={1.7} />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-[#8c8c8c] hover:text-[#1f1f1f] cursor-pointer"
            title="Kapat"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white"
        onClick={(event) => {
          if (expanded || !onToggleExpand) return
          const target = event.target as HTMLElement
          if (target.closest('button, a, input, textarea, select, iframe')) return
          if (window.getSelection()?.toString()) return
          onToggleExpand()
        }}
      >
        {activeTab === 'code' ? (
          <div className="h-full w-full overflow-auto bg-[#fafafa] p-3 sm:p-5 font-mono text-[12px] sm:text-[12.5px] leading-relaxed text-[#2a2a2a]">
            <pre className="max-w-full whitespace-pre-wrap break-words">{artifact.content}</pre>
          </div>
        ) : activeTab === 'preview' && artifact.type === 'chart' ? (
          <div className="h-full w-full min-w-0 overflow-auto p-3 sm:p-5 bg-white">
            {artifact.chartSpec ? (
              <ChartArtifactRenderer spec={artifact.chartSpec} />
            ) : (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Grafik verisi doğrulanamadı. Kod veya veri sekmesinden çıktıyı inceleyebilirsin.
              </div>
            )}
          </div>
        ) : isMermaidContent ? (
          /* Mermaid Diagram Preview */
          <div className="min-h-full overflow-auto bg-white p-3 sm:p-6">
            <MermaidDiagram chart={mermaidSource} />
          </div>
        ) : activeTab === 'preview' && artifact.type === 'react' ? (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white p-2 sm:p-3">
            <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-primary bg-white shadow-2xs">
              <SandpackProvider
                template="react-ts"
                theme="light"
                files={{
                  "/App.tsx": normalizeSandboxReactSource(artifact.content),
                  "/wim-ui.tsx": WIM_UI_SOURCE,
                  "/public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; background: transparent; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
                }}
                customSetup={{
                  dependencies: {
                    "lucide-react": "^0.292.0",
                    "recharts": "^2.10.3",
                    "framer-motion": "^10.16.4",
                    "tailwind-merge": "^2.2.0",
                    "clsx": "^2.1.0"
                  }
                }}
              >
                <SandpackPreview
                  showNavigator={false}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={true}
                  style={{ height: '100%', border: 'none' }}
                />
              </SandpackProvider>
            </div>
          </div>
        ) : activeTab === 'preview' && (artifact.type === 'html' || artifact.type === 'svg') ? (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white p-2 sm:p-3">
            <div className="min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-primary bg-white shadow-2xs">
              <iframe
                title={artifact.title}
                srcDoc={getIframeSrcDoc()}
                className="h-full w-full border-none bg-white"
                 sandbox="allow-scripts"
                 referrerPolicy="no-referrer"
              />
            </div>
          </div>
        ) : (
          /* Markdown / Document View — Claude editorial canvas */
          <div className="mx-auto w-full max-w-[40rem] min-w-0 overflow-x-auto bg-white px-4 pb-16 pt-4 text-[15px] leading-[1.65] text-[#1a1a1a] font-claude-serif sm:px-8 sm:pt-5 sm:text-[16.5px] sm:leading-[1.7] md:px-12">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mt-2 mb-4 break-words text-[1.45rem] font-bold leading-[1.25] text-[#1a1a1a] font-claude-serif sm:mb-5 sm:text-[1.85rem]">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-6 mb-3 break-words text-[1.15rem] font-bold leading-snug text-[#1a1a1a] font-claude-serif sm:mt-8 sm:text-[1.28rem]">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-6 mb-2 text-[1.12rem] font-bold text-[#1a1a1a] font-claude-serif">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="mt-5 mb-1.5 text-[1.02rem] font-bold text-[#1a1a1a] font-claude-serif">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-4 break-words text-[#1a1a1a] font-claude-serif leading-[1.65] sm:leading-[1.7]">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-[#1a1a1a]">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-[#1a1a1a]">{children}</em>
                ),
                del: ({ children }) => (
                  <del className="line-through text-[#1a1a1a]">{children}</del>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-1.5 text-[#1a1a1a] font-claude-serif">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-7 mb-5 space-y-2 text-[#1a1a1a] font-claude-serif marker:font-claude-serif">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="pl-1.5 leading-[1.7]">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-[2px] border-[#d6d6d6] pl-4 italic my-4 text-[#5c5c5c]">
                    {children}
                  </blockquote>
                ),
                code: ({ inline, children }: any) => {
                  const text = String(children).trim()
                  if (inline && isBadgeLabel(text)) return <EditorialBadge>{text}</EditorialBadge>
                  const isColorHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(text)
                  if (inline && (text.includes('<') || text.length > 36)) {
                    return <code className="text-[13.5px] text-[#6b6b6b] font-mono break-words">{children}</code>
                  }
                  return inline ? (
                    <code className="mx-0.5 bg-[#f6f6f6] text-[#c45c5c] whitespace-pre-wrap rounded-[0.35rem] px-1.5 py-0.5 text-[0.86rem] font-mono font-normal inline-flex items-center">
                      {isColorHex && (
                        <span
                          className="mr-1 inline-block w-2.5 h-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: text }}
                        />
                      )}
                      {children}
                    </code>
                  ) : (
                    <div className="my-4 rounded-xl border border-[#ececec] bg-[#111] p-4 text-[#f2f2f2] font-mono text-xs overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{children}</pre>
                    </div>
                  )
                },
                table: ({ children }) => (
                  <div className="my-4 -mx-1 max-w-full overflow-x-auto">
                    <table className="w-full min-w-[20rem] border-collapse border border-[#e5e5e5] text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-[#f7f7f7] border border-[#e5e5e5] p-2 font-semibold text-[#1a1a1a]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#e5e5e5] p-2 text-[#1a1a1a] align-top">{children}</td>
                ),
              }}
            >
              {prepareArtifactMarkdown(artifact.content)}
            </ReactMarkdown>
          </div>
        )}
      </div>
      </motion.div>
    </>
  );
};
