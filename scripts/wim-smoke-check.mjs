/**
 * Quick WIM Supabase smoke: signup → profile → post → reply → bookmark → notebook → cleanup
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[line.slice(0, i).trim()] = v
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !serviceKey || !anonKey) {
    console.error('Missing Supabase env')
    process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const stamp = Date.now()
const email = `resume_${stamp}@example.com`
const password = 'ResumeTest1!ok'

const anon = createClient(url, anonKey)
const su = await anon.auth.signUp({
    email,
    password,
    options: { data: { username: `resume_${stamp}`, first_name: 'Resume' } },
})
if (su.error || !su.data.user || !su.data.session) {
    console.error('signup fail', su.error?.message)
    process.exit(1)
}
const uid = su.data.user.id
const client = createClient(url, anonKey)
await client.auth.setSession({
    access_token: su.data.session.access_token,
    refresh_token: su.data.session.refresh_token,
})

const post = await client
    .from('community_posts')
    .insert({
        channel_id: 1,
        author_id: uid,
        title: 'Resume path post',
        content: 'body',
        post_slug: `resume-${stamp}`,
    })
    .select('id')
    .single()

const reply = await client
    .from('community_replies')
    .insert({ post_id: post.data?.id, author_id: uid, content: 'reply' })
    .select('id')
    .single()

const bm = await client
    .from('user_saved_posts')
    .insert({ user_id: uid, post_id: '/r', post_slug: '/r', post_title: 'R' })
    .select('id')
    .single()

const like = await client.from('post_likes').insert({ user_id: uid, post_id: '/r' }).select('id').maybeSingle()

const nb = await client
    .from('wim_notebooks')
    .upsert({
        id: `resume_nb_${stamp}`,
        short_id: `rb${String(stamp).slice(-6)}`,
        title: 'N',
        content: '# n',
        owner_key: uid,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

const prof = await client.from('profiles').select('username,id').eq('id', uid).single()

const out = {
    signup: !!su.data.session,
    profile: !!prof.data && !prof.error,
    post: !!post.data && !post.error,
    reply: !!reply.data && !reply.error,
    bookmark: !!bm.data && !bm.error,
    like: !like.error,
    notebook: !!nb.data && !nb.error,
    errors: [post.error, reply.error, bm.error, like.error, nb.error, prof.error]
        .filter(Boolean)
        .map((e) => e.message),
}
console.log(JSON.stringify(out, null, 2))

if (post.data) await admin.from('community_posts').delete().eq('id', post.data.id)
await admin.from('user_saved_posts').delete().eq('user_id', uid)
await admin.from('post_likes').delete().eq('user_id', uid)
await admin.from('wim_notebooks').delete().eq('id', `resume_nb_${stamp}`)
await admin.auth.admin.deleteUser(uid)

const ok = out.signup && out.profile && out.post && out.reply && out.bookmark && out.notebook
process.exit(ok ? 0 : 1)
