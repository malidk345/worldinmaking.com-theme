-- Display names live on the profile page only. Username stays the handle.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS first_name text,
    ADD COLUMN IF NOT EXISTS last_name text;

NOTIFY pgrst, 'reload schema';
