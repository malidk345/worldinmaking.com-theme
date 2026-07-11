export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

// GET: Fetch list of all books
export async function GET(request: NextRequest) {
    try {
        const { data: books, error } = await supabaseAdmin
            .from('books')
            .select('*')
            .order('title', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ books });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST: Add a new book (Admin only)
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // Verify if the user is an admin
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
        }

        const body = await request.json();
        const { title, author, cover_url, summary } = body;

        if (!title || !author) {
            return NextResponse.json({ error: 'Title and author are required' }, { status: 400 });
        }

        const { data: book, error: insertError } = await supabaseAdmin
            .from('books')
            .insert({ title, author, cover_url, summary })
            .select('*')
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ book });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
