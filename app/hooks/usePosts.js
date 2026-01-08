// Supabase posts hook - Clean version for Markdown content
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Helper to convert DB Post format to App format
// Content is passed through as-is for ReactMarkdown to handle
const adaptPost = (p) => {
    // Get raw content - ReactMarkdown will handle the rendering
    const rawContent = p.content || '';

    // Extract headings from Markdown for TOC (## syntax)
    const headings = [];
    const lines = rawContent.split('\n');
    lines.forEach(line => {
        const h2Match = line.match(/^## (.+)$/);
        const h3Match = line.match(/^### (.+)$/);

        if (h2Match) {
            const text = h2Match[1].trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            headings.push({ id, text, level: 2 });
        } else if (h3Match) {
            const text = h3Match[1].trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            headings.push({ id, text, level: 3 });
        }
    });

    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: p.category,
        description: p.excerpt || '',
        excerpt: p.excerpt || '',
        content: rawContent,  // Pass raw content for ReactMarkdown
        author: p.author || 'Unknown',
        authorName: p.author || 'Unknown',
        authorAvatar: p.author_avatar || undefined,
        wordCount: rawContent.split(/\s+/).filter(w => w.length > 0).length,
        headings: headings,
        comments: [],
        image: p.image_url || null,
        ribbon: '#3546AB'
    };
};

export const usePosts = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('published', true)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching posts:', error);
                } else if (data) {
                    setPosts(data.map(adaptPost));
                }
            } catch (e) {
                console.error('Failed to fetch posts:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return { posts, loading };
};

export const getPostBySlug = async (slug) => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

    if (error || !data) return null;
    return adaptPost(data);
};

export const getPostById = async (id) => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return adaptPost(data);
};
