"use client";

import { supabase } from '../lib/supabase';
import { stripMarkdown, getExcerpt } from '../lib/markdown';
import useSWR from 'swr';
import logger from '../utils/logger';

export interface Post {
    id: string;
    slug: string;
    title: string;
    date: string;
    category: string;
    description: string;
    excerpt: string;
    content: string;
    author: string;
    authorName: string;
    authorAvatar?: string;
    wordCount: number;
    headings: { id: string, text: string, level: number }[];
    image: string | null;
    ribbon?: string;
    translations?: Record<string, { title: string, content: string, excerpt?: string }>;
    language?: string;
}



/** Generate a clean plain-text excerpt from content (handles both HTML and Markdown) */
const generateExcerptFromContent = (content: string, wordLimit = 50): string => {
    if (!content) return '';
    // First strip HTML tags
    let text = content.replace(/<[^>]*>/g, ' ');
    // Then strip markdown
    text = stripMarkdown(text);
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    // Take first N words
    const words = text.split(' ').filter(w => w.length > 0);
    const excerpt = words.slice(0, wordLimit).join(' ');
    return excerpt + (words.length > wordLimit ? '...' : '');
};

const adaptPost = (p: any): Post | null => {
    if (!p) return null;

    const rawContent = p.content || '';

    const headings: { id: string, text: string, level: number }[] = [];

    // Parse Markdown headings: ##, ###, ####
    const mdHeadings = Array.from(rawContent.matchAll(/^\s*(#{2,4})\s+(.+)$/gm)) as RegExpMatchArray[];
    mdHeadings.forEach(match => {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        headings.push({ id, text, level });
    });

    // Parse HTML headings: <h2>, <h3>, <h4>
    // We search the whole content because HTML can span multiple lines sometimes
    const htmlHeadings = Array.from(rawContent.matchAll(/<h([234])[^>]*>(.*?)<\/h[234]>/gi)) as RegExpMatchArray[];
    htmlHeadings.forEach(match => {
        const level = parseInt(match[1]);
        const text = match[2].replace(/<[^>]*>/g, '').trim();
        if (text) {
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            // Prevent duplicates if already found via MD (unlikely but safe)
            if (!headings.some(h => h.id === id)) {
                headings.push({ id, text, level });
            }
        }
    });

    // Sort headings by their appearance in the content
    const sortedHeadings = headings.sort((a, b) => {
        const indexA = rawContent.indexOf(a.text);
        const indexB = rawContent.indexOf(b.text);
        return indexA - indexB;
    });

    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: p.category || 'General',
        description: stripMarkdown(p.excerpt || p.description || '') || generateExcerptFromContent(rawContent),
        excerpt: stripMarkdown(p.excerpt || p.description || '') || generateExcerptFromContent(rawContent),
        content: rawContent,
        author: p.author || 'Unknown',
        authorName: p.author || 'Unknown',
        authorAvatar: p.author_avatar || undefined,
        wordCount: rawContent.split(/\s+/).filter((w: string) => w.length > 0).length,
        headings: sortedHeadings,
        image: p.image_url || p.image || null,
        ribbon: p.ribbon || '#3546AB',
        translations: p.translations || {},
        language: p.language || 'en'
    };
};

const postsFetcher = async () => {
    let dbData: any[] = [];
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('[postsFetcher] Supabase error:', error);
        } else {
            dbData = data || [];
        }
    } catch (e) {
        logger.error('[postsFetcher] Supabase connection failed:', e);
    }

    const adaptedDbPosts = dbData.map(adaptPost).filter(Boolean) as Post[];

    // Final sort by date
    return adaptedDbPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const usePosts = () => {
    const { data, error, isLoading, mutate } = useSWR('posts', postsFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    return {
        posts: data || [],
        loading: isLoading,
        error: error?.message || null,
        refetch: mutate
    };
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
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

export const getPostById = async (id: string): Promise<Post | null> => {
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
