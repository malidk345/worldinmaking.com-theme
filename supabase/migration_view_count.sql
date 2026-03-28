-- =============================================================
-- MIGRATION: View Count Altyapısı
-- =============================================================
-- Bu dosyayı Supabase SQL Editor'da çalıştır.
-- Mevcut verilere zarar VERMEZ, sadece eksik parçaları ekler.
-- =============================================================

-- ADIM 1: Kolonları ekle (zaten varsa sessizce geçer)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

-- ADIM 2: Eski fonksiyonları temizle (tip çakışması olmasın)
DROP FUNCTION IF EXISTS increment_post_view(text);
DROP FUNCTION IF EXISTS increment_com_post_view(int);
DROP FUNCTION IF EXISTS increment_com_post_view(bigint);

-- ADIM 3: Blog yazıları için sayaç fonksiyonu
CREATE OR REPLACE FUNCTION increment_post_view(slug_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.posts SET view_count = view_count + 1 WHERE slug = slug_input;
END;
$$;

-- ADIM 4: Forum postları için sayaç fonksiyonu
CREATE OR REPLACE FUNCTION increment_com_post_view(id_input BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.community_posts SET view_count = view_count + 1 WHERE id = id_input;
END;
$$;

-- ADIM 5: Yetkileri ver (misafir ve giriş yapmış herkes tetikleyebilsin)
GRANT EXECUTE ON FUNCTION increment_post_view(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_com_post_view(bigint) TO anon, authenticated, service_role;

-- ADIM 6: View'ı güncelle (artık view_count da p.* içinde gelecek)
CREATE OR REPLACE VIEW public.community_posts_with_stats WITH (security_invoker = true) AS
SELECT p.*,
    (SELECT COALESCE(SUM(v.vote), 0) FROM community_post_votes v WHERE v.post_id = p.id) as total_votes,
    (SELECT COUNT(*) FROM community_replies r WHERE r.post_id = p.id) as reply_count
FROM public.community_posts p;

-- ADIM 7: Mevcut NULL değerleri sıfırla
UPDATE public.posts SET view_count = 0 WHERE view_count IS NULL;
UPDATE public.community_posts SET view_count = 0 WHERE view_count IS NULL;
