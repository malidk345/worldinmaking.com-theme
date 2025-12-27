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

  - Cloudflare API Token ve izinleri:

    - Hataya sebep olan `Authentication error [code: 10000]` genellikle API token'ın yeterli izinlere sahip olmamasından veya token'ın yanlış yerde/isimde saklanmasından kaynaklanır.
    - GitHub Actions için oluşturacağınız API Token'ın (Dashboard -> My Profile -> API Tokens -> Create Token) en az şu izinlere sahip olmasını öneriyorum:

      - Account: Read
      - Pages: Edit (veya Pages:Edit scoped to the relevant account)

    - Token'ı oluşturduktan sonra GitHub repository -> Settings -> Secrets -> Actions içine `CF_API_TOKEN` olarak ekleyin.
    - Ayrıca Pages projesinin tam slug/isim bilgisini `CF_PROJECT_NAME` isimli secret olarak ekleyin (örneğin `my-site` değil `my-site` projeye rağmen dashboard'daki tam proje slug'ını kontrol edin). Eğer `CF_PROJECT_NAME` boşsa workflow `your-project-name` ya da boş bir değer ile çağrı yapabilir ve API "Must specify a project name" hatası verir.

  - Özet adımlar (GitHub Secrets):

    1. Cloudflare Dashboard -> Profile -> API Tokens -> Create Token -> Custom Token
    2. Verilecek izinler: `Account: Read`, `Pages: Edit` (scope to account)
    3. Oluşan token'ı kopyalayın.
    4. GitHub -> Repository -> Settings -> Secrets -> Actions -> New repository secret
       - Name: `CF_API_TOKEN`
       - Value: (Cloudflare API token)
    5. Aynı yerde yeni secret ekleyin:
       - Name: `CF_PROJECT_NAME`
       - Value: (Cloudflare Pages project slug) 

  - Eğer token doğru izinlere sahip olmasına rağmen hata alıyorsanız, token'ın ait olduğu Cloudflare account'ın `Account ID` ile deploy etmeye çalıştığınız Pages projesinin account id'sinin aynı olduğundan emin olun.

