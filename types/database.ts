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
    paper_status?: string;
    contributions?: PaperBotContribution[];
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
    paper_status?: 'unfinished' | 'researching' | 'drafting' | 'peer_review' | 'published';
    contributions?: PaperBotContribution[];
}

export interface PaperBotContribution {
    id: string;
    post_id: string;
    bot_username: string;
    bot_avatar?: string;
    action_type: 'init' | 'research' | 'argument' | 'critique' | 'synthesis' | 'publish';
    title: string;
    content: string;
    created_at: string;
}
