-- Ranked post search must only return published rows (anon/authenticated RLS).
CREATE OR REPLACE FUNCTION public.search_posts(q text, lim integer DEFAULT 40)
RETURNS SETOF public.posts
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT p.*
    FROM public.posts p
    WHERE
        q IS NOT NULL
        AND length(trim(q)) >= 2
        AND coalesce(p.published, false) = true
        AND p.search_vector @@ websearch_to_tsquery('english', trim(q))
    ORDER BY ts_rank_cd(p.search_vector, websearch_to_tsquery('english', trim(q))) DESC,
             p.created_at DESC NULLS LAST
    LIMIT greatest(1, least(coalesce(lim, 40), 100));
$$;

GRANT EXECUTE ON FUNCTION public.search_posts(text, integer) TO anon, authenticated, service_role;
