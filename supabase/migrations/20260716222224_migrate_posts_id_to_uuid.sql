-- 1. Drop temporary inspection functions
DROP FUNCTION IF EXISTS public.inspect_db();
DROP FUNCTION IF EXISTS public.inspect_db_v2();

-- 2. Drop foreign key constraint referencing posts(id) on symposium_collaborations
ALTER TABLE public.symposium_collaborations
    DROP CONSTRAINT IF EXISTS symposium_collaborations_post_id_fkey;

-- 3. Drop identity constraint from posts.id
ALTER TABLE public.posts
    ALTER COLUMN id DROP IDENTITY IF EXISTS;

-- 4. Convert posts.id column to UUID
-- We use lpad(to_hex(id), 32, '0')::uuid to convert existing bigints to valid UUIDs
ALTER TABLE public.posts
    ALTER COLUMN id TYPE uuid USING lpad(to_hex(id), 32, '0')::uuid,
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. Convert symposium_collaborations.post_id column to UUID
ALTER TABLE public.symposium_collaborations
    ALTER COLUMN post_id TYPE uuid USING lpad(to_hex(post_id), 32, '0')::uuid;

-- 6. Re-add foreign key constraint with correct types
ALTER TABLE public.symposium_collaborations
    ADD CONSTRAINT symposium_collaborations_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;
