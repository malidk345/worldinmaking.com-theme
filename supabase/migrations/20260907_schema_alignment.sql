-- Align live DB with app: vote is integer, PII is own-row, drop stacked RLS clones.
-- Safe to re-run.

-- ── 1. Private profile fields (email / birth date) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_private (
    user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
    contact_email text,
    birth_date date,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.profile_private (user_id, contact_email, birth_date)
SELECT id, contact_email, birth_date
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
    contact_email = COALESCE(EXCLUDED.contact_email, public.profile_private.contact_email),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profile_private.birth_date);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_private_own" ON public.profile_private;
CREATE POLICY "profile_private_own"
    ON public.profile_private
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.profile_private FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;

-- Anon/authenticated cannot read PII columns on the public profiles row.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
    id,
    username,
    first_name,
    last_name,
    avatar_url,
    bio,
    website,
    github,
    linkedin,
    twitter,
    pronouns,
    location,
    cover_url,
    role,
    is_bot,
    created_at,
    updated_at,
    preferred_language
) ON public.profiles TO anon, authenticated;

REVOKE UPDATE (contact_email, birth_date) ON public.profiles FROM anon, authenticated;

COMMENT ON TABLE public.profile_private IS 'Own-row only: contact_email and birth_date. Public profiles table must not expose these.';
COMMENT ON COLUMN public.community_post_votes.vote IS 'Integer +1 / -1. Not vote_type text.';
COMMENT ON COLUMN public.community_reply_votes.vote IS 'Integer +1 / -1. Not vote_type text.';
COMMENT ON COLUMN public.post_votes.vote IS 'Integer +1 / -1. Not vote_type text.';

-- Copy auth email into private row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_name text;
  first_n text;
  last_n text;
  avatar text;
  final_username text;
BEGIN
  user_name := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );
  final_username := user_name;
  IF final_username IS NULL OR length(trim(final_username)) = 0 THEN
    final_username := 'user_' || substr(new.id::text, 1, 8);
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id <> new.id) LOOP
    final_username := user_name || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;
  first_n := new.raw_user_meta_data->>'first_name';
  last_n := new.raw_user_meta_data->>'last_name';
  avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, username, first_name, last_name, avatar_url, role, created_at, updated_at)
  VALUES (new.id, final_username, first_n, last_n, avatar, coalesce(new.raw_app_meta_data->>'role', 'member'), now(), now())
  ON CONFLICT (id) DO UPDATE SET
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  INSERT INTO public.profile_private (user_id, contact_email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error %: %', new.id, SQLERRM;
  RETURN new;
END;
$function$;

-- ── 2. Drop stacked duplicate policies (keep one name per action) ───────────
DO $$
DECLARE
  r record;
  keep text[] := ARRAY[
    'profiles_public_read',
    'profiles_insert_own',
    'profiles_update_own',
    'community_posts_public_read',
    'community_posts_insert_own',
    'community_posts_update_own',
    'community_posts_delete_owner_admin',
    'community_replies_public_read',
    'community_replies_insert_own',
    'community_replies_update_own',
    'com_replies_delete',
    'channels_read',
    'Sadece admin kanal ekleyebilir',
    'Public comments',
    'comments_insert_own',
    'Admins can delete comments',
    'com_post_votes_select_public',
    'com_post_votes_insert_own',
    'com_post_votes_update_own',
    'com_post_votes_delete_own',
    'com_reply_votes_select_public',
    'com_reply_votes_insert_own',
    'com_reply_votes_update_own',
    'com_reply_votes_delete_own'
  ];
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'community_posts',
        'community_replies',
        'community_channels',
        'comments',
        'community_post_votes',
        'community_reply_votes'
      )
      AND NOT (policyname = ANY (keep))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
