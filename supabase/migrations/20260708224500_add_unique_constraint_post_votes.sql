-- Delete duplicates in post_votes keeping only the latest updated_at
DELETE FROM public.post_votes a USING (
    SELECT MIN(id) as keep_id, post_slug, user_id
    FROM public.post_votes
    GROUP BY post_slug, user_id
    HAVING COUNT(*) > 1
) b
WHERE a.post_slug = b.post_slug 
  AND a.user_id = b.user_id 
  AND a.id != b.keep_id;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'post_votes_post_slug_user_id_key'
    ) THEN
        ALTER TABLE public.post_votes 
        ADD CONSTRAINT post_votes_post_slug_user_id_key UNIQUE (post_slug, user_id);
    END IF;
END;
$$;
