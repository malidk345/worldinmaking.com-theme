import { normalizeSandboxReactSource, WIM_UI_SOURCE } from './wimUiSource'
import { chromeStylesheet, readHostChrome } from '../../../lib/chrome'

const WIM_UI_EXPORTS = [
    'cn',
    'Card',
    'CardHeader',
    'CardTitle',
    'CardDescription',
    'CardContent',
    'CardFooter',
    'Button',
    'Badge',
    'Tabs',
    'TabsList',
    'TabsTrigger',
    'TabsContent',
    'Input',
    'Textarea',
    'Label',
    'Select',
    'Table',
    'TableHeader',
    'TableBody',
    'TableRow',
    'TableHead',
    'TableCell',
    'Alert',
    'AlertTitle',
    'AlertDescription',
    'Separator',
    'Skeleton',
    'Progress',
    'Dialog',
    'DialogTrigger',
    'DialogContent',
    'DialogHeader',
    'DialogFooter',
    'DialogTitle',
    'DialogDescription',
    'Sheet',
    'SheetTrigger',
    'SheetContent',
    'SheetHeader',
    'SheetTitle',
    'SheetDescription',
    'Avatar',
    'AvatarImage',
    'AvatarFallback',
    'Switch',
    'Checkbox',
    'ScrollArea',
    'Tooltip',
    'TooltipTrigger',
    'TooltipContent',
    'TooltipProvider',
    'DropdownMenu',
    'DropdownMenuTrigger',
    'DropdownMenuContent',
    'DropdownMenuItem',
    'Accordion',
    'AccordionItem',
    'AccordionTrigger',
    'AccordionContent',
] as const

type BabelStandalone = {
    transform: (
        code: string,
        options: Record<string, unknown>
    ) => { code?: string | null }
    availablePresets: Record<string, unknown>
}

let babelLoader: Promise<BabelStandalone> | null = null

function loadBabel(): Promise<BabelStandalone> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Preview compiler only runs in the browser'))
    }
    const existing = (window as Window & { Babel?: BabelStandalone }).Babel
    if (existing?.transform) return Promise.resolve(existing)
    if (babelLoader) return babelLoader

    babelLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@babel/standalone@7.26.10/babel.min.js'
        script.crossOrigin = 'anonymous'
        script.onload = () => {
            const babel = (window as Window & { Babel?: BabelStandalone }).Babel
            if (!babel?.transform) {
                reject(new Error('Babel loaded but transform() is missing'))
                return
            }
            resolve(babel)
        }
        script.onerror = () => reject(new Error('Could not load the preview compiler'))
        document.head.appendChild(script)
    })
    return babelLoader
}

function namespaceFor(mod: string): string | null {
    if (mod === 'react') return 'React'
    if (mod === 'react-dom' || mod === 'react-dom/client') return 'ReactDOM'
    if (mod === './wim-ui' || mod === '@wim/ui' || /@\/components\/ui/.test(mod) || /components\/ui/.test(mod)) {
        return 'WimUI'
    }
    if (mod === '@/lib/utils' || mod === 'clsx' || mod === 'tailwind-merge') return 'WimUI'
    if (mod === 'lucide-react') return 'LucideReact'
    if (mod === 'recharts') return 'Recharts'
    if (mod === 'framer-motion') return 'Motion'
    return null
}

type ScanState = { blockComment: boolean }

function bracketDeltas(line: string, state?: ScanState): { paren: number; brace: number; bracket: number } {
    let paren = 0
    let brace = 0
    let bracket = 0
    let quote: '"' | "'" | '`' | null = null
    let escape = false
    const persist = state || { blockComment: false }
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (persist.blockComment) {
            if (ch === '*' && line[i + 1] === '/') {
                persist.blockComment = false
                i += 1
            }
            continue
        }
        if (quote) {
            if (escape) {
                escape = false
                continue
            }
            if (ch === '\\') {
                escape = true
                continue
            }
            if (ch === quote) quote = null
            continue
        }
        if (ch === '/' && line[i + 1] === '/') break
        if (ch === '/' && line[i + 1] === '*') {
            persist.blockComment = true
            i += 1
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch
            continue
        }
        if (ch === '(') paren += 1
        else if (ch === ')') paren -= 1
        else if (ch === '{') brace += 1
        else if (ch === '}') brace -= 1
        else if (ch === '[') bracket += 1
        else if (ch === ']') bracket -= 1
    }
    return { paren, brace, bracket }
}

function takeBalancedLines(lines: string[], start: number): { lines: string[]; next: number } {
    const taken: string[] = []
    let brace = 0
    let paren = 0
    let bracket = 0
    let i = start
    const state: ScanState = { blockComment: false }
    do {
        const line = lines[i] ?? ''
        taken.push(line)
        const delta = bracketDeltas(line, state)
        brace += delta.brace
        paren += delta.paren
        bracket += delta.bracket
        i += 1
    } while (i < lines.length && (brace > 0 || paren > 0 || bracket > 0 || state.blockComment))
    return { lines: taken, next: i }
}

