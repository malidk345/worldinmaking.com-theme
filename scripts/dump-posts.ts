import { supabaseAdmin } from '../lib/supabase-admin';

async function dump() {
    console.log('--- Dumping All Community Posts ---');
    const { data, error } = await supabaseAdmin
        .from('community_posts')
        .select('id, title, author_id, post_slug, profiles:author_id(username)')
        .order('id', { ascending: false });
        
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Total topics: ${data?.length}`);
        data?.forEach(p => {
            console.log(`- ID: ${p.id} | Slug: ${p.post_slug} | Title: "${p.title}" | Author: ${p.profiles?.username || 'unknown'}`);
        });
    }
}

dump();
