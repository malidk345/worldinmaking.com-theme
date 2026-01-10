---
description: Kapsamlı Kod İnceleme ve İyileştirme Yol Haritası
---

# PostHog UI Demo - Sistematik Kod İnceleme Planı

## 📊 Proje Genel Bakış

### Dosya Yapısı
```
app/
├── components/       (24 dosya) - UI bileşenleri
├── contexts/         (4 dosya)  - React Context'ler
├── hooks/            (3 dosya)  - Custom Hooks
├── lib/              (2 dosya)  - Yardımcı kütüphaneler
├── context/          (2 dosya)  - Ek context'ler (TabContext, SidebarContext)
├── utils/            (2 dosya)  - Utility fonksiyonlar
├── Sayfalar (14 sayfa): about, admin, community, contact, explore, instagram, login, post, search, services, settings, write-for-wim, x
└── Root dosyalar: layout.js, page.js, globals.css, error.jsx, not-found.jsx
```

---

## 🗺️ İNCELEME FAZLARI

### **FAZ 1: Temel Altyapı İncelemesi** (Öncelik: Kritik)
Dosyalar:
- [ ] `app/layout.js` - Root layout, font, provider yapısı
- [ ] `app/globals.css` - Tüm stil tanımları
- [ ] `app/lib/supabase.js` - Veritabanı bağlantısı
- [ ] `app/lib/markdown.js` - Markdown işleme

Kontrol Edilecekler:
- Font yükleme ve uygulama tutarlılığı
- CSS değişken tanımları ve kullanımı
- Supabase bağlantı güvenliği
- Markdown temizleme fonksiyonlarının güvenilirliği

---

### **FAZ 2: Context ve State Yönetimi** (Öncelik: Yüksek)
Dosyalar:
- [ ] `app/contexts/AuthContext.jsx` - Kimlik doğrulama
- [ ] `app/contexts/WindowContext.jsx` - Pencere yönetimi
- [ ] `app/contexts/ToastContext.jsx` - Bildirim sistemi
- [ ] `app/contexts/ThemeContext.jsx` - Tema yönetimi
- [ ] `app/context/TabContext.js` - Sekme yönetimi
- [ ] `app/context/SidebarContext.js` - Sidebar durumu

Kontrol Edilecekler:
- Memory leaks (useEffect cleanup)
- Provider hiyerarşisi doğruluğu
- State güncellemelerinin optimizasyonu
- LocalStorage senkronizasyonu

---

### **FAZ 3: Custom Hooks** (Öncelik: Yüksek)
Dosyalar:
- [ ] `app/hooks/usePosts.js` - Post veri çekme
- [ ] `app/hooks/useAdminData.js` - Admin veri işlemleri
- [ ] `app/hooks/useCommunity.js` - Topluluk özellikleri

Kontrol Edilecekler:
- API çağrılarında error handling
- Loading state yönetimi
- Verilerin normalize edilmesi
- Gereksiz re-render önleme (useCallback, useMemo)

---

### **FAZ 4: Pencere Sistemi Bileşenleri** (Öncelik: Yüksek)
Dosyalar:
- [ ] `app/components/Window.jsx` - Ana pencere bileşeni
- [ ] `app/components/WindowIcons.jsx` - Pencere kontrol ikonları
- [ ] `app/components/HomeWindow.jsx` - Ana sayfa penceresi
- [ ] `app/components/BlogWindow.jsx` - Blog detay penceresi
- [ ] `app/components/PageWindow.jsx` - Genel sayfa penceresi
- [ ] `app/components/HomeWindowToolbar.jsx` - Ana sayfa araç çubuğu
- [ ] `app/components/BlogWindowToolbar.jsx` - Blog araç çubuğu

Kontrol Edilecekler:
- Drag & resize fonksiyonelliği
- Pencere state senkronizasyonu
- Z-index yönetimi
- Mobile uyumluluk
- Performans (throttle/debounce)

---

### **FAZ 5: Dashboard ve Kart Bileşenleri** (Öncelik: Orta)
Dosyalar:
- [ ] `app/components/Dashboard.jsx` - Ana dashboard
- [ ] `app/components/DashboardGrid.jsx` - Kart grid'i
- [ ] `app/components/DashboardHeader.jsx` - Üst başlık/sekmeler
- [ ] `app/components/InsightCard.jsx` - Post kartı
- [ ] `app/components/Card.css` - Kart stilleri
- [ ] `app/components/Skeleton.jsx` - Yükleme iskeletleri

Kontrol Edilecekler:
- Responsive tasarım
- Kart içerik tutarlılığı
- Lazy loading implementasyonu
- Erişilebilirlik (a11y)

---

### **FAZ 6: Navigasyon Bileşenleri** (Öncelik: Orta)
Dosyalar:
- [ ] `app/components/Sidebar.jsx` - Yan menü
- [ ] `app/components/SidebarIcons.jsx` - Sidebar ikonları
- [ ] `app/components/Icons.jsx` - Genel ikonlar

Kontrol Edilecekler:
- Aktif sayfa gösterimi
- Icon tutarlılığı
- Mobil menü davranışı
- Transition animasyonları

