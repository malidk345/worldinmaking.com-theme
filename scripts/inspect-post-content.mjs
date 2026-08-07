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

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await s
    .from('posts')
    .select('id,title,slug,content,excerpt')
    .order('created_at', { ascending: false })
    .limit(5)

if (error) {
    console.error(error)
    process.exit(1)
}

for (const p of data || []) {
    const c = p.content
    console.log('\n====', p.slug)
    console.log('typeof content', typeof c)
    if (c == null) {
        console.log('content is null')
        continue
    }
    if (typeof c === 'object') {
        console.log('object keys', Object.keys(c).slice(0, 20))
        console.log('preview', JSON.stringify(c).slice(0, 400))
        continue
    }
    const str = String(c)
    console.log('len', str.length)
    console.log('start', JSON.stringify(str.slice(0, 250)))
    console.log('looksJson', str.trim().startsWith('{') || str.trim().startsWith('['))
    console.log('looksHtml', /<[a-z][\s\S]*>/i.test(str))
    if (str.trim().startsWith('{')) {
        try {
            const j = JSON.parse(str)
            console.log('parsed keys', Object.keys(j).slice(0, 25))
            if (j.body || j.content || j.html || j.markdown || j.text) {
                console.log(
                    'body-ish',
                    typeof (j.body || j.content || j.html || j.markdown || j.text),
                    String(j.body || j.content || j.html || j.markdown || j.text).slice(0, 200)
                )
            }
        } catch (e) {
            console.log('json parse fail', e.message)
        }
    }
}

// column types
const { data: cols } = await s.rpc('').catch(() => ({ data: null }))
const one = await s.from('posts').select('*').limit(1).maybeSingle()
if (one.data) {
    console.log('\nall column keys:', Object.keys(one.data))
    for (const [k, v] of Object.entries(one.data)) {
        if (k === 'content' || k === 'body' || k === 'html' || k === 'markdown' || k === 'excerpt') {
            console.log(k, typeof v, v == null ? null : String(typeof v === 'object' ? JSON.stringify(v) : v).slice(0, 120))
        }
    }
}
