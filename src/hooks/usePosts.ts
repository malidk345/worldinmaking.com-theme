import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BlogPost } from '../types';
import { BLOG_POSTS } from '../data/posts';

// Helper to process content: Extract headings AND inject IDs for TOC
const processContent = (html: string) => {
    const headings: string[] = [];
    // Regex to find h2 and h3 tags
    const processedHtml = html.replace(/<(h[2-3])([^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, text) => {
        // Clean text for slug (remove inner HTML tags if any)
        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        const id = cleanText
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens

        headings.push(cleanText);
        // Inject ID into the tag
        return `<${tag} id="${id}"${attrs}>${text}</${tag}>`;
    });
    return { headings, content: processedHtml };
};

// Helper to convert DB Post format to App format
const adaptPost = (p: any): BlogPost => {
    const { headings, content } = processContent(p.content || '');

    return {
        id: p.id,
        title: p.title,
        date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: p.category,
        excerpt: p.excerpt || '',
        content: content,
        author: p.author,
        authorAvatar: p.author_avatar,
        wordCount: content.split(' ').length,
        headings: headings,
        comments: []
    };
};

export const usePosts = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                // Check if connection works
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('published', true)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching posts:', error);
                    // Fallback to static data on error
                    setPosts(BLOG_POSTS);
                } else if (data && data.length > 0) {
                    setPosts(data.map(adaptPost));
                } else {
                    // Fallback to static data if DB is empty
                    setPosts(BLOG_POSTS);
                }
            } catch (e) {
                console.error('Failed to fetch posts:', e);
                setPosts(BLOG_POSTS);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return { posts, loading };
};
