-- Opt-in profile contact email is public. Auth email stays in profile_private.
-- Users only publish an address by saving it on their profile.

GRANT SELECT (contact_email) ON public.profiles TO anon, authenticated;
GRANT UPDATE (contact_email) ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.contact_email IS 'Optional public contact email. Empty until the user saves one on their profile.';

NOTIFY pgrst, 'reload schema';
