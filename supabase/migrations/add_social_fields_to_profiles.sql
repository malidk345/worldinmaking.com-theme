-- Add more fields to profiles table to match PostHog community profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS github TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS pronouns TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.profiles.website IS 'Personal or company website URL';
COMMENT ON COLUMN public.profiles.github IS 'GitHub profile URL';
COMMENT ON COLUMN public.profiles.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.profiles.twitter IS 'Twitter/X profile URL';
COMMENT ON COLUMN public.profiles.pronouns IS 'User preferred pronouns';
COMMENT ON COLUMN public.profiles.location IS 'User geographic location';
