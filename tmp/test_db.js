const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseAnonKey = line.split('=')[1].trim();
        }
    }
} catch (e) {
    console.error('Failed to read .env.local:', e);
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials not found. url:', supabaseUrl, 'key:', supabaseAnonKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Connecting to:', supabaseUrl);

    // Check total posts count
    const { data: totalData, error: totalError } = await supabase
        .from('posts')
        .select('id, title, slug, published, is_approved');

    if (totalError) {
        console.error('Error fetching posts:', totalError);
        return;
    }

    console.log('Total posts in database:', totalData.length);
    console.log('Posts details:', totalData);
}

test();
