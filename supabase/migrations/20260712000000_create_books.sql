-- =============================================================
-- Migration: Create Books and Chapters Tables
-- =============================================================

-- 1. Create Books Table
CREATE TABLE IF NOT EXISTS public.books (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    author      TEXT NOT NULL,
    cover_url   TEXT,
    summary     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Book Chapters Table
CREATE TABLE IF NOT EXISTS public.book_chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    chapter_number  INT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    forum_post_id   INT REFERENCES public.community_posts(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(book_id, chapter_number)
);

-- 3. Security (Enable RLS)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Read access: allowed for everyone (guest and authenticated)
DROP POLICY IF EXISTS "books_read" ON public.books;
CREATE POLICY "books_read" ON public.books FOR SELECT USING (true);

DROP POLICY IF EXISTS "chapters_read" ON public.book_chapters;
CREATE POLICY "chapters_read" ON public.book_chapters FOR SELECT USING (true);

-- Write/Modify access: allowed only for admins
DROP POLICY IF EXISTS "books_admin" ON public.books;
CREATE POLICY "books_admin" ON public.books FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "chapters_admin" ON public.book_chapters;
CREATE POLICY "chapters_admin" ON public.book_chapters FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 5. Timestamps Trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.books;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.book_chapters;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.book_chapters FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
