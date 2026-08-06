/**
 * Apply WIM notebooks SQL migration via Supabase Management API.
 *
 * Requires a personal access token (Dashboard → Account → Access Tokens):
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/apply-notebook-migration.mjs
 *
 * Or paste SQL from supabase/migrations/20260806_wim_notebooks.sql into
 * Supabase Dashboard → SQL Editor → Run.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnvLocal() {
    const envPath = path.join(root, '.env.local')
    if (!fs.existsSync(envPath)) return
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (!m) continue
        let v = (m[2] || '').trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1)
        }
        if (process.env[m[1]] === undefined) process.env[m[1]] = v
    }
}

loadEnvLocal()

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || ''
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const projectRef =
    process.env.SUPABASE_PROJECT_REF ||
    (projectUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1] ||
    ''

const sqlPath = path.join(root, 'supabase', 'migrations', '20260806_wim_notebooks.sql')

if (!fs.existsSync(sqlPath)) {
    console.error('Migration file missing:', sqlPath)
    process.exit(1)
}

const query = fs.readFileSync(sqlPath, 'utf8')

if (!token) {
    console.log(`
No SUPABASE_ACCESS_TOKEN set.

Option A — Dashboard (simplest):
  1. Open Supabase → SQL Editor
  2. Paste contents of:
     ${sqlPath}
  3. Run

Option B — Management API:
  set SUPABASE_ACCESS_TOKEN=sbp_your_token
  node scripts/apply-notebook-migration.mjs
`)
    process.exit(2)
}

if (!projectRef) {
    console.error('Could not resolve project ref from NEXT_PUBLIC_SUPABASE_URL')
    process.exit(1)
}

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

console.log('Applying migration to project', projectRef, '...')

const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
})

const text = await res.text()
if (!res.ok) {
    console.error('Migration failed:', res.status, text)
    process.exit(1)
}

console.log('Migration applied OK.')
console.log(text.slice(0, 500))

// Force PostgREST to reload schema cache (avoids PGRST205 after DDL)
const reload = await fetch(endpoint, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: "NOTIFY pgrst, 'reload schema';" }),
})
console.log('Schema reload:', reload.status)

// Smoke-check via service role if available
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (serviceKey && projectUrl) {
    // small delay for cache
    await new Promise((r) => setTimeout(r, 500))
    const check = await fetch(`${projectUrl}/rest/v1/wim_notebooks?select=id&limit=1`, {
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
        },
    })
    console.log('REST probe wim_notebooks:', check.status, check.status === 200 ? 'OK' : await check.text())
}
