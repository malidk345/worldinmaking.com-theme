Supabase — RLS ve Redirect Ayarları

1) Ortam değişkenleri

- Cloudflare Pages / GitHub Actions ortam değişkenleri (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) doğru tanımlı olmalı.

2) Redirect / Allowed URLs

- Supabase Authentication -> Settings -> Redirect URLs içine sitenizin domain'ini ekleyin (örneğin `https://your-site.pages.dev` veya `https://www.yourdomain.com`). Magic link/OTP kullandığınızda bu URL'ler eşleşmezse oturum kurulmaz.

3) Örnek RLS politikaları (SQL)

-- Enable RLS on `posts` table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to SELECT only published posts
CREATE POLICY "Allow selects on published posts" ON public.posts
  FOR SELECT USING (published = true);

-- Allow authenticated users to SELECT their own posts or published posts
CREATE POLICY "Allow authenticated users see own or public" ON public.posts
  FOR SELECT USING (
    published = true
    OR (auth.role() = 'authenticated' AND owner = auth.uid())
  );

Replace `owner` and field names with your schema's column names as needed.

4) Test adımları

- Supabase SQL Editor'de yukarıdaki komutları çalıştırın.
- Tarayıcıda siteyi açıp anonim olarak bir yazının `published: true` olup olmadığını kontrol edin.
- Giriş/Üye senaryosunu test etmek için Supabase Authentication ile bir test kullanıcı oluşturun ve login/magic-link akışını doğrulayın.

5) Yardımcı not

- Eğer auth redirect sorunları varsa, Supabase auth ayarlarında hem `https://` hem de `http://` (yerel geliştirme için `http://localhost:3000`) redirect URL'lerini ekleyin.