const DECL_RE =
    /^\s*(?:const|let|var)\s+(?:[A-Za-z_$][\w$]*|\[[^\]]*\]?|\{[^}]*\}?)\s*=/
const FN_DECL_RE = /^\s*function\s+[A-Za-z_$]/

function jsxBodyOpenIndex(line: string): number {
    const returnParen = line.search(/\breturn\s*\(/)
    const returnJsx = line.search(/\breturn\s*</)
    const arrowParen = line.search(/=>\s*\(/)
    const arrowJsx = line.search(/=>\s*</)
    const hits = [returnParen, returnJsx, arrowParen, arrowJsx].filter((n) => n >= 0)
    return hits.length ? Math.min(...hits) : -1
}

function isMisplacedDecl(line: string): boolean {
    return DECL_RE.test(line) || FN_DECL_RE.test(line)
}

/**
 * Models often drop `const data = [{ key: value }]` inside JSX.
 * In JSX `{ key: value }` is an expression, so Babel reports
 * `Unexpected token, expected "}"` at the first object field.
 * Pull those statements (and their `//` comments) above the JSX body.
 * Also handles `const Screen = () => (` and `return <div>` without parens.
 */
export function hoistJsxEmbeddedStatements(source: string): string {
    const lines = String(source || '').split(/\r?\n/)
    const skip = new Set<number>()
    const hoistedBefore = new Map<number, string[]>()
    let parenDepth = 0
    let braceDepth = 0
    let returnAt = -1
    let returnParenDepth = 0
    let braceAtReturn = 0
    let bareJsx = false
    const scan: ScanState = { blockComment: false }

    for (let i = 0; i < lines.length; i++) {
        if (skip.has(i)) continue
        const line = lines[i]
        if (returnAt >= 0 && !scan.blockComment && braceDepth === braceAtReturn && isMisplacedDecl(line)) {
            const block = takeBalancedLines(lines, i)
            const chunk: string[] = []
            let commentAt = i - 1
            while (commentAt >= 0 && /^\s*\/\//.test(lines[commentAt]) && !skip.has(commentAt)) {
                chunk.unshift(lines[commentAt])
                commentAt -= 1
            }
            chunk.push(...block.lines)
            const list = hoistedBefore.get(returnAt) || []
            list.push(chunk.join('\n'))
            hoistedBefore.set(returnAt, list)
            for (let j = commentAt + 1; j < block.next; j++) skip.add(j)
            i = block.next - 1
            continue
        }

        if (returnAt < 0 && !scan.blockComment) {
            const openAt = jsxBodyOpenIndex(line)
            if (openAt >= 0) {
                returnAt = i
                braceAtReturn = braceDepth
                bareJsx = /(?:return|=>)\s*</.test(line)
                if (!bareJsx) {
                    const parenAt = line.indexOf('(', openAt)
                    const before = bracketDeltas(line.slice(0, openAt))
                    const through = bracketDeltas(line.slice(0, parenAt + 1))
                    returnParenDepth = parenDepth + through.paren - before.paren
                } else {
                    returnParenDepth = 0
                }
            }
        }

        const delta = bracketDeltas(line, scan)
        parenDepth += delta.paren
        braceDepth += delta.brace
        const closedParen = !bareJsx && returnAt >= 0 && parenDepth < returnParenDepth
        const closedFn = bareJsx && returnAt >= 0 && braceDepth < braceAtReturn
        if (closedParen || closedFn) {
            returnAt = -1
            returnParenDepth = 0
            braceAtReturn = 0
            bareJsx = false
        }
    }

    if (hoistedBefore.size === 0) return String(source || '')

    const out: string[] = []
    for (let i = 0; i < lines.length; i++) {
        const blocks = hoistedBefore.get(i)
        if (blocks) {
            const indent = (lines[i].match(/^\s*/) || [''])[0]
            for (const block of blocks) {
                const shifted = block
                    .split('\n')
                    .map((row) => {
                        const trimmed = row.trimStart()
                        return trimmed ? indent + trimmed : ''
                    })
                    .join('\n')
                out.push(shifted)
            }
            if (out[out.length - 1] !== '') out.push('')
        }
        if (!skip.has(i)) out.push(lines[i])
    }
    return out.join('\n')
}

function rewriteOneImport(spec: string, mod: string): string {
    const binding = String(spec).trim()
    const ns = namespaceFor(mod)
    if (!ns) return `/* skipped import ${mod} */`
    if (/^type\s/.test(binding)) return ''
    if (ns === 'React') {
        if (binding === 'React' || binding === '* as React') return ''
        const reactNamed = binding.match(/^React\s*,\s*(\{[\s\S]*\})$/)
        if (reactNamed) return `const ${reactNamed[1]} = React;`
        if (binding.startsWith('* as ')) {
            const alias = binding.slice(5).trim()
            return alias === 'React' ? '' : `const ${alias} = React;`
        }
    }
    if (binding.startsWith('* as ')) return `const ${binding.slice(5).trim()} = ${ns};`
    const defaultAndNamed = binding.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]*\})$/)
    if (defaultAndNamed) {
        if (defaultAndNamed[1] === ns) return `const ${defaultAndNamed[2]} = ${ns};`
        return `const ${defaultAndNamed[1]} = ${ns}.default || ${ns};\nconst ${defaultAndNamed[2]} = ${ns};`
    }
    if (binding.startsWith('{')) return `const ${binding} = ${ns};`
    if (binding === ns) return ''
    return `const ${binding} = ${ns}.default || ${ns};`
}

