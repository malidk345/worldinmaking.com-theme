-- ================================================================
-- POSTHOG-NEXT: Add image_url column to posts table
-- ================================================================
-- Bu dosyayı Supabase SQL Editor'da çalıştırın
-- Bu işlem posts tablosuna görsel URL desteği ekler

-- Posts tablosuna image_url sütunu ekle
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Açıklama ekle
COMMENT ON COLUMN public.posts.image_url IS 'Featured image URL for blog posts';

-- ================================================================
-- KURULUM TAMAMLANDI.
-- Artık admin panelinden görsel URL ekleyebilirsiniz.
-- ================================================================