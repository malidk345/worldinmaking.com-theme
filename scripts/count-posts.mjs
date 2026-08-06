import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[line.slice(0, i).trim()] = v
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const a = await admin.from('posts').select('id', { count: 'exact', head: true })
const b = await anon.from('posts').select('id', { count: 'exact', head: true })
const sample = await admin.from('posts').select('id,title,slug').order('created_at', { ascending: false }).limit(5)
console.log(JSON.stringify({
    service_count: a.count,
    service_error: a.error?.message,
    anon_count: b.count,
    anon_error: b.error?.message,
    sample: sample.data,
}, null, 2))