---

### **FAZ 7: Etkileşim Bileşenleri** (Öncelik: Orta)
Dosyalar:
- [ ] `app/components/CommentSection.jsx` - Yorum sistemi
- [ ] `app/components/VoteControl.jsx` - Oylama sistemi
- [ ] `app/components/NewPostToggler.jsx` - Yeni post oluşturma
- [ ] `app/components/ShareButtons.jsx` - Paylaşım butonları
- [ ] `app/components/Toast.jsx` - Bildirim bileşeni

Kontrol Edilecekler:
- Form validation
- Optimistic updates
- Error states
- Loading indicators

---

### **FAZ 8: Utility Bileşenler** (Öncelik: Düşük)
Dosyalar:
- [ ] `app/components/UserAvatar.jsx` - Kullanıcı avatarı
- [ ] `app/components/Button3D.jsx` - 3D buton
- [ ] `app/components/GenericPage.jsx` - Genel sayfa şablonu
- [ ] `app/utils/*` - Yardımcı fonksiyonlar

Kontrol Edilecekler:
- Prop validation
- Default değerler
- Reusability

---

### **FAZ 9: Sayfa Bileşenleri** (Öncelik: Orta)
Sayfalar:
- [ ] `app/page.js` - Ana sayfa
- [ ] `app/post/` - Blog detay
- [ ] `app/admin/` - Admin paneli
- [ ] `app/login/` - Giriş sayfası
- [ ] `app/search/` - Arama sayfası
- [ ] `app/community/` - Topluluk
- [ ] `app/explore/` - Keşfet
- [ ] `app/settings/` - Ayarlar
- [ ] Diğer sayfalar (about, contact, services, write-for-wim, instagram, x)

Kontrol Edilecekler:
- SEO meta tags
- Page loading states
- Error boundaries
- Route protection (auth)

---

### **FAZ 10: Hata Yönetimi ve Test** (Öncelik: Yüksek)
Dosyalar:
- [ ] `app/error.jsx` - Hata sayfası
- [ ] `app/global-error.jsx` - Global hata
- [ ] `app/not-found.jsx` - 404 sayfası

Kontrol Edilecekler:
- Error boundary implementasyonu
- User-friendly hata mesajları
- Retry mekanizmaları

---

## 📋 ORTAK KONTROL LİSTESİ

Her dosya için kontrol edilecek maddeler:

### Kod Kalitesi
- [ ] ESLint/TypeScript hataları yok
- [ ] Unused imports temizlenmiş
- [ ] Console.log'lar kaldırılmış
- [ ] Hardcoded değerler константlara çıkarılmış

### Performans
- [ ] Gereksiz re-render yok
- [ ] useCallback/useMemo doğru kullanılmış
- [ ] Image optimization yapılmış
- [ ] Bundle size optimize edilmiş

### Güvenlik
- [ ] XSS koruması var
- [ ] API anahtarları expose edilmemiş
- [ ] Input sanitization yapılmış
- [ ] Auth kontrolleri yerinde

### Erişilebilirlik (a11y)
- [ ] Semantic HTML kullanılmış
- [ ] ARIA labels eklenmiş
- [ ] Keyboard navigation çalışıyor
- [ ] Focus management yapılmış

### Stil Tutarlılığı
- [ ] PostHog tasarım sistemi takip ediliyor
- [ ] CSS değişkenleri tutarlı kullanılmış
- [ ] Responsive breakpoint'ler doğru
- [ ] Animasyonlar pürüzsüz

---

## 🚀 UYGULAMA SIRASI

1. **Bugün**: FAZ 1 (Temel Altyapı) - layout.js, supabase.js, markdown.js
2. **Sonra**: FAZ 2-3 (Contexts & Hooks) - Kritik state yönetimi
3. **Sonra**: FAZ 4 (Pencere Sistemi) - Core UI işlevselliği
4. **Sonra**: FAZ 5-6 (Dashboard & Navigation)
5. **Sonra**: FAZ 7-8 (Etkileşim & Utility)
6. **Son**: FAZ 9-10 (Sayfalar & Hata Yönetimi)

---

## 📝 İLERLEME KAYDI

| Faz | Durum | Tamamlanma | Notlar |
|-----|-------|------------|--------|
| FAZ 1 | ⏳ Bekliyor | 0% | |
| FAZ 2 | ⏳ Bekliyor | 0% | |
| FAZ 3 | ⏳ Bekliyor | 0% | |
| FAZ 4 | ⏳ Bekliyor | 0% | |
| FAZ 5 | ⏳ Bekliyor | 0% | |
| FAZ 6 | ⏳ Bekliyor | 0% | |
| FAZ 7 | ⏳ Bekliyor | 0% | |
| FAZ 8 | ⏳ Bekliyor | 0% | |
| FAZ 9 | ⏳ Bekliyor | 0% | |
| FAZ 10 | ⏳ Bekliyor | 0% | |

---

*Bu plan, projenin sistematik olarak incelenmesi ve iyileştirilmesi için oluşturulmuştur.*
*Her faz tamamlandığında bu dosya güncellenecektir.*
