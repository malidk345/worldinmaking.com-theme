export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

// GET: Fetch chapters for a specific book
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');

        if (!bookId) {
            return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
        }

        const { data: chapters, error } = await supabaseAdmin
            .from('book_chapters')
            .select('*')
            .eq('book_id', bookId)
            .order('chapter_number', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ chapters });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST: Add a new chapter to a book (Admin only)
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

        // Verify admin permissions
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
        }

        const body = await request.json();
        const { bookId, chapterNumber, title, content } = body;

        if (!bookId || chapterNumber === undefined || !title || !content) {
            return NextResponse.json({ error: 'bookId, chapterNumber, title, and content are required' }, { status: 400 });
        }

        // Fetch book info for the forum post template
        const { data: book, error: bookError } = await supabaseAdmin
            .from('books')
            .select('title, author')
            .eq('id', bookId)
            .single();

        if (bookError || !book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // 1. Ensure the "Book Club" forum channel exists
        let channelId = 1;
        const { data: channel } = await supabaseAdmin
            .from('community_channels')
            .select('id')
            .eq('slug', 'book-club')
            .maybeSingle();

        if (channel) {
            channelId = channel.id;
        } else {
            const { data: newChannel, error: channelCreateError } = await supabaseAdmin
                .from('community_channels')
                .insert({
                    name: 'Book Club',
                    slug: 'book-club',
                    description: 'Discuss chapters and literature read inside the Books application.'
                })
                .select('id')
                .single();
            if (newChannel) {
                channelId = newChannel.id;
            }
        }

        // 2. Create the forum topic thread in community_posts
        const postTitle = `discussion: ${book.title} — chapter ${chapterNumber}: ${title}`;
        const postContent = `<p>Discussing Chapter ${chapterNumber}: <strong>${title}</strong> from the book <em>${book.title}</em> by <em>${book.author}</em>.</p><p>Read the chapter text inside the Books app and share your notes and thoughts here!</p>`;
        const postSlug = `book-debate-${bookId}-${chapterNumber}-${Date.now().toString(36)}`;

        const { data: forumPost, error: forumError } = await supabaseAdmin
            .from('community_posts')
            .insert({
                channel_id: channelId,
                author_id: user.id,
                title: postTitle,
                content: postContent,
                post_slug: postSlug
            })
            .select('id')
            .single();

        if (forumError || !forumPost) {
            return NextResponse.json({ error: `Failed to create forum thread: ${forumError?.message}` }, { status: 500 });
        }

        // 3. Insert the book chapter linked to the forum thread
        const { data: chapter, error: insertError } = await supabaseAdmin
            .from('book_chapters')
            .insert({
                book_id: bookId,
                chapter_number: chapterNumber,
                title,
                content,
                forum_post_id: forumPost.id
            })
            .select('*')
            .single();

        if (insertError) {
            // Roll back the forum post if chapter insertion fails
            await supabaseAdmin.from('community_posts').delete().eq('id', forumPost.id);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ chapter });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
