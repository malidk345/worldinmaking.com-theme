-- Community Posts
DROP POLICY IF EXISTS "com_posts_read" ON public.community_posts;
DROP POLICY IF EXISTS "com_posts_insert" ON public.community_posts;
DROP POLICY IF EXISTS "com_posts_update" ON public.community_posts;
DROP POLICY IF EXISTS "com_posts_delete" ON public.community_posts;
DROP POLICY IF EXISTS "Anyone can view community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts or admin can delete" ON public.community_posts;

CREATE POLICY "Anyone can view community posts"
ON public.community_posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
ON public.community_posts FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts or admin can delete"
ON public.community_posts FOR DELETE
USING (
    auth.uid() = author_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- Posts
DROP POLICY IF EXISTS "posts_read" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;
DROP POLICY IF EXISTS "Only admins can create posts" ON public.posts;
DROP POLICY IF EXISTS "Only admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Only admins can delete posts" ON public.posts;

CREATE POLICY "Anyone can view published posts"
ON public.posts FOR SELECT
USING (published = true OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

CREATE POLICY "Only admins can create posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

CREATE POLICY "Only admins can update posts"
ON public.posts FOR UPDATE
USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

CREATE POLICY "Only admins can delete posts"
ON public.posts FOR DELETE
USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));
