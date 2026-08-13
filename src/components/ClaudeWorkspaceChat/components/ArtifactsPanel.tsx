import React, { useState, useEffect, useRef } from 'react';
import { PANEL_BG } from '../../../constants/frostedSurfaces';
import { Artifact } from '../types';
import { X, Code2, Eye, Copy, Download, Check, ChevronDown, FileInput } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface ArtifactsPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
  allArtifacts?: Artifact[];
  onSelectArtifact?: (artifact: Artifact) => void;
  onInsertToNotebook?: (content: string) => void;
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
  onClose,
  allArtifacts = [],
  onSelectArtifact,
  onInsertToNotebook,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [showCopyOptions, setShowCopyOptions] = useState(false);

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

  const isInteractiveType = (artifact.type === 'react' || artifact.type === 'html' || artifact.type === 'svg') && !isMermaidContent;

  // Find all versions matching title or ID pattern
  const versionList = allArtifacts.filter(
    (a) => a.title.toLowerCase().replace(/\s+/g, '') === artifact.title.toLowerCase().replace(/\s+/g, '') ||
           a.id === artifact.id
  ).sort((a, b) => (b.version || 1) - (a.version || 1));

  return (
    <aside
      className={`absolute lg:relative inset-y-0 right-0 z-40 flex flex-col bg-white border-l border-primary transition-all duration-300 shadow-xl lg:shadow-none w-full sm:w-[480px] lg:w-[580px] xl:w-[640px]`}
    >
      {/* Top Header Bar Matching 1:1 Claude CDS Header */}
      <div className={`flex items-center justify-between border-b border-primary px-3.5 py-2 shrink-0 select-none h-[48px] gap-2 font-claude-sans ${PANEL_BG}`}>
        {/* Left Side: Segmented View Toggle (Eye & Code icons) + Title & Format Indicator */}
        <div className="flex items-center gap-3 flex-1 overflow-hidden min-w-0">
          {/* Segmented Control (Preview / Code view mode) */}
          <div className="flex items-center rounded-lg border border-primary bg-accent p-0.5 text-xs text-secondary shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-primary shadow-2xs font-semibold'
                  : 'text-secondary hover:text-primary'
              }`}
              title="Önizleme (Preview)"
              aria-label="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white text-primary shadow-2xs font-semibold'
                  : 'text-secondary hover:text-primary'
              }`}
              title="Kod Göster (Code)"
              aria-label="Code"
            >
              <Code2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Title & Language Badge: Title · EXT */}
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <h2 className="text-[13px] sm:text-[14px] font-normal text-primary truncate" title={artifact.title}>
              {artifact.title.replace(/\.[^/.]+$/, "")}
            </h2>
            <span className="text-muted font-normal text-xs">·</span>
            <span className="text-secondary text-[11px] font-mono uppercase font-normal shrink-0">
              {isMermaidContent ? 'MERMAID' : getArtifactExtension(artifact).toUpperCase()}
            </span>
          </div>

          {/* Version Switcher Dropdown (if versions exist) */}
          {versionList.length > 1 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsVersionMenuOpen(!isVersionMenuOpen)}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-primary bg-accent text-[11px] font-mono text-secondary hover:text-primary hover:bg-light-3 transition-colors cursor-pointer"
                title="Sürüm Geçmişi"
              >
                <span>v{artifact.version || 1}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {isVersionMenuOpen && (
                <div className="absolute left-0 mt-1 w-36 rounded-lg border border-primary bg-white shadow-lg py-1 z-50 text-xs">
                  {versionList.map((art) => (
                    <button
                      key={art.id + (art.version || 1)}
                      type="button"
                      onClick={() => {
                        onSelectArtifact?.(art);
                        setIsVersionMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-bg-primary cursor-pointer ${
                        art.version === artifact.version ? 'font-semibold text-primary bg-accent' : 'text-secondary'
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

        {/* Right Side Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Insert to Notebook button — only if callback is provided */}
          {onInsertToNotebook && (
            <button
              type="button"
              onClick={() => onInsertToNotebook(artifact.content)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary bg-white text-xs text-primary hover:bg-bg-primary transition-colors cursor-pointer shadow-2xs"
              title="Notebook'a Ekle"
            >
              <FileInput className="h-3.5 w-3.5 text-secondary" />
              <span className="hidden sm:inline">Notebook'a Ekle</span>
            </button>
          )}

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-light-2 transition-colors cursor-pointer"
            title="İndir"
            aria-label="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Split Dropdown Copy Button (1:1 Claude CDS) */}
          <div className="relative flex items-center rounded-md border border-primary bg-white shadow-2xs text-xs">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-primary hover:bg-bg-primary transition-colors font-normal cursor-pointer rounded-l-md"
              title="Kopyala"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied</span>
                </>
              ) : (
                <span>Copy</span>
              )}
            </button>
            <div className="w-px h-3.5 bg-light-3" />
            <button
              type="button"
              onClick={() => setShowCopyOptions(!showCopyOptions)}
              className="px-1.5 py-1 text-secondary hover:text-primary hover:bg-bg-primary transition-colors cursor-pointer rounded-r-md"
              aria-label="More options"
            >
              <ChevronDown className="h-3 w-3" />
            </button>

            {showCopyOptions && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-primary bg-white shadow-lg py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleCopy();
                    setShowCopyOptions(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-primary hover:bg-light-1 flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-secondary" />
                  <span>Metni Kopyala</span>
                </button>
              </div>
            )}
          </div>

          {/* Close Button (X) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-light-2 transition-colors cursor-pointer"
            title="Kapat"
            aria-label="Go back"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-white">
        {activeTab === 'code' ? (
          <div className="h-full w-full overflow-auto p-4 bg-primary text-light-2 font-mono text-xs leading-relaxed">
            <pre className="whitespace-pre-wrap">{artifact.content}</pre>
          </div>
        ) : isMermaidContent ? (
          /* Mermaid Diagram Preview */
          <div className="p-6 bg-white min-h-full">
            <MermaidDiagram chart={mermaidSource} />
          </div>
        ) : activeTab === 'preview' && isInteractiveType ? (
          <div className="h-full w-full p-3 flex flex-col bg-white">
            <div className="w-full flex-1 rounded-xl border border-primary bg-white overflow-hidden shadow-2xs">
              <iframe
                title={artifact.title}
                srcDoc={getIframeSrcDoc()}
                className="w-full h-full border-none bg-white"
                 sandbox="allow-scripts"
                 referrerPolicy="no-referrer"
              />
            </div>
          </div>
        ) : (
          /* Markdown / Document View (1:1 Extracted from Claude Editorial Document Viewer) */
          <div className="mx-auto w-full max-w-3xl py-8 px-6 sm:px-10 md:px-14 leading-[1.68rem] text-primary font-claude-serif text-[1rem] bg-white">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
               rehypePlugins={[rehypeSanitize]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mt-2 mb-4 text-[1.65rem] sm:text-[1.85rem] font-bold text-primary leading-tight font-claude-serif">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-7 mb-3 text-[1.25rem] sm:text-[1.35rem] font-bold text-primary leading-snug font-claude-serif">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-5 mb-2 text-[1.08rem] sm:text-[1.15rem] font-bold text-primary font-claude-serif">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="mt-4 mb-1.5 text-[0.98rem] sm:text-[1.02rem] font-bold text-primary font-claude-serif">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <div className="mb-4 text-primary font-claude-serif leading-[1.68rem] break-words text-[1rem]">
                    {children}
                  </div>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-primary">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-primary">{children}</em>
                ),
                del: ({ children }) => (
                  <del className="line-through text-primary">{children}</del>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-1.5 text-primary font-claude-serif">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-primary font-claude-serif">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="pl-1 leading-[1.68rem]">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary pl-4 italic my-4 text-secondary">
                    {children}
                  </blockquote>
                ),
                code: ({ inline, children }: any) => {
                  const text = String(children).trim();
                  const isColorHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(text);
                  return inline ? (
                    <code className="mx-0.5 bg-accent text-rose-600 whitespace-pre-wrap rounded-[0.35rem] px-1.5 py-0.5 text-[0.875rem] font-mono font-normal inline-flex items-center">
                      {isColorHex && (
                        <span
                          className="color-swatch-dot mr-1 inline-block w-2.5 h-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: text }}
                        />
                      )}
                      {children}
                    </code>
                  ) : (
                    <div className="my-4 rounded-xl border border-primary bg-primary p-4 text-light-2 font-mono text-xs overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{children}</pre>
                    </div>
                  );
                },
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-primary text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-light-2 border border-primary p-2 font-semibold text-primary">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-primary p-2 text-primary">{children}</td>
                ),
              }}
            >
              {artifact.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Bottom Footer Bar */}
      <div className={`border-t border-primary px-4 py-2 text-[11px] text-secondary flex items-center justify-between font-claude-sans shrink-0 ${PANEL_BG}`}>
        <span className="truncate">{artifact.description || "wim's ai bots canvas"}</span>
        <span className="shrink-0 font-mono text-[10px] bg-light-2 px-2 py-0.5 rounded text-primary">
          {isMermaidContent ? 'mermaid' : (artifact.language || artifact.type)}
        </span>
      </div>
    </aside>
  );
};
