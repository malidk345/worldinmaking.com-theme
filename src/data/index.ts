import { Post, Category, Tag } from '../types';
import postsData from './posts.json';
import categoriesData from './categories.json';
import tagsData from './tags.json';

// Export typed data
export const posts: Post[] = postsData as Post[];
export const categories: Category[] = categoriesData as Category[];
export const tags: Tag[] = tagsData as Tag[];

// Helper functions
export function getPostBySlug(slug: string): Post | undefined {
    return posts.find(post => post.slug === slug);
}

export function getPostById(id: string): Post | undefined {
    return posts.find(post => post.id === id);
}

export function getPostsByCategory(categorySlug: string): Post[] {
    return posts.filter(post => (post.categories || []).includes(categorySlug));
}

export function getPostsByTag(tagSlug: string): Post[] {
    return posts.filter(post => (post.tags || []).includes(tagSlug));
}

export function getPostsByAuthor(author: string): Post[] {
    return posts.filter(post => (post.author || '').toLowerCase() === author.toLowerCase());
}

export function searchPosts(query: string): Post[] {
    const lowercaseQuery = query.toLowerCase();
    return posts.filter(post =>
        (post.title || '').toLowerCase().includes(lowercaseQuery) ||
        (post.content || '').toLowerCase().includes(lowercaseQuery) ||
        (post.author || '').toLowerCase().includes(lowercaseQuery)
    );
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
}

export function getExcerptFromContent(content: string | undefined | null, maxLength: number = 200): string {
    if (!content) return '';
    // Strip HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength).trim() + '...';
}

// Get all unique authors
export function getAllAuthors(): string[] {
    const authorSet = new Set(posts.map(post => post.author));
    return Array.from(authorSet);
}

// Get posts sorted by date (newest first)
export function getLatestPosts(limit?: number): Post[] {
    const sorted = [...posts].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
}

// Get featured posts (posts in 'featured' category)
export function getFeaturedPosts(): Post[] {
    return posts.filter(post => post.categories.includes('featured'));
}
