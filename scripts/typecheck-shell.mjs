#!/usr/bin/env node
/**
 * Path-filtered TypeScript check for the WIM "core shell" allowlist.
 *
 * Full-repo `tsc` is too noisy (legacy PostHog surface). This script:
 *  1. Runs `tsc -p tsconfig.shell.json --noEmit --pretty false`
 *  2. Keeps only diagnostics whose file path is under the shell allowlist
 *  3. Exits 1 if any *non-quarantined* allowlisted diagnostic remains (CI gate)
 *
 * Quarantine: large legacy shell files still carry historical type debt
 * (especially App.tsx / AppWindow). They stay *in* the shell program so we
 * still print their errors, but they do not fail CI until cleared.
 *
 * Usage:
 *   pnpm typecheck:shell
 *   SHELL_TSC_VERBOSE=1 pnpm typecheck:shell
 *   SHELL_TSC_STRICT=1 pnpm typecheck:shell   # fail on quarantine too
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/** Paths relative to repo root (POSIX). Matched against tsc diagnostic files. */
const ALLOWLIST_PREFIXES = [
    'src/context/',
    'src/components/AppWindow/',
    'src/components/Wrapper/',
    'src/components/Desktop/',
    'src/components/Auth/',
    'src/components/AppContainer/',
    'src/pages/api/',
    'src/lib/wim-auth.ts',
    'src/lib/bots/',
]

/**
 * Known debt — reported with [quarantine] but do not fail the gate unless
 * SHELL_TSC_STRICT=1. Cleared in TSK-11 (App.tsx / AppWindow typed).
 * Keep empty unless a temporary regression needs parking.
 */
const QUARANTINE_PREFIXES = []

const TSCONFIG = path.join(root, 'tsconfig.shell.json')

function normalizePath(p) {
    return p.replace(/\\/g, '/')
}

function toSrcRelative(filePath) {
    const n = normalizePath(filePath)
    const idx = n.indexOf('src/')
    if (idx >= 0) return n.slice(idx)
    return n
}

function matchesPrefixList(filePath, prefixes) {
    const rel = toSrcRelative(filePath)
    return prefixes.some((prefix) => {
        if (prefix.endsWith('.ts') || prefix.endsWith('.tsx')) {
            return rel === prefix || rel.endsWith('/' + prefix)
        }
        return rel.startsWith(prefix)
    })
}

function isAllowlisted(filePath) {
    return matchesPrefixList(filePath, ALLOWLIST_PREFIXES)
}

function isQuarantined(filePath) {
    return matchesPrefixList(filePath, QUARANTINE_PREFIXES)
}

/**
 * Parse `file(line,col): error TSxxxx: message` lines from tsc.
 */
function parseTscLines(stdout) {
    const lines = stdout.split(/\r?\n/).filter(Boolean)
    const diagnostics = []
    for (const line of lines) {
        const m = line.match(/^(.*?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s*(.*)$/)
        if (m) {
            diagnostics.push({
                file: m[1],
                line: Number(m[2]),
                col: Number(m[3]),
                severity: m[4],
                code: m[5],
                message: m[6],
                raw: line,
            })
        }
    }
    return diagnostics
}

function main() {
    if (!fs.existsSync(TSCONFIG)) {
        console.error(`[typecheck-shell] Missing ${TSCONFIG}`)
        process.exit(2)
    }

    const tscJs = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js')
    if (!fs.existsSync(tscJs)) {
        console.error('[typecheck-shell] typescript not found. Run pnpm install.')
        process.exit(2)
    }

    const strict = process.env.SHELL_TSC_STRICT === '1'
    const verbose = process.env.SHELL_TSC_VERBOSE === '1'

    console.log('[typecheck-shell] Running tsc -p tsconfig.shell.json …')
    const result = spawnSync(process.execPath, [tscJs, '-p', TSCONFIG, '--noEmit', '--pretty', 'false'], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        env: process.env,
    })

    const combined = `${result.stdout || ''}${result.stderr || ''}`
    const diagnostics = parseTscLines(combined)

    const shellErrors = diagnostics.filter((d) => d.severity === 'error' && isAllowlisted(d.file))
    const gatedErrors = shellErrors.filter((d) => strict || !isQuarantined(d.file))
    const quarantineErrors = shellErrors.filter((d) => isQuarantined(d.file))
    const otherErrors = diagnostics.filter((d) => d.severity === 'error' && !isAllowlisted(d.file))

    console.log('[typecheck-shell] Allowlist:')
    for (const p of ALLOWLIST_PREFIXES) console.log(`  - ${p}`)
    console.log('[typecheck-shell] Quarantine (warn only' + (strict ? ' — DISABLED by SHELL_TSC_STRICT' : '') + '):')
    for (const p of QUARANTINE_PREFIXES) console.log(`  - ${p}`)
    console.log(`[typecheck-shell] Shell errors: ${shellErrors.length} (gated: ${gatedErrors.length}, quarantine: ${quarantineErrors.length})`)
    if (verbose || otherErrors.length) {
        console.log(`[typecheck-shell] Non-allowlist errors (ignored): ${otherErrors.length}`)
    }

    if (quarantineErrors.length > 0) {
        // Use stdout (not stderr) so shells that treat any stderr as failure still get exit 0.
        console.log(`\n[typecheck-shell] Quarantine debt (${quarantineErrors.length}) — not failing CI:\n`)
        for (const d of quarantineErrors.slice(0, 40)) {
            console.log(`  [quarantine] ${d.raw}`)
        }
        if (quarantineErrors.length > 40) {
            console.log(`  … and ${quarantineErrors.length - 40} more`)
        }
    }

    if (gatedErrors.length > 0) {
        console.error('\n[typecheck-shell] FAIL — errors in gated shell allowlist:\n')
        for (const d of gatedErrors) {
            console.error(d.raw)
        }
        console.error(
            `\n[typecheck-shell] ${gatedErrors.length} gated error(s). Fix these or temporarily expand quarantine (prefer fix).`
        )
        process.exit(1)
    }

    console.log('\n[typecheck-shell] PASS — zero gated errors in core shell allowlist.')
    if (quarantineErrors.length > 0) {
        console.log(
            `[typecheck-shell] Tip: clear quarantine with SHELL_TSC_STRICT=1 once App.tsx / AppWindow are clean.`
        )
    }
    process.exit(0)
}

main()
