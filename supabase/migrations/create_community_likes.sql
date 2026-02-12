-- Create community_likes table for storing post likes
CREATE TABLE IF NOT EXISTS public.community_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all likes
CREATE POLICY "Anyone can view likes" ON public.community_likes
    FOR SELECT USING (true);

-- Policy: Users can insert their own likes
CREATE POLICY "Users can like posts" ON public.community_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own likes
CREATE POLICY "Users can unlike posts" ON public.community_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON public.community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON public.community_likes(user_id);

COMMENT ON TABLE public.community_likes IS 'Stores likes for community posts';
