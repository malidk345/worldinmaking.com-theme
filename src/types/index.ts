import React from 'react';

export interface Comment {
  id: number;
  author: string;
  date: string;
  content: string;
  avatar: string;
  replies: Comment[];
}

// Original BlogPost interface for backwards compatibility
export interface BlogPost {
  id: number;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  content: React.ReactNode;
  headings?: string[];
  author?: string;
  authorAvatar?: string;
  wordCount?: number;
  comments: Comment[];
}

// New Post interface matching the real data structure
export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string;
  author: string;
  categories: string[];
  tags?: string[];
  featuredImage?: string;
  excerpt?: string;
  content: string; // HTML content
}

export interface Category {
  slug: string;
  name: string;
}

export interface Tag {
  slug: string;
  name: string;
}

export interface WindowInstance {
  id: string;
  type: 'home' | 'post' | 'services' | 'about' | 'contact' | 'wim' | 'login' | 'privacy' | 'terms' | 'cookies' | 'admin' | 'settings' | 'author';
  title?: string;
  data?: any;
  zIndex: number;
  initialX?: number;
  initialY?: number;
}

export type SidebarMode = 'menu' | 'search' | 'tabs' | null;

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}
