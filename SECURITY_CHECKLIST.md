# Güvenlik Kontrol Listesi / Security Checklist
# worldinmaking.com-theme

Bu dosya, proje için güvenlik standartlarını ve kontrol edilmesi gereken maddeleri içerir.

This file contains security standards and items to be checked for the project.

---

## ✅ Hızlı Güvenlik Kontrol / Quick Security Check

Yeni bir özellik eklemeden önce bu listeyi kontrol edin:

Check this list before adding a new feature:

- [ ] Input validation yapıldı mı? / Input validation done?
- [ ] XSS'e karşı korunuyor mu? / Protected against XSS?
- [ ] Authentication/Authorization kontrolleri var mı? / Auth checks in place?
- [ ] Rate limiting gerekli mi? / Rate limiting needed?
- [ ] Hassas veri loglanmıyor mu? / No sensitive data logged?
- [ ] HTTPS üzerinden mi çalışıyor? / Running over HTTPS?
- [ ] Dependencies güncel mi? / Dependencies up to date?

---

## 🔐 Kimlik Doğrulama / Authentication

### ✅ Yapılması Gerekenler / Must Do

- [x] Supabase Auth kullanımı / Using Supabase Auth
- [x] PKCE flow implementasyonu / PKCE flow implementation
- [x] Session yönetimi / Session management
- [ ] Rate limiting (login attempts)
- [ ] MFA/2FA desteği / MFA/2FA support
- [ ] Password strength validation
- [ ] Account lockout mechanism

### ⚠️ Kontrol Edilmesi Gerekenler / Should Check

- [ ] Session timeout ayarları / Session timeout settings
- [ ] Refresh token rotation
- [ ] Remember me functionality (güvenli mi? / secure?)
- [ ] Password reset flow (güvenli mi? / secure?)

---

## 🛡️ Yetkilendirme / Authorization

### ✅ Yapılması Gerekenler / Must Do

- [ ] Backend authorization checks (middleware)
- [x] Supabase RLS policies
- [ ] Admin panel backend validation
- [ ] API route protection
- [ ] Resource-based access control

### ⚠️ Mevcut Sorunlar / Current Issues

- [x] **KRİTİK:** Admin kontrolü sadece client-side
- [x] **CRITICAL:** Admin check is client-side only
- [ ] Bazı tablolarda RLS eksik / Missing RLS on some tables
- [ ] API endpoints authentication check yok / No API auth check

---

## 🔒 Veri Güvenliği / Data Security

### ✅ Yapılması Gerekenler / Must Do

- [ ] Input sanitization (all user inputs)
- [ ] Output encoding (XSS prevention)
- [ ] SQL injection prevention (Supabase handles this)
- [ ] File upload validation
- [ ] Data encryption at rest (Supabase handles this)
- [ ] Data encryption in transit (HTTPS)

### ⚠️ Mevcut Sorunlar / Current Issues

- [x] **KRİTİK:** dangerouslySetInnerHTML 3 yerde kullanılıyor
- [x] **CRITICAL:** dangerouslySetInnerHTML used in 3 places
- [ ] sanitizeString fonksiyonu yeterli değil / function insufficient
- [ ] HTML content sanitization eksik / HTML sanitization missing

### 🔧 Düzeltme Planı / Fix Plan

```typescript
// 1. DOMPurify yükle / Install DOMPurify
npm install isomorphic-dompurify

// 2. Sanitize et / Sanitize
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(dirty);
```

---

## 🌐 Network Güvenliği / Network Security

### ✅ Yapılması Gerekenler / Must Do

- [x] HTTPS enforcement
- [ ] CORS configuration
- [ ] CSP (Content Security Policy) headers
- [ ] Security headers (X-Frame-Options, etc.)
- [ ] Rate limiting
- [ ] DDoS protection (Vercel/Cloudflare)

### ⚠️ Mevcut Sorunlar / Current Issues

- [x] CSP header yok / No CSP header
- [x] Security headers eksik / Missing security headers
- [x] Rate limiting yok / No rate limiting
- [x] CORS configuration belirsiz / CORS config unclear

---

## 📦 Bağımlılık Güvenliği / Dependency Security

### ✅ Düzenli Kontroller / Regular Checks

```bash
# Her hafta çalıştır / Run weekly
npm audit
npm outdated

# Güvenlik güncellemeleri / Security updates
npm audit fix
npm audit fix --force  # (dikkatli kullan / use carefully)
```

### ⚠️ Mevcut Durum / Current Status

- [x] **KRİTİK:** Next.js 15.1.7 (30+ zafiyet / 30+ vulnerabilities)
- [x] **YÜKSEK:** qs paketi (DoS riski / DoS risk)
- [x] esbuild (SSRF riski / SSRF risk)
- [x] undici (DoS riski / DoS risk)

### 🔧 Acil Güncellemeler / Urgent Updates

```bash
npm install next@latest  # 15.5.12+
npm install react-instantsearch-hooks-web@latest
npm audit fix --force
```

---

## 🔨 Kod Güvenliği / Code Security

### ✅ Yapılması Gerekenler / Must Do

- [ ] No eval() or Function() constructor
- [ ] No inline event handlers (onclick, etc.)
- [ ] Proper error handling (no sensitive info in errors)
- [ ] Secure randomness (crypto.randomBytes, not Math.random)
- [ ] Input validation (zod, yup, joi)
- [ ] TypeScript strict mode

### ⚠️ Mevcut Sorunlar / Current Issues

- [x] **YÜKSEK:** TypeScript errors ignore ediliyor
- [x] **HIGH:** TypeScript errors are ignored
- [x] ESLint errors ignore ediliyor / ESLint errors ignored

