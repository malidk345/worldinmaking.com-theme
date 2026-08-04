# PostHog Kullanılmayan/Gereksiz Öğeler Raporu

Bu rapor, projede PostHog analiz ve izleme (tracking) kullanımının
bırakılmasının ardından kod tabanında kalan, artık kullanılmayan
(veya mocklanmış) gereksiz PostHog öğelerini tespit etmek amacıyla hazırlanmıştır.

*(Not: Tasarım sisteminde aktif olarak kullanılan `@posthog/icons`,
`@posthog/brand`, `@posthog/quill` gibi UI paketleri bu rapora dahil
edilmemiştir.)*

## 1. Mock'lanmış `usePostHog` Hook'u

PostHog analiz özellikleri projenin aktif izleme sisteminden çıkarıldığı için
`src/hooks/usePostHog.ts` içerisinde tamamen boş (mock) bir obje olarak
tanımlanmıştır:

- Tüm temel analiz fonksiyonları (`capture`, `identify`,
  `captureException`, `register`, vb.) boş `() => {}` fonksiyonları olarak
  bırakılmıştır.

- **Sorun:** Bu sahte hook hala birçok bileşende çalıştırılmaktadır.
  Örneğin: `src/templates/merch/BackInStockForm.tsx`,
  `src/templates/Handbook.tsx`, `src/components/CookieBanner/index.tsx`,
  `src/hooks/useUser.tsx`, `src/context/App.tsx`. Fonksiyonel hiçbir işlevi
  olmadığı için çağrıldığı bileşenlerden temizlenebilir.

## 2. Global `window.posthog` Çağrıları

Tarayıcı üzerinde global `window` objesi üzerinden yapılmaya çalışılan
PostHog analiz ve oturum kaydı (session recording) çağrıları hala bazı
bileşenlerde ve lojik dosyalarında mevcuttur. Bunlar gereksizdir ve
temizlenebilir.

- **Tespit Edilen Dosyalar:**
  - `src/components/Home/CodeBlocks/SessionReplay/index.tsx`
  - `src/components/Home/CodeBlocks/CodeBlocks/SessionReplay/index.tsx`
  - `src/logic/scrollspyCaptureLogic.ts`
  - `src/hooks/productData/productData/session_replay/features.tsx`
  - `src/hooks/productData/session_replay/features.tsx`

## 3. `posthog-js` Kütüphanesi Kalıntıları

`next.config.js` dosyasında `posthog-js` çeşitli shim'ler veya mock yapılar
ile yönlendirilmiş olmasına rağmen kod içerisinde gereksiz yere import
edilmektedir. Ayrıca özellik bayrakları (feature flags) için kullanılan
kancalar hala durmaktadır.

- **Import Edildiği Yerler (LemonUI):**
  - `src/components/LemonUI/lemon-ui/LemonDialog/LemonDialog.tsx`
  - `src/components/LemonUI/lemon-ui/LemonRichContent/LemonRichContentEditor.tsx`
  - `src/components/LemonUI/lemon-ui/Spinner/Spinner.tsx`
  - `src/components/LemonUI/lemon-ui/LemonTextArea/LemonTextAreaMarkdown.tsx`
  - `src/components/LemonUI/lemon-ui/LemonToast/LemonToast.tsx`

- **Kullanılmayan Feature Flag Kancaları:**
  - `src/hooks/useActiveFeatureFlags.ts`
  - `src/hooks/useEarlyAccessFeatures.ts`
  - `src/hooks/usePrimeEarlyAccessFeatures.ts`

## 4. `posthog-node` Bağımlılığı ve Kullanımı

Sunucu tarafı PostHog entegrasyonu sağlayan `posthog-node` kütüphanesi hala
`package.json` içerisinde bulunmakta ve aktif kodda yer almaktadır.

- **Kullanıldığı Yer:** `src/api/contact-event.ts` dosyasında form gönderim
  (form submission) verilerini kaydetmek için `client.capture` metodu
  çağrılmaktadır.

- **Sorun:** Eğer bu veriler aktif olarak PostHog'da takip edilmiyorsa, bu
  bağımlılığın ve API rotasındaki ilgili kodların kaldırılması paketi
  hafifletecektir.

## Sonuç ve Öneri

Bu kalıntıların temizlenmesi:

- Kod tabanını sadeleştirecektir.

- Kullanılmayan kodlar ve gereksiz hook'lar silindiği için bakım yükünü
  azaltacaktır.

- `posthog-node` gibi bağımlılıkların kaldırılması proje bağımlılık ağacını
  ve güvenlik risklerini minimuma indirecektir.
