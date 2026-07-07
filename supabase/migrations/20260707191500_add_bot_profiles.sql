-- 1. CREATE BOT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.bot_profiles (
    id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    system_prompt   TEXT NOT NULL,
    api_token       TEXT UNIQUE NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_profiles ENABLE ROW LEVEL SECURITY;

-- 2. CREATE POLICY
-- Only admins can view or modify bot profiles (keep tokens private)
DROP POLICY IF EXISTS "bot_profiles_admin_all" ON public.bot_profiles;
CREATE POLICY "bot_profiles_admin_all" ON public.bot_profiles
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. SEED DEFAULT FORUM CHANNEL
-- Ensure at least one channel exists so bots can post
INSERT INTO public.community_channels (id, name, slug, description)
VALUES (1, 'General', 'general', 'General discussion channel for all making topics')
ON CONFLICT (id) DO NOTHING;

-- Reset the SERIAL sequence for community_channels if we seeded ID 1
SELECT setval(pg_get_serial_sequence('public.community_channels', 'id'), COALESCE(max(id), 1)) FROM public.community_channels;

-- 4. SEED BOT USERS
-- We insert into auth.users. The AFTER INSERT trigger on_auth_user_created will automatically create the public.profiles record.

-- Bot 1: TechBot
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'techbot@worldinmaking.com',
    '{"username": "TechBot", "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=TechBot"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- Bot 2: DesignBot
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'designbot@worldinmaking.com',
    '{"username": "DesignBot", "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=DesignBot"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- Bot 3: ProductBot
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'productbot@worldinmaking.com',
    '{"username": "ProductBot", "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=ProductBot"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 5. SEED BOT PROFILES IN PUBLIC.BOT_PROFILES
-- Link them to their personas and tokens
INSERT INTO public.bot_profiles (id, system_prompt, api_token)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'You are TechBot, a technical agent focused on code, engineering, web development, Next.js, databases, and AI. Keep your posts concise, insightful, and focused on implementation, software design, and best practices. Use a professional, tech-focused tone.',
    'bot_token_techbot_4c1ffd32'
),
(
    '00000000-0000-0000-0000-000000000002',
    'You are DesignBot, a creative agent focused on UI/UX, aesthetics, typography, CSS, user interaction, and design systems. Keep your posts visually descriptive, engaging, and focused on design principles, user delight, and frontend beauty. Use an enthusiastic, design-oriented tone.',
    'bot_token_designbot_4c1ffd32'
),
(
    '00000000-0000-0000-0000-000000000003',
    'You are ProductBot, a strategic agent focused on product management, market trends, user growth, business goals, and MVP strategies. Keep your posts focused on user value, metrics, prioritization, roadmap planning, and product-market fit. Use a logical, business-minded tone.',
    'bot_token_productbot_4c1ffd32'
) ON CONFLICT (id) DO NOTHING;
