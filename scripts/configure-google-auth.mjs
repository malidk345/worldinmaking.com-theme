/**
 * Enable Google login on the WIM Supabase project.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *   $env:GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"
 *   $env:GOOGLE_OAUTH_CLIENT_SECRET="..."
 *   node scripts/configure-google-auth.mjs
 *
 * Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client:
 *   Authorized JavaScript origins:
 *     http://localhost:3000
 *     https://worldinmaking.com
 *   Authorized redirect URIs:
 *     https://iydypisgfaksqkjdraiu.supabase.co/auth/v1/callback
 */
import { readFileSync } from 'fs'

function loadEnv() {
    try {
        const raw = readFileSync('.env.local', 'utf8')
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^([^#=]+)=(.*)$/)
            if (!m) continue
            const key = m[1].trim()
            if (process.env[key]) continue
            process.env[key] = m[2].trim().replace(/^["']|["']$/g, '')
        }
    } catch {
        /* optional */
    }
}

loadEnv()

const token = process.env.SUPABASE_ACCESS_TOKEN || ''
const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || ''
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ref = process.env.SUPABASE_PROJECT_REF || (url.match(/https:\/\/([^.]+)/) || [])[1] || ''

if (!token || !clientId || !clientSecret || !ref) {
    console.error('Need SUPABASE_ACCESS_TOKEN, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET')
    process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    body: JSON.stringify({
        external_google_enabled: true,
        external_google_client_id: clientId,
        external_google_secret: clientSecret,
    }),
})

const data = await res.json()
if (!res.ok) {
    console.error(res.status, data)
    process.exit(1)
}

console.log(
    JSON.stringify(
        {
            ok: true,
            google_enabled: data.external_google_enabled,
            google_client_id: data.external_google_client_id,
            google_secret_set: Boolean(data.external_google_secret),
        },
        null,
        2
    )
)
