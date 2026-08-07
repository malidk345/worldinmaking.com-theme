-- WIM search: Postgres full-text search on public.posts
-- Safe to re-run. Assumes posts has at least title/excerpt/content text columns
-- (table may already exist in production; we only add FTS artifacts).

-- ── Ensure minimal posts shape if project is greenfield ─────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL DEFAULT '',
    slug text,
    content text NOT NULL DEFAULT '',
    excerpt text,
    category text,
    created_at timestamptz NOT NULL DEFAULT now(),
    image_url text,
    author text,
    author_avatar text,
    tags text[]
);

-- ── search_vector column ────────────────────────────────────────────────────
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Backfill / maintain via trigger (works even if column already existed empty)
CREATE OR REPLACE FUNCTION public.posts_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A')
        || setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'B')
        || setweight(to_tsvector('english', coalesce(left(NEW.content, 50000), '')), 'C');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_search_vector_trg ON public.posts;
CREATE TRIGGER posts_search_vector_trg
    BEFORE INSERT OR UPDATE OF title, excerpt, content
    ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.posts_search_vector_update();

-- Backfill / refresh vectors for existing rows (idempotent re-run)
UPDATE public.posts
SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english', coalesce(left(content, 50000), '')), 'C');

CREATE INDEX IF NOT EXISTS posts_search_vector_gin
    ON public.posts
    USING GIN (search_vector);

-- ── Ranked search RPC (PostgREST: POST /rest/v1/rpc/search_posts) ───────────
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
        AND p.search_vector @@ websearch_to_tsquery('english', trim(q))
    ORDER BY ts_rank_cd(p.search_vector, websearch_to_tsquery('english', trim(q))) DESC,
             p.created_at DESC NULLS LAST
    LIMIT greatest(1, least(coalesce(lim, 40), 100));
$$;

GRANT EXECUTE ON FUNCTION public.search_posts(text, integer) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_posts IS
    'WIM ranked full-text search over posts (title A / excerpt B / content C). Used by /api/search.';
