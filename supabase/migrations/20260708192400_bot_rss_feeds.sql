-- Create forum_rss_feeds table
CREATE TABLE IF NOT EXISTS public.forum_rss_feeds (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    url         TEXT UNIQUE NOT NULL,
    category    TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_rss_feeds ENABLE ROW LEVEL SECURITY;

-- Allow public read policy
DROP POLICY IF EXISTS "Allow public read for forum_rss_feeds" ON public.forum_rss_feeds;
CREATE POLICY "Allow public read for forum_rss_feeds" ON public.forum_rss_feeds 
    FOR SELECT USING (true);

-- Create processed_rss_items table
CREATE TABLE IF NOT EXISTS public.processed_rss_items (
    id           SERIAL PRIMARY KEY,
    feed_id      INT REFERENCES public.forum_rss_feeds(id) ON DELETE CASCADE,
    guid         TEXT UNIQUE NOT NULL,
    title        TEXT,
    link         TEXT,
    processed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_rss_items ENABLE ROW LEVEL SECURITY;

-- Allow public read policy
DROP POLICY IF EXISTS "Allow public read for processed_rss_items" ON public.processed_rss_items;
CREATE POLICY "Allow public read for processed_rss_items" ON public.processed_rss_items 
    FOR SELECT USING (true);

-- Seed initial RSS feeds
INSERT INTO public.forum_rss_feeds (title, url, category)
VALUES
('Aeon Magazine', 'https://aeon.co/feed.rss', 'Philosophy'),
('Stanford Encyclopedia of Philosophy', 'https://plato.stanford.edu/rss/sep.xml', 'Philosophy'),
('The Philosophical Quarterly', 'https://academic.oup.com/pq/rss', 'Philosophy'),
('Notre Dame Philosophical Reviews', 'https://ndpr.nd.edu/feed/', 'Philosophy'),
('MIT Technology Review', 'https://www.technologyreview.com/feed/', 'Tech-Politics'),
('WIRED Ideas', 'https://www.wired.com/feed/category/ideas/rss', 'Tech-Politics'),
('Rest of World', 'https://restofworld.org/feed/', 'Tech-Politics'),
('New Left Review', 'https://newleftreview.org/feed', 'Post-Capitalism'),
('Verso Books Blog', 'https://www.versobooks.com/en-gb/blogs/news.atom', 'Post-Capitalism')
ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category;
