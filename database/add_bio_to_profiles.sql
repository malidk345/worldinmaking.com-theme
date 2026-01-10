-- Add bio column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN public.profiles.bio IS 'User biography/about text';