/** Turn ESM imports into globals so the preview can run without a bundler. */
export function rewritePreviewImports(source: string): string {
    return String(source || '').replace(
        /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g,
        (_match, spec: string, mod: string) => rewriteOneImport(spec, mod)
    )
}

const HOOK_NAMES = ['useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 'useId', 'useReducer']

function injectMissingHooks(code: string): string {
    const missing = HOOK_NAMES.filter(
        (name) => new RegExp(`\\b${name}\\s*\\(`).test(code) && !new RegExp(`\\b${name}\\b.*=\\s*React`).test(code)
    )
    if (missing.length === 0) return code
    return `const { ${missing.join(', ')} } = React;\n${code}`
}

const RECHARTS_TAGS = [
    'LineChart',
    'BarChart',
    'AreaChart',
    'PieChart',
    'ResponsiveContainer',
    'Line',
    'Bar',
    'Area',
    'XAxis',
    'YAxis',
    'CartesianGrid',
    'Tooltip',
    'Legend',
    'Cell',
]

function injectMissingRecharts(code: string): string {
    const missing = RECHARTS_TAGS.filter(
        (name) => new RegExp(`<${name}\\b`).test(code) && !new RegExp(`\\b${name}\\b\\s*[=,}]`).test(code)
    )
    if (missing.length === 0) return code
    return `const { ${missing.join(', ')} } = Recharts;\n${code}`
}

const DATA_DECL_RE = /^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*(?::[^=\n]+)?=\s*[{\[]/

/**
 * Pull every `const name = [{ ... }]` / `{ ... }` data literal to the top
 * of the file. Does not care about `return` / braces / JSX — that is why
 * context-aware hoist still missed the Culture Industry screen.
 */
export function liftDataDeclarations(source: string): string {
    const lines = String(source || '').split(/\r?\n/)
    const skip = new Set<number>()
    const lifted: string[] = []

    for (let i = 0; i < lines.length; i++) {
        if (skip.has(i)) continue
        const line = lines[i]
        if (!DATA_DECL_RE.test(line)) continue
        if (/=\s*(?:\(|async[\s(]|function\b|<)/.test(line)) continue

        const block = takeBalancedLines(lines, i)
        if (block.lines.some((row) => /\breturn\s*(?:\(|<)/.test(row))) continue

        const chunk: string[] = []
        let commentAt = i - 1
        while (commentAt >= 0 && /^\s*\/\//.test(lines[commentAt]) && !skip.has(commentAt)) {
            chunk.unshift(lines[commentAt].trimStart())
            commentAt -= 1
        }
        chunk.push(...block.lines.map((row) => row.trimStart()))
        lifted.push(chunk.join('\n'))
        for (let j = commentAt + 1; j < block.next; j++) skip.add(j)
        i = block.next - 1
    }

    if (lifted.length === 0) return String(source || '')
    const rest = lines.filter((_, index) => !skip.has(index)).join('\n')
    return `${lifted.join('\n\n')}\n\n${rest}`
}

function findUnescapedQuote(line: string, quote: '"' | "'"): number {
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '\\') {
            i += 1
            continue
        }
        if (line[i] === quote) return i
    }
    return -1
}

function findUnclosedAttrString(line: string): { quoteAt: number; quote: '"' | "'"; after: string } | null {
    let quote: '"' | "'" | '`' | null = null
    let attrQuoteAt = -1
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (quote) {
            if (ch === '\\' && quote !== '`') {
                i += 1
                continue
            }
            if (ch === quote) {
                quote = null
                attrQuoteAt = -1
            }
            continue
        }
        const prev = i > 0 ? line[i - 1] : ''
        if ((ch === '"' || ch === "'") && (prev === '=' || prev === '{')) {
            quote = ch
            attrQuoteAt = i
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') quote = ch
    }
    if ((quote === '"' || quote === "'") && attrQuoteAt >= 0) {
        return { quoteAt: attrQuoteAt, quote, after: line.slice(attrQuoteAt + 1).trim() }
    }
    return null
}

function formatAttrValue(inner: string, quote: '"' | "'"): string {
    const text = inner.replace(/\s+/g, ' ').trim()
    if (!text) return `${quote}${quote}`
    if (/^\{[\s\S]*\}$/.test(text)) return text
    if (/\{[\s\S]*\}/.test(text)) {
        return `{\`${text.replace(/\{([^{}]+)\}/g, '${$1}')}\`}`
    }
    return `${quote}${text}${quote}`
}

/**
 * Models wrap Tailwind class lists across lines inside "quotes".
 * A JS string cannot contain a raw newline. If the next line is `{expr}`,
 * keep collecting — do not close an empty className="".
 */
export function repairJsxAttributeStrings(source: string): string {
    const lines = String(source || '').split(/\r?\n/)
    const out: string[] = []
    let pending: { quote: '"' | "'"; buf: string } | null = null

    for (const line of lines) {
        if (pending) {
            const close = findUnescapedQuote(line, pending.quote)
            if (close >= 0) {
                const extra = line.slice(0, close).trim()
                if (extra) pending.buf = `${pending.buf} ${extra}`.trim()
                out[out.length - 1] += `${formatAttrValue(pending.buf, pending.quote)}${line.slice(close + 1)}`
                pending = null
                continue
            }
            if (/^\s*\/?>/.test(line) || /^\s*<\//.test(line)) {
                out[out.length - 1] += formatAttrValue(pending.buf, pending.quote)
                if (/^\s*<\//.test(line) && !jsxLineEndsInsideClosedTag(out[out.length - 1])) {
                    out[out.length - 1] += '>'
                }
                pending = null
                out.push(line)
                continue
            }
            const more = line.trim()
            if (more) pending.buf = `${pending.buf} ${more}`.trim()
            continue
        }

        const unclosed = findUnclosedAttrString(line)
        if (unclosed) {
            out.push(line.slice(0, unclosed.quoteAt))
            pending = { quote: unclosed.quote, buf: unclosed.after }
            continue
        }
        out.push(line)
    }

    if (pending) {
        if (out.length === 0) out.push('')
        out[out.length - 1] += formatAttrValue(pending.buf, pending.quote)
        if (!jsxLineEndsInsideClosedTag(out[out.length - 1])) {
            out[out.length - 1] += '>'
        }
    }
    return out.join('\n')
}

function findAnyUnclosedQuote(line: string): { quote: '"' | "'"; at: number } | null {
    let quote: '"' | "'" | '`' | null = null
    let at = -1
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (quote) {
            if (ch === '\\' && quote !== '`') {
                i += 1
                continue
            }
            if (ch === quote) {
                quote = null
                at = -1
            }
            continue
        }
        if (ch === '"' || ch === "'") {
            quote = ch
            at = i
        } else if (ch === '`') {
            quote = '`'
            at = i
        }
    }
    if ((quote === '"' || quote === "'") && at >= 0) return { quote, at }
    return null
}

function ternaryMissingElse(inner: string): boolean {
    let quote: '"' | "'" | '`' | null = null
    let sawQuestion = false
    let sawColon = false
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i]
        if (quote) {
            if (ch === '\\' && quote !== '`') {
                i += 1
                continue
            }
            if (ch === quote) quote = null
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch
            continue
        }
        if (ch === '?') {
            sawQuestion = true
            sawColon = false
        } else if (ch === ':' && sawQuestion) {
            sawColon = true
        }
    }
    return sawQuestion && !sawColon
}

function looksLikeColorLiteral(text: string): boolean {
    return /#[0-9A-Fa-f]{3,8}/.test(text) || /\b(?:fill|stroke|color|background)\b/.test(text)
}

function balanceOpenJsxExprTail(line: string): string {
    let quote: '"' | "'" | '`' | null = null
    let brace = 0
    let paren = 0
    let lastOpenBrace = -1
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (quote) {
            if (ch === '\\' && quote !== '`') {
                i += 1
                continue
            }
            if (ch === quote) quote = null
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch
            continue
        }
        if (ch === '{') {
            if (brace === 0) lastOpenBrace = i
            brace += 1
        } else if (ch === '}') brace -= 1
        else if (ch === '(') paren += 1
        else if (ch === ')') paren -= 1
    }

    let next = line
    if (brace > 0 && lastOpenBrace >= 0 && ternaryMissingElse(next.slice(lastOpenBrace + 1))) {
        next += looksLikeColorLiteral(next) ? " : '#94a3b8'" : " : ''"
    }

    quote = null
    brace = 0
    paren = 0
    for (let i = 0; i < next.length; i++) {
        const ch = next[i]
        if (quote) {
            if (ch === '\\' && quote !== '`') {
                i += 1
                continue
            }
            if (ch === quote) quote = null
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') quote = ch
        else if (ch === '{') brace += 1
        else if (ch === '}') brace -= 1
        else if (ch === '(') paren += 1
        else if (ch === ')') paren -= 1
    }
    while (brace > 0) {
        next += '}'
        brace -= 1
    }
    while (paren > 0) {
        next += ')'
        paren -= 1
    }
    return next
}

/**
 * Close JS strings that the model split or truncated inside `{expr}`
 * (`fill={isSelected ? '#1e3a5f`). A JS string cannot contain a raw newline.
 */
export function repairUnterminatedJsStrings(source: string): string {
    const lines = String(source || '').split(/\r?\n/)
    const out: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const unclosed = findAnyUnclosedQuote(line)
        if (!unclosed) {
            out.push(line)
            continue
        }

        let nextIdx = i + 1
        while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx += 1
        const following = nextIdx < lines.length ? lines[nextIdx].trim() : ''

        if (following && !/^(?:\/?>|<\/|[A-Za-z_:][\w:-]*\s*=)/.test(following) && !/^[:?]/.test(following)) {
            const close = findUnescapedQuote(lines[nextIdx], unclosed.quote)
            if (close < 0) {
                const extra = following.replace(/^[:=]\s*/, '')
                if (extra && !/^[{<(]/.test(extra)) {
                    out.push(balanceOpenJsxExprTail(`${line.slice(0, unclosed.at)}${unclosed.quote}${extra}${unclosed.quote}`))
                    i = nextIdx
                    continue
                }
            }
        }

        if (/^:/.test(following)) {
            out.push(balanceOpenJsxExprTail(line + unclosed.quote))
            continue
        }

        out.push(balanceOpenJsxExprTail(line + unclosed.quote))
    }

    return out.join('\n')
}

type JsxScanState = {
    inTag: boolean
    quote: '"' | "'" | '`' | null
    expr: number
    escape: boolean
}

function createJsxScanState(): JsxScanState {
    return { inTag: false, quote: null, expr: 0, escape: false }
}

function scanJsxLine(line: string, state: JsxScanState): void {
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        const next = line[i + 1] || ''
        if (state.quote) {
            if (state.escape) {
                state.escape = false
                continue
            }
            if (ch === '\\' && state.quote !== '`') {
                state.escape = true
                continue
            }
            if (ch === state.quote) state.quote = null
            continue
        }
        if (state.expr > 0) {
            if (ch === '"' || ch === "'" || ch === '`') {
                state.quote = ch
                continue
            }
            if (ch === '{') state.expr += 1
            else if (ch === '}') state.expr -= 1
            continue
        }
        if (state.inTag) {
            if (ch === '"' || ch === "'" || ch === '`') {
                state.quote = ch
                continue
            }
            if (ch === '{') {
                state.expr += 1
                continue
            }
            if (ch === '/' && next === '>') {
                state.inTag = false
                i += 1
                continue
            }
            if (ch === '>') {
                state.inTag = false
                continue
            }
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            state.quote = ch
            continue
        }
        if (ch === '{') {
            state.expr += 1
            continue
        }
        if (ch === '<' && /[A-Za-z/]/.test(next)) {
            state.inTag = true
        }
    }
}

function jsxLineEndsInsideClosedTag(line: string): boolean {
    const state = createJsxScanState()
    scanJsxLine(line, state)
    return !state.inTag && !state.quote && state.expr === 0
}

function isJsxAttributeContinuation(line: string): boolean {
    const text = line.trim()
    if (!text) return true
    if (/^\/?>/.test(text)) return true
    if (/^\/[/*]/.test(text)) return true
    if (/^\{\s*\.\.\./.test(text)) return true
    return /^[A-Za-z_:][\w:-]*(?:\s*=|$)/.test(text)
}

function looksLikeJsxChildLine(line: string): boolean {
    const text = line.trim()
    if (!text) return false
    if (/^<\//.test(text) || /^<[A-Za-z]/.test(text)) return true
    if (isJsxAttributeContinuation(line)) return false
    if (/^\{\s*\.\.\./.test(text)) return false
    if (/^\{/.test(text)) return true
    return /^[A-Za-z0-9"'`]/.test(text)
}

function lineOpensUnclosedJsxTag(line: string): boolean {
    const text = line.trim()
    if (!/^<[A-Za-z]/.test(text)) return false
    const state = createJsxScanState()
    scanJsxLine(line, state)
    return state.inTag && !state.quote && state.expr === 0
}

function attributeLineClosesTag(line: string): boolean {
    const state = createJsxScanState()
    state.inTag = true
    scanJsxLine(line, state)
    return !state.inTag && !state.quote && state.expr === 0
}

/**
 * Models often emit `<tr key={id} className="">` with no `>` before the
 * next child. Sandpack then throws SyntaxError and crashes while writing
 * `error.message` (read-only on SyntaxError).
 *
 * Scan line-locally. A file-wide brace walk treats
 * `{recentOrders.map((order) => (` as an expression and misses the
 * dangling `<tr>` inside the callback.
 */
export function repairUnclosedJsxOpeningTags(source: string): string {
    const lines = String(source || '').split(/\r?\n/)
    const out: string[] = []
    let awaitingTagClose = false

    for (const line of lines) {
        if (awaitingTagClose && looksLikeJsxChildLine(line)) {
            if (out.length > 0) out[out.length - 1] += '>'
            awaitingTagClose = false
        }

        out.push(line)

        if (lineOpensUnclosedJsxTag(line)) {
            awaitingTagClose = true
        } else if (awaitingTagClose && isJsxAttributeContinuation(line)) {
            if (attributeLineClosesTag(line)) awaitingTagClose = false
        } else if (awaitingTagClose && !isJsxAttributeContinuation(line)) {
            awaitingTagClose = false
        }
    }

    if (awaitingTagClose && out.length > 0) out[out.length - 1] += '>'
    return out.join('\n')
}

export function jsxSourceLooksBroken(source: string): boolean {
    const lines = String(source || '').split(/\r?\n/)
    let awaitingTagClose = false
    for (const line of lines) {
        if (lineOpensUnclosedJsxTag(line)) awaitingTagClose = true
        else if (awaitingTagClose && isJsxAttributeContinuation(line)) {
            if (attributeLineClosesTag(line)) awaitingTagClose = false
        } else if (awaitingTagClose && looksLikeJsxChildLine(line)) {
            return true
        } else if (awaitingTagClose && !isJsxAttributeContinuation(line)) {
            awaitingTagClose = false
        }
    }
    return awaitingTagClose
}

type JsxFrame =
    | { kind: 'paren' | 'brace' | 'bracket' }
    | { kind: 'tag'; name: string; indent: string; empty: boolean }

function inferMapRowCells(source: string, indent: string): string {
    const maps = [...String(source || '').matchAll(/(\w+)\.map\(\(\s*([A-Za-z_$][\w$]*)/g)]
    const last = maps[maps.length - 1]
    if (!last) return ''
    const [, arrName, item] = last
    const decl = source.match(new RegExp(`(?:const|let|var)\\s+${arrName}\\s*=\\s*\\[\\s*\\{([\\s\\S]*?)\\}`))
    if (!decl?.[1]) return ''
    const keys = [...decl[1].matchAll(/([\p{L}_$][\p{L}\p{N}_$]*)\s*:/gu)].map((match) => match[1])
    if (keys.length === 0) return ''
    return keys.map((key) => `${indent}  <td>{${item}.${key}}</td>`).join('\n')
}

/**
 * Models often get cut off mid-JSX (`<tr className="` then EOF).
 * Close leftover tags / parens / braces so Babel can parse the screen.
 */
export function closeTruncatedJsx(source: string): string {
    const text = String(source || '')
    if (!text.trim()) return text

    const frames: JsxFrame[] = []
    let quote: '"' | "'" | '`' | null = null
    let escape = false
    let lineComment = false
    let blockComment = false
    let inTag = false
    let tagName = ''
    let tagNameDone = false
    let tagIsClose = false
    let tagSelfClose = false
    let lineIndent = ''
    let atLineStart = true
    let exprDepthInTag = 0

    const markParentHasChild = () => {
        for (let i = frames.length - 1; i >= 0; i--) {
            const frame = frames[i]
            if (frame.kind === 'tag') {
                frame.empty = false
                return
            }
        }
    }

    const pushTag = (name: string) => {
        markParentHasChild()
        frames.push({ kind: 'tag', name, indent: lineIndent, empty: true })
    }

    const popTag = (name: string) => {
        for (let i = frames.length - 1; i >= 0; i--) {
            const frame = frames[i]
            if (frame.kind === 'tag' && (!name || frame.name === name)) {
                frames.splice(i, 1)
                return
            }
        }
    }

    const popPair = (kind: 'paren' | 'brace' | 'bracket') => {
        if (frames.length && frames[frames.length - 1].kind === kind) frames.pop()
    }

    const finishTag = () => {
        inTag = false
        if (!tagSelfClose) {
            if (tagIsClose) popTag(tagName)
            else if (tagName) pushTag(tagName)
        }
        tagName = ''
        tagNameDone = false
        tagIsClose = false
        tagSelfClose = false
    }

    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        const next = text[i + 1] || ''

        if (ch === '\n') {
            lineComment = false
            lineIndent = ''
            atLineStart = true
            escape = false
            continue
        }

        if (atLineStart) {
            if (ch === ' ' || ch === '\t') {
                lineIndent += ch
                continue
            }
            atLineStart = false
        }

        if (lineComment) continue
        if (blockComment) {
            if (ch === '*' && next === '/') {
                blockComment = false
                i += 1
            }
            continue
        }

        if (quote) {
            if (escape) {
                escape = false
                continue
            }
            if (ch === '\\' && quote !== '`') {
                escape = true
                continue
            }
            if (ch === quote) quote = null
            continue
        }

        if (inTag) {
            if (exprDepthInTag > 0) {
                if (ch === '"' || ch === "'" || ch === '`') {
                    quote = ch
                    continue
                }
                if (ch === '{') exprDepthInTag += 1
                else if (ch === '}') exprDepthInTag -= 1
                continue
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                quote = ch
                continue
            }
            if (ch === '{') {
                exprDepthInTag = 1
                continue
            }
            if (ch === '/' && next === '>') {
                tagSelfClose = true
                i += 1
                finishTag()
                continue
            }
            if (ch === '>') {
                finishTag()
                continue
            }
            if (!tagNameDone) {
                if (!tagName && (ch === '/' || ch === '!')) {
                    tagIsClose = ch === '/'
                    continue
                }
                if (/[A-Za-z0-9._:-]/.test(ch)) tagName += ch
                else if (tagName) tagNameDone = true
            }
            continue
        }

        if (ch === '/' && next === '/') {
            lineComment = true
            i += 1
            continue
        }
        if (ch === '/' && next === '*') {
            blockComment = true
            i += 1
            continue
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch
            continue
        }
        if (ch === '<' && /[A-Za-z/!]/.test(next)) {
            inTag = true
            tagName = ''
            tagNameDone = false
            tagIsClose = false
            tagSelfClose = false
            continue
        }
        if (ch === '{') frames.push({ kind: 'brace' })
        else if (ch === '}') popPair('brace')
        else if (ch === '(') frames.push({ kind: 'paren' })
        else if (ch === ')') popPair('paren')
        else if (ch === '[') frames.push({ kind: 'bracket' })
        else if (ch === ']') popPair('bracket')
    }

    if (frames.length === 0 && !inTag) return text

    let nextSource = text
    if (inTag) {
        nextSource += tagSelfClose ? '/>' : '>'
        finishTag()
    }

    const closers: string[] = []
    for (let i = frames.length - 1; i >= 0; ) {
        const frame = frames[i]
        if (frame.kind === 'tag') {
            if (frame.empty && /^(tr|TableRow)$/i.test(frame.name)) {
                const cells = inferMapRowCells(nextSource, frame.indent)
                if (cells) closers.push(cells)
            }
            closers.push(`${frame.indent}</${frame.name}>`)
            i -= 1
            continue
        }
        let chunk = ''
        while (i >= 0 && frames[i].kind !== 'tag') {
            const kind = frames[i].kind
            chunk += kind === 'paren' ? ')' : kind === 'brace' ? '}' : ']'
            i -= 1
        }
        if (chunk) closers.push(chunk)
    }

    if (closers.length === 0) return nextSource
    return `${nextSource}${nextSource.endsWith('\n') ? '' : '\n'}${closers.join('\n')}\n`
}

/** Repair invalid LLM TSX, keep ESM so Sandpack can bundle it. */
export function prepareSandpackSource(source: string): string {
    const next = closeTruncatedJsx(
        hoistJsxEmbeddedStatements(
            liftDataDeclarations(
                repairUnclosedJsxOpeningTags(
                    repairUnterminatedJsStrings(repairJsxAttributeStrings(normalizeSandboxReactSource(source)))
                )
            )
        )
    ).trim()
    if (!next || /shadcn\.css/.test(next)) return next
    return `import './shadcn.css'\n${next}`
}

export function preparePreviewSource(source: string): { code: string; rootName: string } {
    let next = rewritePreviewImports(normalizeSandboxReactSource(source))
    const named =
        next.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9]*)/) ||
        next.match(/export\s+default\s+([A-Z][A-Za-z0-9]*)/) ||
        next.match(/function\s+([A-Z][A-Za-z0-9]*)\s*\(/) ||
        next.match(/const\s+([A-Z][A-Za-z0-9]*)\s*=/)
    const rootName = named?.[1] || 'App'
    next = next
        .replace(/export\s+default\s+function\s+([A-Z][A-Za-z0-9]*)/g, 'function $1')
        .replace(/export\s+default\s+([A-Z][A-Za-z0-9]*)\s*;?/g, '')
        .replace(/export\s+default\s+/g, `const ${rootName} = `)
        .replace(/export\s+function\s+/g, 'function ')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/<\/script/gi, '<\\/script')
    next = injectMissingRecharts(
        injectMissingHooks(
            closeTruncatedJsx(
                hoistJsxEmbeddedStatements(
                    liftDataDeclarations(
                        repairUnclosedJsxOpeningTags(repairUnterminatedJsStrings(repairJsxAttributeStrings(next)))
                    )
                )
            )
        )
    )
    return { code: next.trim(), rootName }
}

export function iframeUiSource(): string {
    return (
        WIM_UI_SOURCE.replace(/^import[^\n]*\n/gm, '')
            .replace(
                /export function cn\([\s\S]*?\n\}/,
                `function cn(...inputs){ return inputs.filter(Boolean).join(' ') }`
            )
            .replace(/export function/g, 'function') +
        `\nconst WimUI = { ${WIM_UI_EXPORTS.join(', ')} };\n`
    )
}

function escapeScript(value: string): string {
    return value.replace(/<\/script/gi, '<\\/script')
}

function compileTsx(babel: BabelStandalone, code: string, filename: string): string {
    const typescript = babel.availablePresets.typescript || 'typescript'
    const react = babel.availablePresets.react || 'react'
    const transform = (input: string) => {
        const result = babel.transform(input, {
            presets: [
                [react, { runtime: 'classic', development: false }],
                [typescript, { isTSX: true, allExtensions: true, allowNamespaces: true }],
            ],
            filename,
            babelrc: false,
            configFile: false,
            sourceType: 'module',
            parserOpts: {
                sourceType: 'module',
                plugins: ['jsx', 'typescript'],
                allowReturnOutsideFunction: true,
            },
        })
        if (!result?.code) throw new Error(`empty compiler output`)
        return result.code
    }
    try {
        return transform(code)
    } catch (error) {
        if (filename === 'Preview.tsx') {
            const salvaged = closeTruncatedJsx(liftDataDeclarations(hoistJsxEmbeddedStatements(code)))
            if (salvaged !== code) {
                try {
                    return transform(salvaged)
                } catch {
                    // fall through to the original error
                }
            }
        }
        const detail = error instanceof Error ? error.message : String(error)
        throw new Error(`${filename}: ${detail.replace(/^unknown:\s*/i, '')}`)
    }
}

const SLATE_CSS = `
.min-h-screen{min-height:100vh}.min-h-0{min-height:0}.min-w-0{min-width:0}
`

const PREVIEW_HELPERS = `
function kebab(name) {
  return String(name).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
window.LucideReact = new Proxy({}, {
  get: function (_target, name) {
    if (name === '__esModule') return true;
    return function LucideIcon(props) {
      props = props || {};
      var size = props.size || 24;
      return React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props.strokeWidth || 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: props.className,
        'aria-hidden': true
      },
        React.createElement('circle', { cx: 12, cy: 12, r: 9 }),
        React.createElement('path', { d: 'M12 8v4l2 2' })
      );
    };
  }
});
function MotionTag(tag) {
  return React.forwardRef(function MotionEl(props, ref) {
    var next = Object.assign({}, props || {});
    delete next.initial; delete next.animate; delete next.exit; delete next.transition;
    delete next.variants; delete next.layout; delete next.layoutId;
    next.ref = ref;
    return React.createElement(tag, next);
  });
}
window.Motion = new Proxy({ AnimatePresence: function (props) { return props.children || null; } }, {
  get: function (target, name) {
    if (name in target) return target[name];
    if (name === 'motion') {
      return new Proxy({}, { get: function (_t, tag) { return MotionTag(tag); } });
    }
    return MotionTag(name);
  }
});
window.Recharts = window.Recharts || {};
`

export function needsRecharts(source: string): boolean {
    return /from\s+['"]recharts['"]|<(LineChart|BarChart|AreaChart|PieChart|ResponsiveContainer)\b/.test(
        String(source || '')
    )
}

export function buildLoadingSrcDoc(): string {
    return `<!DOCTYPE html><html><body style="margin:0;font:13px RoundHog,system-ui,sans-serif;color:#646464;background:#fdfdfd;padding:16px">Preparing preview…</body></html>`
}

export async function buildReactPreviewSrcDoc(source: string): Promise<string> {
    const babel = await loadBabel()
    const { code, rootName } = preparePreviewSource(source)
    const uiCode = compileTsx(babel, iframeUiSource(), 'wim-ui.tsx')
    const appCode = compileTsx(babel, code, 'Preview.tsx')
    const recharts = needsRecharts(source)
        ? '<script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js" crossorigin="anonymous"></script>\n  <script src="https://unpkg.com/recharts@2.10.3/umd/Recharts.js" crossorigin="anonymous"></script>'
        : ''

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" />
  <style>${chromeStylesheet(readHostChrome())}
${SLATE_CSS}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></script>
  ${recharts}
  <script>
    (function () {
      function show(err) {
        var root = document.getElementById('root');
        var text = (err && err.message) ? err.message : String(err || 'Preview failed');
        if (text === 'Script error.' || text === 'Script error') {
          text = 'The preview hit a script error. Try again, or simplify the screen.';
        }
        if (root) {
          root.innerHTML = '<pre style="margin:0;padding:16px;color:#b91c1c;white-space:pre-wrap;font:13px ui-monospace,monospace">' +
            text.replace(/</g, '&lt;') + '</pre>';
        }
      }
      window.addEventListener('error', function (event) {
        event.preventDefault();
        show(event.error || event.message);
      });
      if (!window.React || !window.ReactDOM) {
        show(new Error('React failed to load. Check your network and retry.'));
        return;
      }
      try {
        ${PREVIEW_HELPERS}
        ${escapeScript(uiCode)}
        ${escapeScript(appCode)}
        var Root = (typeof ${rootName} !== 'undefined') ? ${rootName} : (typeof App !== 'undefined' ? App : null);
        var rootEl = document.getElementById('root');
        if (!Root) {
          show(new Error('Preview could not find a default component.'));
          return;
        }
        ReactDOM.createRoot(rootEl).render(React.createElement(Root));
      } catch (err) {
        show(err);
      }
    })();
  </script>
</body>
</html>`
}
