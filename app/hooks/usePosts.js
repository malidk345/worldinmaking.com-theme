"use client";

// Supabase posts hook - Clean version for Markdown content
import { supabase } from '../lib/supabase';
import { stripMarkdown } from '../lib/markdown';
import useSWR from 'swr';
import logger from '../utils/logger';

// Helper to convert DB Post format to App format
// Content is passed through as-is for ReactMarkdown to handle
const adaptPost = (p) => {
    if (!p) return null;

    // Get raw content - ReactMarkdown will handle the rendering
    // If content is not fetched (undefined), default to empty string
    const rawContent = p.content || '';

    // Extract headings from Markdown for TOC (## syntax)
    const headings = [];
    const lines = rawContent.split('\n');
    lines.forEach(line => {
        // Match 2 or 3 hashes at the start of a line
        const match = line.match(/^\s*(#{2,3})\s+(.+)$/);

        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            headings.push({ id, text, level });
        }
    });

    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: p.category,
        description: stripMarkdown(p.excerpt || ''),
        excerpt: stripMarkdown(p.excerpt || ''),
        content: rawContent,  // Pass raw content for ReactMarkdown
        author: p.author || 'Unknown',
        authorName: p.author || 'Unknown',
        authorAvatar: p.author_avatar || undefined,
        // wordCount will be 0 if content is not fetched. This is acceptable for list views which don't display it.
        wordCount: rawContent.split(/\s+/).filter(w => w.length > 0).length,
        headings: headings,
        comments: [],
        image: p.image_url || null,
        ribbon: '#3546AB'
    };
};

const postsFetcher = async (key, { fetchContent } = {}) => {
    let query = supabase.from('posts');

    if (fetchContent) {
        query = query.select('*');
    } else {
        // Fetch only necessary columns for list view to reduce payload size
        // Note: This omits 'content', so 'wordCount' will be 0 and 'headings' will be empty.
        // This is an intentional optimization for list views.
        query = query.select('id, slug, title, created_at, category, excerpt, author, author_avatar, image_url, published');
    }

    const { data, error } = await query
        .eq('published', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(adaptPost).filter(Boolean);
};

export const usePosts = ({ fetchContent = false } = {}) => {
    const { data, error, isLoading, mutate } = useSWR(
        ['posts', { fetchContent }],
        ([key, options]) => postsFetcher(key, options),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    return {
        posts: data || [],
        loading: isLoading,
        error: error?.message || null,
        refetch: mutate
    };
};

export const getPostBySlug = async (slug) => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .eq('published', true)
            .single();

        if (error) {
            logger.error('[getPostBySlug] Error:', error);
            return null;
        }

        return adaptPost(data);
    } catch (e) {
        logger.error('[getPostBySlug] Exception:', e);
        return null;
    }
};

export const getPostById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            logger.error('[getPostById] Error:', error);
            return null;
        }

        return adaptPost(data);
    } catch (e) {
        logger.error('[getPostById] Exception:', e);
        return null;
    }
};
