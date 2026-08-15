-- Persist profile birth date so age can be shown and edited.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS birth_date date;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
    ON public.profiles (lower(username))
    WHERE username IS NOT NULL AND length(trim(username)) > 0;

NOTIFY pgrst, 'reload schema';

