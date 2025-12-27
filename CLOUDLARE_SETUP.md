Cloudflare Pages — Hızlı Kurulum

- Node sürümü: 20.x (Next.js 16 için >=20.9.0). Pages projesinde "Node version" 20.x olarak ayarlayın.
- Build komutu (Pages settings):

  npm ci && npm run build && npx @cloudflare/next-on-pages@latest --outdir out

- Output directory (Pages settings): `out`
- Root directory: repository root (boş bırakın). **Uyarı:** `out`'u root olarak ayarlamayın — `out` build çıktısıdır.
- GitHub Actions: workflow zaten repo içinde `.github/workflows/deploy-cloudflare-next.yml` olarak eklendi.
- Gerekli Secrets/Environment Variables (Pages -> Settings → Environment variables):

  - `CF_PROJECT_NAME` (workflow içinde kullanılıyor)
  - `CF_ACCOUNT_ID` and `CF_API_TOKEN` (wrangler/kullanıcı token gerektiren durumlarda)
  - `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase istemcisi için)

- Notlar:
  - `wrangler pages publish` artık deprecated; Pages deploy için `wrangler pages deploy` kullanın. Workflow dosyasında bu güncellendi.
  - Eğer Pages dashboard içindeki "Deploy command" kullanıyorsanız, `--project-name` argümanını doğrudan string olarak koyabilir veya Pages environment variables içine `CF_PROJECT_NAME` ekleyin. Örnek (güvenli):

    npm ci && npm run build && npx @cloudflare/next-on-pages@latest --outdir out && npx wrangler pages deploy out --project-name "your-project-name" --branch "main"

  - Pages projesinde Node sürümünü 20.x yapın ve Output directory olarak `out` seçin.
  - Eğer deploy hata veriyorsa, log'lardaki "Must specify a project name" hatası için `--project-name` argümanının boş olmadığını doğrulayın (env var setli değilse doğrudan proje adını yazın).

