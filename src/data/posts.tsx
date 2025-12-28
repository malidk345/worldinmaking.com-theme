// Data helpers for posts (keep as plain data, no client-only React elements)
import { BlogPost, Post } from '../types';
import { posts, formatDate, getExcerptFromContent } from './index';

// Note: content is stored as raw HTML string. Rendering components
// should use `dangerouslySetInnerHTML={{ __html: content }}` where needed.

// Extract headings from HTML content
function extractHeadings(html: string): string[] {
    const headingRegex = /<h[2-3][^>]*>([^<]+)<\/h[2-3]>/gi;
    const matches = [...html.matchAll(headingRegex)];
    return matches.map(match => {
        // Strip any inner tags and decode HTML entities
        return match[1].replace(/<[^>]*>/g, '').trim();
    });
}

// Count words in HTML content
function countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.split(' ').filter(word => word.length > 0).length;
}

// Generate a gravatar-style avatar URL based on author name
function generateAuthorAvatar(_author: string): string {
    // Return empty string to force initials fallback
    return '';
}

// Convert Post (new format) to BlogPost (old format for compatibility)
export function convertPostToBlogPost(post: Post): BlogPost {
    const content = post.content || '';
    const categories = post.categories || [];
    return {
        id: parseInt(post.id) || Math.floor(Math.random() * 10000),
        title: post.title || 'Untitled',
        date: formatDate(post.date || new Date().toISOString()),
        category: categories[0] || 'uncategorized',
        excerpt: post.excerpt || getExcerptFromContent(content, 250),
        content: content,
        headings: extractHeadings(content),
        author: post.author || 'anonymous',
        authorAvatar: generateAuthorAvatar(post.author || 'anonymous'),
        wordCount: countWords(content),
        comments: [] // Start with empty comments for real posts
    };
}

// Get all posts as BlogPost format (for backward compatibility)
export function getAllBlogPosts(): BlogPost[] {
    return posts.map(convertPostToBlogPost);
}

// Get a specific post as BlogPost format
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
    const post = posts.find(p => p.slug === slug);
    return post ? convertPostToBlogPost(post) : undefined;
}

// Get a specific post by ID as BlogPost format
export function getBlogPostById(id: number | string): BlogPost | undefined {
    const stringId = String(id);
    const post = posts.find(p => p.id === stringId);
    return post ? convertPostToBlogPost(post) : undefined;
}

// Export the converted posts as the main BLOG_POSTS array (backward compatible)
export const BLOG_POSTS: BlogPost[] = getAllBlogPosts();

// Get featured posts as BlogPost format
export function getFeaturedBlogPosts(): BlogPost[] {
    return posts
        .filter(post => (post.categories || []).includes('featured'))
        .map(convertPostToBlogPost);
}

// Search posts and return as BlogPost format
export function searchBlogPosts(query: string): BlogPost[] {
    const lowercaseQuery = query.toLowerCase();
    return posts
        .filter(post =>
            (post.title || '').toLowerCase().includes(lowercaseQuery) ||
            (post.content || '').toLowerCase().includes(lowercaseQuery) ||
            (post.author || '').toLowerCase().includes(lowercaseQuery)
        )
        .map(convertPostToBlogPost);
}

// Get posts by category as BlogPost format
export function getBlogPostsByCategory(category: string): BlogPost[] {
    return posts
        .filter(post => (post.categories || []).includes(category.toLowerCase()))
        .map(convertPostToBlogPost);
}

// Get all unique categories from posts
export function getAllCategories(): string[] {
    const categorySet = new Set<string>();
    posts.forEach(post => {
        (post.categories || []).forEach(cat => categorySet.add(cat));
    });
    return Array.from(categorySet);
}
