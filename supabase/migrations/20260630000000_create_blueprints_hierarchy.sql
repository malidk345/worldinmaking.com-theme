-- 1. Blueprint Categories
CREATE TABLE public.blueprint_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Blueprint Lectures (belonging to Categories)
CREATE TABLE public.blueprint_lectures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.blueprint_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Blueprint Posts (the actual HTML/Markdown content)
CREATE TABLE public.blueprint_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecture_id UUID REFERENCES public.blueprint_lectures(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content_html TEXT,
    content_markdown TEXT,
    custom_css TEXT,
    is_published BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.blueprint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_posts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read for categories" ON public.blueprint_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read for lectures" ON public.blueprint_lectures FOR SELECT USING (true);
CREATE POLICY "Allow public read for posts" ON public.blueprint_posts FOR SELECT USING (true);
