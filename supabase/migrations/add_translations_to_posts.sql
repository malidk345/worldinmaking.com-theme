-- Add translations support to blog posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

COMMENT ON COLUMN public.posts.translations IS 'JSON object containing translated versions of the post (e.g. {"tr": {"title": "...", "content": "..."}})';
COMMENT ON COLUMN public.posts.language IS 'Original language of the post';
