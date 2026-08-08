# 📓 WorldInMaking Notebook Uygulaması Detaylı Analiz & YZ Devir (AI Handoff) Raporu

Bu belge, `src/notebook-app` dizininde konumlandırılmış olan Notebook uygulamasının mimarisini, veri akışını, temel mekaniklerini ve potansiyel gelişim/sorun noktalarını çok detaylı bir biçimde belgelemek üzere hazırlanmıştır. Temel amacı, projeyi devralacak yapay zeka (AI) ajanlarına (veya insan mühendislere) sistemin anatomisini tüm çıplaklığıyla sunmak, neyin neden yapıldığını açıklamak ve gelecekteki geliştirmelerde referans olmaktır.

---

## 1. Mimari Genel Bakış

Notebook uygulaması, "Markdown-First" bir yaklaşımla inşa edilmiş zengin bir metin editörüdür.

### 1.1. Core Teknolojiler ve Yönelimler
* **Frontend:** React tabanlı, ağırlıklı olarak `LemonUI` bileşenleri kullanılıyor.
* **Metin Motoru:** Standart bir HTML `contenteditable` veya Slate.js/ProseMirror benzeri ağır framework'ler **yerine**, metin tek bir `contenteditable` host içinde tutuluyor. Ancak olay (event) yönetimi (klavye, beforeinput) merkezileştirilmiş durumda (`MarkdownNotebook.tsx`).
* **Veri Depolama:** **Local-First (Çevrimdışı Çalışabilir)**. Verinin asıl kaynağı (Source of Truth) tarayıcının `localStorage` nesnesidir.
* **Senkronizasyon (Remote):** Arka planda Supabase (veya benzeri bir `/api/notebooks` endpoint'i) ile `notebookRemote.ts` üzerinden senkronize oluyor. Senkronizasyon başarısız olursa uygulama çökmüyor, kullanıcı fark etmiyor (Sessiz hatalar).

---

## 2. Derinlemesine Sistem Analizi

### 2.1. Metin Motoru ve Markdown Serileştirme (`MarkdownNotebook`)
* **Veri Formatı:** İçerik, JSON tabanlı bir Abstract Syntax Tree (AST) yerine **saf Markdown string'i** olarak tutulur. `parse(serialize(doc))` işleminin dokümanı birebir aynı koruyacağının (Round-trip guarantee) garantisi verilmektedir.
* **Özel JSX Bileşenleri:** Markdown içine `<RevenueCard metric="arr" />` şeklinde React JSX benzeri bileşenler enjekte edilebiliyor. Bunlar ayrıştırıcı tarafından özel olarak işleniyor (`COMPONENTS.md`).
* **Olay Mimarisi (Event Architecture):** Alt elemanlarda (liste, kod bloğu vs.) kendi içlerinde `contenteditable` bulunsa bile, tarayıcıların iç içe editable nesnelerdeki davranış hatalarını önlemek için, tüm tuş vuruşları ve `beforeinput` olayları **en üstteki tek bir Canvas bileşeninde yakalanır** (`handleRootEditableKeyDown`, `handleRootEditableInput`).
  > **Kritik Uyarı (AI Agent için):** İç (inner) bileşenlere (ör: tablo hücresi, liste elemanı) özel `onKeyDown` veya `onInput` event handler'ları **eklemeyin**. JSDOM testlerinde çalışsalar da gerçek tarayıcıda tetiklenmeyeceklerdir. Tüm müdahaleler ana Canvas'tan yapılmalıdır.

### 2.2. Depolama (Storage) ve Tarihçe (History) Yönetimi (`notebookStorage.ts`)
* **Local Storage Sınırları:** Tüm notlar (`getNotebooks()`) ve her notun sürümleri (version history) doğrudan `localStorage` içine basılıyor. Her bir tarihçe `HISTORY_KEY_PREFIX + id` olarak tutuluyor.
* **Tarihçe Mantığı:** Her tuş vuruşunda snapshot alınmıyor (spam önlemi). Düzenlemelerde ~20 saniyede bir otomatik snapshot (`SNAPSHOT_MIN_INTERVAL_MS`), veya elle tetiklenen adlandırılmış (labeled) snapshot'lar (ör: "Published", "Restored v5") kaydediliyor.
* **Sorun Noktası (Tech Debt):** `localStorage`, domain başına genellikle ~5MB kota ile sınırlıdır. Aktif kullanımda, özellikle uzun Markdown içerikleri ve sık versiyon geçmişi kaydı nedeniyle kısa sürede **QuotaExceededError** fırlatılma riski çok yüksektir.

### 2.3. Uzak Senkronizasyon (Remote Sync) (`notebookRemote.ts`)
* **Owner Key:** Kullanıcının kimliği (authUserId) varsa kullanılıyor. Yoksa (anonymous) rastgele bir `owner_key` oluşturulup localStorage'a yazılıyor (`wim_notebook_owner_key`).
* **Sessiz Senkronizasyon:** `pullNotebooksFromRemote` ve `pushNotebookToRemote` işlemleri başarısız olursa (örn: sunucu 503 verirse veya ağ yoksa) uygulama UI tarafında bağırmaz. Sadece yerel kayıtlarla devam eder.
* **Merge Çatışmaları:** İki taraf da aynı notu değiştirirse "Last-write-wins" (Son yazan kazanır) mantığı (ISO timestamp `updatedAt` ile) işler.

### 2.4. Kullanıcı Arayüzü ve UX (iOS 26 / Spatial UI Uyumları)
* `NotebookSelectButton` ve `NotebooksListScene` içinde, kullanıcı tercihine (iOS 26 / VisionOS Spatial UI) saygı duyarak "rounded-full" butonlar, yumuşak geçişler ve "stealth / secondary" tipler aktif olarak kullanılıyor.
* Sürükle-bırak bloklar, hover menüleri (`NotebookMenu`, `NotebookFloatingToolbar`) ile notion tarzı bir deneyim hedefleniyor.

---

## 3. Geliştirme ve İyileştirme (Refactoring) Önerileri

Buradaki maddeler, gelecekteki bir YZ Ajanının backlog (yapılacaklar) listesini oluşturur:

1. **Storage Sınırını Aşma (Acil / Kritik):**
   * Mevcut `localStorage` mimarisi, büyük verilerle çökecektir.
   * **Öneri:** `localforage` kütüphanesini veya yerleşik `IndexedDB` API'sini (idb kütüphanesi ile) entegre ederek `notebookStorage.ts` dosyasını asenkron (Promise tabanlı) hale getirin. Bu, depolama sınırını ~5MB'dan gigabyte seviyelerine taşıyacaktır.

2. **Gerçek Zamanlı Çatışma Çözümü (CRDT / Yjs):**
   * Şu anki `last-write-wins` birleşimi veri kaybına yol açabilir (İki kullanıcı aynı anda farklı satırları düzenlerse biri uçar).
   * **Öneri:** `MarkdownNotebook` içindeki belge modeline `Yjs` gibi bir CRDT motoru entegre edilebilir veya `automerge` ile daha akıllı diff/merge çözümleri (şu anki basit metin diff'inin yerine) getirilebilir.

3. **Büyük Notebook'larda Render Optimizasyonu:**
   * Tek bir büyük markdown string'inin değişmesi, her tuş vuruşunda tüm AST'nin parse edilip React tarafından tekrar render edilmesine yol açabilir.
   * **Öneri:** Daha belirgin "Block" bazlı React memoization uygulanması, statik blokların render sürecinin dışına çıkartılması. Performans için `.jules/bolt.md` (Bolt personası) pratiklerini uygulayarak `useMemo` ve O(1) haritalamalar kullanılmalı.

4. **Yapay Zeka (AI) Bütünleşmesi (NotebookAIWriterModal):**
   * Metin içinde "Ask AI" (`NotebookAIWriterModal.tsx`, `NotebookAI.ts`) yetenekleri var. Ancak blokların içine daha derinlemesine (inline autocomplete - GitHub Copilot benzeri) entegre edilebilir.

---

## 4. YZ (AI) Handoff Protokolü - Sonraki Ajanlar İçin Kesin Yönergeler

Eğer bir yapay zeka ajanı bu repoyu devralıyor ve Notebook üzerinde çalışacaksa, şu kurallara **kesinlikle** uymalıdır:

### Kural 1: Depolama Katmanına Müdahale
* `notebookStorage.ts` içindeki herhangi bir fonksiyonu `IndexedDB` asenkron yapısına geçirirken (Refactor), `MarkdownNotebook` gibi senkron (sync) bekleyen UI katmanlarında `useEffect` ve "Yükleniyor" (Loading) state'lerini dikkatle kurgulayın.
* Veri formatı (StoredNotebook) yapısını değiştirmeyin, sadece okuma/yazma motorunu değiştirin.

### Kural 2: Markdown Parsing ve Round-Trip Kuralı
* Yeni bir Markdown sintaksı veya JSX bileşeni (Örnek: `COMPONENTS.md` içinde anlatıldığı gibi `<VideoPlayer />`) eklerken, `parse(serialize(doc)) == doc` eşitliğinin bozulmadığından emin olun. Gerekirse ilk iş olarak bir Fixpoint Test'i (`markdownRoundTrip.test.ts`) oluşturun.

### Kural 3: UI/UX Aestetik Kılavuzu (iOS 26)
* Arayüz bileşenlerinde değişiklik yaparken, depo içerisindeki `ios26-aesthetic-memory.md` dosyasındaki felsefeyi uygulayın.
* Sert `box-shadow` veya köşeli (`rounded-sm`) tasarımlar kullanmayın. Yüksek `blur`, düşük `rgba` ve spring-based (yay fiziği) animasyonları (`framer-motion` vb.) tercih edin. Flat grilerden kaçının.

### Kural 4: Kod Temizliği (Garbage Code) ve Semgrep
* Temizlik yaparken, kasıtlı olarak bırakılmış UI test/mock konsol loglarını (`LemonToast`, `.stories.tsx`) veya try/catch blokları içerisindeki hata yakalayıcı `console.error`'ları **SİLMEYİN**.
* Legacy bileşenlerdeki zorunlu `dangerouslySetInnerHTML` kullanımlarını `// nosemgrep: ...` ile işaretleyin, `semgrep-disable-next-line` KULLANMAYIN.

### Kural 5: Test ve Derleme Ön Koşulu
* Yaptığınız her değişikliğin ardından, `pnpm typecheck:shell` veya `npx -p typescript tsc --noEmit --skipLibCheck` komutlarını kullanarak tip hatalarını yakalayın. CI'ın bozulmaması kritik öneme sahiptir.

### Kural 6: Dosya Yolları
* Next.js importlarında `../../images/file.png` gibi **relative (göreceli)** path kullanın, absolute path'ler module resolution (TS5112) hatalarına yol açar.

---
*Bu rapor, proje sürekliliğini sağlamak ve yeni YZ/İnsan katkıcıların sistemin felsefesini hızlıca kavraması için hazırlanmıştır.*
