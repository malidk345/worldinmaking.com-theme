-- Optional public contact email (not the login email).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email text;
