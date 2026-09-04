/**
 * Move data-URL avatars from profiles.avatar_url into the avatars storage bucket.
 * Usage: node scripts/migrate-profile-avatars.mjs
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const cwd = process.cwd()
const env = {}
for (const line of fs.readFileSync(path.join(cwd, '.env.local'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[line.slice(0, i).trim()] = v
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const { data: rows, error } = await admin
    .from('profiles')
    .select('id, avatar_url')
    .like('avatar_url', 'data:image%')
    .limit(50)

if (error) {
    console.error(error.message)
    process.exit(1)
}

let ok = 0
let fail = 0
for (const row of rows || []) {
    const match = String(row.avatar_url || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!match) continue
    const mime = match[1]
    const buf = Buffer.from(match[2], 'base64')
    if (buf.length < 32 || buf.length > 6 * 1024 * 1024) {
        fail += 1
        continue
    }
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg'
    const pathName = `${row.id}/avatar-migrated.${ext}`
    const up = await admin.storage.from('avatars').upload(pathName, buf, { contentType: mime, upsert: true })
    if (up.error) {
        console.error(row.id, up.error.message)
        fail += 1
        continue
    }
    const { data } = admin.storage.from('avatars').getPublicUrl(pathName)
    const { error: upd } = await admin.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', row.id)
    if (upd) {
        console.error(row.id, upd.message)
        fail += 1
        continue
    }
    ok += 1
    console.log('migrated', row.id)
}

console.log(JSON.stringify({ scanned: rows?.length || 0, ok, fail }))