```typescript
// next.config.ts - Düzelt / Fix
typescript: {
    ignoreBuildErrors: false,  // ✅
},
eslint: {
    ignoreDuringBuilds: false,  // ✅
},
```

---

## 🔑 Secrets Yönetimi / Secrets Management

### ✅ Yapılması Gerekenler / Must Do

- [x] .env dosyaları .gitignore'da / .env files in .gitignore
- [ ] .env.example dosyası mevcut / .env.example exists
- [ ] Secrets asla kod içinde / Never hardcode secrets
- [ ] Environment variable validation
- [ ] Secrets rotation policy

### ⚠️ Kontrol Edilmesi Gerekenler / Should Check

```bash
# Git history'de secret var mı? / Secrets in git history?
git log --all --full-history -- .env

# Hardcoded secrets taraması / Scan for hardcoded secrets
grep -r "api[_-]?key\|secret\|password" --include="*.ts" --include="*.tsx"
```

---

## 📝 Logging ve Monitoring / Logging and Monitoring

### ✅ Yapılması Gerekenler / Must Do

- [x] Production'da debug logs kapalı / Debug logs off in production
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Security event logging
- [ ] Audit logging (admin actions)
- [ ] Sensitive data masking

### ⚠️ Mevcut Sorunlar / Current Issues

- [x] Email adresleri loglanıyor / Email addresses logged
- [ ] Error messages çok detaylı / Error messages too detailed

### 🔧 Düzeltme / Fix

```typescript
// Hassas veriyi maskele / Mask sensitive data
const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    return `${name[0]}***@${domain}`;
};
```

---

## 🧪 Test ve Deployment / Testing and Deployment

### ✅ Yapılması Gerekenler / Must Do

- [ ] Security testing (pre-deployment)
- [ ] Dependency audit (pre-deployment)
- [ ] HTTPS enforcement
- [ ] Security headers verification
- [ ] Backup strategy
- [ ] Incident response plan

### 🔧 CI/CD Pipeline

```yaml
# .github/workflows/security.yml (örnek / example)
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
      - run: npm run lint
      - run: npm run type-check
```

---

## 🚨 Güvenlik Olay Müdahale Planı / Incident Response Plan

### 1. Tespit / Detection

- [ ] Anormal aktivite tespiti / Abnormal activity detection
- [ ] Security alert monitoring
- [ ] User reports

### 2. Müdahale / Response

1. **Acil Durum** / Emergency
   - Sistemi kapatma yetkisi kimde? / Who can shut down?
   - Yedekleme prosedürü / Backup procedure
   - İletişim planı / Communication plan

2. **Analiz** / Analysis
   - Log incelemesi / Log review
   - Zarar değerlendirmesi / Damage assessment
   - Kök neden analizi / Root cause analysis

3. **İyileştirme** / Recovery
   - Güvenlik yaması / Security patch
   - Sistem restore
   - Monitoring artışı / Increased monitoring

4. **Dokümantasyon** / Documentation
   - Olay raporu / Incident report
   - Lessons learned
   - Prosedür güncelleme / Procedure update

---

## 📋 Düzenli Güvenlik Takvimi / Regular Security Calendar

### Günlük / Daily
- [ ] Automated security scans
- [ ] Log monitoring

### Haftalık / Weekly
- [ ] npm audit
- [ ] Dependency updates review
- [ ] Security patch review

### Aylık / Monthly
- [ ] Manual code review
- [ ] Access control audit
- [ ] Backup verification

### 3 Ayda Bir / Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Security training
- [ ] Policy review

### Yıllık / Yearly
- [ ] Third-party security audit
- [ ] Disaster recovery test
- [ ] Compliance review

---

## 🎯 Güvenlik Hedefleri / Security Goals

### Kısa Vade (1 Ay) / Short Term (1 Month)

- [ ] Tüm kritik zafiyetleri düzelt / Fix all critical vulnerabilities
- [ ] Security headers ekle / Add security headers
- [ ] Rate limiting implement et / Implement rate limiting
- [ ] Input validation tamamla / Complete input validation

### Orta Vade (3 Ay) / Medium Term (3 Months)

- [ ] Automated security testing / Otomatik güvenlik testi
- [ ] Error tracking (Sentry) / Hata takibi
- [ ] Security monitoring dashboard
- [ ] Incident response plan

### Uzun Vade (6 Ay) / Long Term (6 Months)

- [ ] SOC 2 compliance
- [ ] Bug bounty program
- [ ] Regular penetration testing
- [ ] Security certifications

---

## 📞 Güvenlik İletişim / Security Contact

### Güvenlik Ekibi / Security Team

- **Email:** security@worldinmaking.com
- **Response Time:** 24 hours for critical issues
- **PGP Key:** [Key ID if available]

### Harici Kaynaklar / External Resources

- OWASP: https://owasp.org
- CVE Database: https://cve.mitre.org
- npm Security Advisories: https://github.com/advisories
- Supabase Security: https://supabase.com/docs/guides/platform/going-into-prod

---

## ✅ Pre-Deployment Checklist

Deployment öncesi mutlaka kontrol et / Must check before deployment:

```bash
# 1. Dependencies
npm audit
npm outdated

# 2. Code Quality
npm run lint
npm run type-check
npm run test

# 3. Build
npm run build

# 4. Environment
# - .env dosyası production'a kopyalanmadı mı? / .env not copied to prod?
# - Tüm environment variables set mi? / All env vars set?

# 5. Security
# - HTTPS enabled?
# - Security headers configured?
# - Rate limiting active?
# - Monitoring configured?
```

---

**Son Güncelleme / Last Updated:** 16 Şubat 2026 / February 16, 2026

**Not:** Bu checklist'i her önemli deployment öncesi kontrol edin.

**Note:** Check this checklist before every major deployment.
