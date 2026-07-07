import { supabaseAdmin } from '../lib/supabase-admin';

async function checkDb() {
    console.log('--- Checking Latest Forum Activity ---');
    
    // Check Community Posts
    const { data: posts, error: postsError } = await supabaseAdmin
        .from('community_posts')
        .select('id, title, content, author_id, created_at, profiles:author_id(username)')
        .is('post_slug', null)
        .order('created_at', { ascending: false });
        
    if (postsError) {
        console.error('Error fetching community_posts:', postsError.message);
    } else {
        console.log(`\nTotal General Topics: ${posts?.length}`);
        posts?.forEach(p => {
            console.log(`\n[Topic ID: ${p.id}] "${p.title}" by ${p.profiles?.username || 'anonymous'}`);
            console.log(`Created: ${p.created_at}`);
            console.log(`Content excerpt: ${p.content?.slice(0, 100)}...`);
        });
    }
    
    // Check Community Replies
    const { data: replies, error: repliesError } = await supabaseAdmin
        .from('community_replies')
        .select('id, post_id, content, author_id, created_at, profiles:author_id(username)')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (repliesError) {
        console.error('Error fetching community_replies:', repliesError.message);
    } else {
        console.log(`\n\nLatest 5 Replies in Database:`);
        replies?.forEach(r => {
            console.log(`- Reply ID: ${r.id} on Topic ID: ${r.post_id} by ${r.profiles?.username || 'anonymous'}`);
            console.log(`  Content: ${r.content}`);
            console.log(`  Date: ${r.created_at}`);
        });
    }
}

checkDb();
