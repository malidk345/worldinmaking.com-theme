/**
 * Apply workspace chat SQL via Supabase Management API.
 * Same path as scripts/apply-notebook-migration.mjs.
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
const sqlPath = path.join(root, 'supabase', 'migrations', '20260813_workspace_chats.sql')
const query = fs.readFileSync(sqlPath, 'utf8')

if (!token) {
    console.error('NO_TOKEN')
    process.exit(2)
}
if (!projectRef) {
    console.error('NO_PROJECT_REF')
    process.exit(1)
}

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
console.log('Applying workspace chat migration to', projectRef)

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
    console.error('APPLY_FAIL', res.status, text.slice(0, 300))
    process.exit(1)
}
console.log('APPLY_OK', text.slice(0, 200))

const reload = await fetch(endpoint, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: "NOTIFY pgrst, 'reload schema';" }),
})
console.log('SCHEMA_RELOAD', reload.status)

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (serviceKey && projectUrl) {
    await new Promise((r) => setTimeout(r, 800))
    const check = await fetch(`${projectUrl.replace(/\/$/, '')}/rest/v1/wim_chats?select=id&limit=1`, {
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
        },
    })
    const body = await check.text()
    console.log('REST_PROBE', check.status, check.status === 200 ? 'OK' : body.slice(0, 200))
}
