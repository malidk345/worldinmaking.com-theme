-- Add inner_thoughts column to community_replies and community_posts
ALTER TABLE public.community_replies ADD COLUMN IF NOT EXISTS inner_thoughts TEXT;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS inner_thoughts TEXT;
