/**
 * Env loading + validation for WorldInMaking.
 * - Load `.env.local` into process.env when missing (Node only).
 * - Warn during build / local if public Supabase keys are missing.
 * - Fail hard at production *runtime* when required server secrets are absent.
 */

function loadEnv() {
    if (typeof window !== 'undefined') return
    try {
        // Avoid bundlers rewriting require in edge/browser builds
        const req = eval('require')
        const fs = req('fs')
        const path = req('path')
        const envPath = path.resolve(process.cwd(), '.env.local')
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8')
            envContent.split('\n').forEach((line: string) => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
                if (match) {
                    const key = match[1]
                    let value = match[2] || ''
                    if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
                        value = value.split('#')[0].trim()
                    }
                    value = value.trim()
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
                    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
                    if (process.env[key] === undefined) process.env[key] = value
                }
            })
        }
    } catch {
        // browser / edge without fs
    }
}

/** True when we are in a real production server runtime (not static page generation alone). */
function isProductionRuntime(): boolean {
    if (typeof window !== 'undefined') return false
    if (process.env.NODE_ENV !== 'production') return false
    // Next.js sets NEXT_PHASE during build; skip hard-fail while collecting page data.
    if (process.env.NEXT_PHASE === 'phase-production-build') return false
    if (process.env.WIM_SKIP_ENV_HARD_FAIL === '1') return false
    return true
}

const PUBLIC_REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const

/** Server-only keys required for WIM community / notebooks / bots in production. */
const SERVER_REQUIRED_PROD = ['SUPABASE_SERVICE_ROLE_KEY'] as const

export function validateEnv() {
    loadEnv()

    const missingPublic = PUBLIC_REQUIRED.filter((key) => !process.env[key])
    if (missingPublic.length > 0) {
        const msg = `[WIM env] Missing required public env: ${missingPublic.join(', ')}`
        if (isProductionRuntime()) {
            console.error(msg)
            throw new Error(msg)
        }
        if (typeof window === 'undefined') {
            console.warn(`[WARNING] ${msg}`)
        }
    }

    if (isProductionRuntime()) {
        const missingServer = SERVER_REQUIRED_PROD.filter((key) => !process.env[key])
        if (missingServer.length > 0) {
            const msg = `[WIM env] Missing required production secrets: ${missingServer.join(
                ', '
            )}. Set them in the host env or disable with WIM_SKIP_ENV_HARD_FAIL=1 (not recommended).`
            console.error(msg)
            throw new Error(msg)
        }
    }
}
