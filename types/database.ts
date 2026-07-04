export interface Profile {
    username: string;
    avatar_url: string;
    cover_url?: string;
    role: string;
    bio?: string;
    website?: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    pronouns?: string;
    location?: string;
    preferred_language?: string;
}

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
    translations?: Record<string, { title: string, content: string, excerpt?: string, slug?: string }>;
    language?: string;
    originalLanguage?: string;
    is_approved: boolean;
    authors?: { name: string, avatar: string, username?: string }[];
    tags?: string[];
    views?: number;
}

export interface DBPost {
    id: string;
    slug: string;
    title: string;
    created_at?: string;
    category?: string;
    excerpt?: string;
    description?: string;
    content?: string;
    author?: string;
    author_avatar?: string;
    image_url?: string;
    image?: string;
    ribbon?: string;
    translations?: Record<string, { title: string, content: string, excerpt?: string, slug?: string }>;
    language?: string;
    originalLanguage?: string;
    is_approved?: boolean;
    view_count?: number;
}
