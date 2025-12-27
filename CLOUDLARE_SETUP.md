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
  - Build komutu adapter olan `next-on-pages`'i `--outdir out` ile çağırır. Workflow zaten bunu kullanıyor.
  - Pages projesinde Node sürümünü 20.x yapın ve Output directory olarak `out` seçin.
  - Eğer deploy hala başarısızsa, Actions log'larını kontrol edin ve hatayı bana gönderin.
