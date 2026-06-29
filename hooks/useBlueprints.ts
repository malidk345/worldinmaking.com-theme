import { supabase } from '../lib/supabase';

export interface BlueprintCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    order_index: number;
}

export interface BlueprintLecture {
    id: string;
    category_id: string;
    name: string;
    slug: string;
    description?: string;
    order_index: number;
}

export interface BlueprintPost {
    id: string;
    lecture_id: string;
    title: string;
    slug: string;
    content_html?: string;
    content_markdown?: string;
    custom_css?: string;
    is_published: boolean;
    order_index: number;
}

export const useBlueprints = () => {
    const fetchHierarchy = async () => {
        const { data: categories } = await supabase
            .from('blueprint_categories')
            .select(`
                *,
                lectures:blueprint_lectures (
                    *,
                    posts:blueprint_posts (*)
                )
            `)
            .order('order_index', { ascending: true });
        
        return categories;
    };

    const getPostBySlug = async (slug: string) => {
        const { data } = await supabase
            .from('blueprint_posts')
            .select(`
                *,
                lecture:blueprint_lectures (
                    *,
                    category:blueprint_categories (*)
                )
            `)
            .eq('slug', slug)
            .single();
        return data;
    };

    return { fetchHierarchy, getPostBySlug };
};
