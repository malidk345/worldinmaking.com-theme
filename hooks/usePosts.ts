"use client";
import React from 'react';

import { supabase } from '../lib/supabase';
import { stripMarkdown } from '../lib/markdown';
import useSWR from 'swr';
import logger from '../utils/logger';
import { Post, DBPost } from '../types/database';
import { parsePaperMeta } from '../lib/wimbot-orchestrator';

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

const adaptPost = (p: DBPost): Post | null => {
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
    const htmlHeadings = Array.from(rawContent.matchAll(/<h([234])[^>]*>(.*?)<\/h[234]>/gi)) as RegExpMatchArray[];
    htmlHeadings.forEach(match => {
        const level = parseInt(match[1]);
        const text = match[2].replace(/<[^>]*>/g, '').trim();
        if (text) {
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
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

    const rawTranslations = p.translations || {}
    const adaptedTranslations: Record<string, { title: string; content: string; excerpt?: string; slug?: string }> = {}
    
    Object.keys(rawTranslations).forEach((langKey) => {
        const transObj = rawTranslations[langKey]
        if (transObj) {
            adaptedTranslations[langKey] = {
                ...transObj,
                title: transObj.title || '',
                content: transObj.content || '',
                slug: transObj.slug,
                excerpt: stripMarkdown(transObj.excerpt || '') || generateExcerptFromContent(transObj.content || '')
            }
        }
    })

    const paperMeta = parsePaperMeta(p.excerpt || p.inner_thoughts)
    const cleanExcerpt = paperMeta?.directive || stripMarkdown(p.excerpt || p.description || '') || generateExcerptFromContent(rawContent)

    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        date: (() => {
            try {
                const d = new Date(p.created_at || Date.now());
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } catch {
                return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        })(),
        category: p.category || 'General',
        description: cleanExcerpt,
        excerpt: cleanExcerpt,
        content: rawContent,
        author: p.author || 'Unknown',
        authorName: p.author || 'Unknown',
        authorAvatar: p.author_avatar || undefined,
        wordCount: rawContent.split(/\s+/).filter((w) => w.length > 0).length,
        headings: sortedHeadings,
        image: p.image_url || p.image || null,
        ribbon: p.ribbon || '#3546AB',
        translations: adaptedTranslations,
        language: p.language || 'en',
        originalLanguage: p.originalLanguage,
        is_approved: Boolean(p.is_approved),
        authors: [{ name: p.author || 'Unknown', avatar: p.author_avatar || '', username: p.author || 'Unknown' }],
        views: p.view_count || 0,
        paper_status: p.paper_status || paperMeta?.paper_status,
        contributions: p.contributions || paperMeta?.contributions
    };
};

const postsFetcher = async () => {
    let dbData: DBPost[] = [];
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('published', true)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('[postsFetcher] Supabase error:', error);
        } else {
            dbData = (data as unknown as DBPost[]) || [];
        }
    } catch (e) {
        logger.error('[postsFetcher] Supabase connection failed:', e);
    }

    const adaptedDbPosts = dbData.map(adaptPost).filter(Boolean) as Post[];

    // Final sort by date
    // ⚡ Bolt: Use Schwartzian transform to prevent O(N log N) Date parsing during sort.
    const mappedPosts = adaptedDbPosts.map(post => ({
        post,
        time: new Date(post.date).getTime()
    }));
    return mappedPosts.sort((a, b) => b.time - a.time).map(m => m.post);
};

export const usePosts = () => {
    const { data, error, isLoading, mutate } = useSWR<Post[]>('posts', postsFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    const posts = React.useMemo(() => data || [], [data]);

    return {
        posts,
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
            .eq('published', true)
            .or(`slug.eq.${slug},translations->en->>slug.eq.${slug},translations->tr->>slug.eq.${slug},translations->de->>slug.eq.${slug},translations->es->>slug.eq.${slug}`)
            .single();

        if (error) {
            logger.error('[getPostBySlug] Error:', error);
            return null;
        }

        let postData = data as unknown as DBPost;
        if (postData && postData.slug !== slug && postData.translations) {
            for (const lang of Object.keys(postData.translations)) {
                if (postData.translations[lang]?.slug === slug) {
                    postData = {
                        ...postData,
                        title: postData.translations[lang].title || postData.title,
                        content: postData.translations[lang].content || postData.content,
                        excerpt: postData.translations[lang].excerpt || postData.excerpt,
                        language: lang,
                        originalLanguage: postData.language,
                    };
                    break;
                }
            }
        }

        return adaptPost(postData);
    } catch (e) {
        logger.error('[getPostBySlug] Exception:', e);
        return null;
    }
};

