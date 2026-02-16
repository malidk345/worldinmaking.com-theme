# Güvenlik Düzeltmeleri Hızlı Başlangıç Kılavuzu
# Security Fixes Quick Start Guide

Bu kılavuz, tespit edilen güvenlik sorunlarının nasıl düzeltileceğini adım adım açıklar.

This guide explains step-by-step how to fix the identified security issues.

---

## 🚨 ACİL DÜZELTMELER (24 Saat İçinde) / URGENT FIXES (Within 24 Hours)

### 1. Next.js Güncelleme / Update Next.js

**Sorun:** Next.js 15.1.7 içinde 30+ bilinen güvenlik açığı var (RCE, DoS, Authorization Bypass)

**Problem:** Next.js 15.1.7 contains 30+ known vulnerabilities (RCE, DoS, Authorization Bypass)

```bash
# Terminal'de çalıştır / Run in terminal
npm install next@latest

# Versiyonu kontrol et / Check version
npm list next
# Minimum 15.5.12 olmalı / Should be at least 15.5.12
```

**Test et / Test:**
```bash
npm run build
npm run dev
```

---

### 2. XSS Zafiyetlerini Düzelt / Fix XSS Vulnerabilities

**Sorun:** 3 yerde `dangerouslySetInnerHTML` sanitizasyon olmadan kullanılıyor

**Problem:** `dangerouslySetInnerHTML` used without sanitization in 3 places

#### Adım 1: DOMPurify Yükle / Step 1: Install DOMPurify

```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

#### Adım 2: ForumMarkdown.tsx Düzelt / Step 2: Fix ForumMarkdown.tsx

**Dosya:** `components/Forum/ForumMarkdown.tsx`

```tsx
// Dosyanın başına ekle / Add to top of file
import DOMPurify from 'isomorphic-dompurify';

// 31-37 satırları değiştir / Replace lines 31-37
if (isHtml) {
    const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 
                       'h1', 'h2', 'h3', 'h4', 'code', 'pre', 'blockquote', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id'],
        ALLOW_DATA_ATTR: false,
    });
    
    return (
        <div
            className={`markdown prose dark:prose-invert prose-sm max-w-full text-primary [&_a]:font-semibold break-words [overflow-wrap:anywhere] ${className}`}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
    )
}
```

#### Adım 3: BlogPostView.tsx Düzelt / Step 3: Fix BlogPostView.tsx

**Dosya:** `components/ReaderView/BlogPostView.tsx`

```tsx
// Dosyanın başına ekle / Add to top of file
import DOMPurify from 'isomorphic-dompurify';

// 65-78 satırları değiştir / Replace lines 65-78
const processedContent = useMemo(() => {
    if (!isHtml) return content;

    let html = content;
    // Find <h2>, <h3>, <h4> tags and add id attribute
    html = html.replace(/<h([1234])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, content) => {
        if (attrs.includes('id=')) return match;
        const text = content.replace(/<[^>]*>/g, '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
    });
    
    // Sanitize
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 
                       'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 
                       'blockquote', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id', 'width', 'height'],
        ALLOW_DATA_ATTR: false,
    });
}, [content, isHtml]);
```

#### Adım 4: ReaderView/index.tsx Düzelt / Step 4: Fix ReaderView/index.tsx

**Dosya:** `components/ReaderView/index.tsx`

Satır numarası bulun ve benzer şekilde DOMPurify ekleyin.

Find the line number and add DOMPurify similarly.

```tsx
import DOMPurify from 'isomorphic-dompurify';

// dangerouslySetInnerHTML kullanılan yerde / Where dangerouslySetInnerHTML is used
const sanitizedBody = DOMPurify.sanitize(body.content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 
                   'h1', 'h2', 'h3', 'h4', 'code', 'pre', 'blockquote', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id'],
});

<div dangerouslySetInnerHTML={{ __html: sanitizedBody }} />
```

#### Test Et / Test

```bash
npm run build
npm run dev
# Forum ve blog sayfalarını test et / Test forum and blog pages
```

---

### 3. Bağımlılık Güncellemeleri / Dependency Updates

```bash
# Tüm güvenlik açıklarını düzelt / Fix all vulnerabilities
npm audit fix --force

# Özel paketleri güncelle / Update specific packages
npm install react-instantsearch-hooks-web@latest
npm install esbuild@latest

# Tekrar kontrol et / Check again
npm audit
```

---

## 🟠 YÜKSEK ÖNCELİK (1 Hafta İçinde) / HIGH PRIORITY (Within 1 Week)

### 4. Backend Authentication Ekle / Add Backend Authentication

#### Adım 1: Middleware Dosyası Oluştur / Step 1: Create Middleware File

**Yeni Dosya:** `middleware.ts` (root dizinde / in root directory)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })
    
    const { data: { session } } = await supabase.auth.getSession()
    
    // Admin sayfaları koru / Protect admin pages
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
        
        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }
    
    return res
}

export const config = {
    matcher: ['/admin/:path*']
}
```

#### Adım 2: Supabase Helper Yükle / Step 2: Install Supabase Helper

```bash
npm install @supabase/auth-helpers-nextjs
```

#### Test Et / Test

```bash
npm run dev
# /admin sayfasına gitmeyi dene (admin olmadan) / Try to go to /admin (without being admin)
# Redirect edilmeli / Should redirect
```

---

### 5. Supabase RLS Policies Ekle / Add Supabase RLS Policies

#### Adım 1: Supabase Dashboard'a Git / Step 1: Go to Supabase Dashboard

1. https://app.supabase.com projenize gidin / Go to your project
2. SQL Editor'ü açın / Open SQL Editor
3. Aşağıdaki SQL'i çalıştırın / Run the following SQL

#### Adım 2: Posts Tablosu RLS / Step 2: Posts Table RLS

```sql
-- RLS'yi etkinleştir / Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Herkes published post'ları görebilir / Everyone can view published posts
CREATE POLICY "Anyone can view published posts" 
ON public.posts FOR SELECT 
USING (published = true OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

-- Sadece adminler post oluşturabilir / Only admins can create posts
CREATE POLICY "Only admins can create posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

-- Sadece adminler post güncelleyebilir / Only admins can update posts
CREATE POLICY "Only admins can update posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

-- Sadece adminler post silebilir / Only admins can delete posts
CREATE POLICY "Only admins can delete posts" 
ON public.posts FOR DELETE 
USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));
```

#### Adım 3: Community Posts RLS / Step 3: Community Posts RLS

```sql
-- community_posts için RLS / RLS for community_posts
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Herkes görebilir / Everyone can view
CREATE POLICY "Anyone can view community posts" 
ON public.community_posts FOR SELECT 
USING (true);

-- Giriş yapanlar post oluşturabilir / Authenticated users can create
CREATE POLICY "Authenticated users can create posts" 
ON public.community_posts FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- Kendi postlarını güncelleyebilir / Users can update their own posts
CREATE POLICY "Users can update their own posts" 
ON public.community_posts FOR UPDATE 
USING (auth.uid() = author_id);

-- Kendi postlarını silebilir veya admin / Users can delete own posts or admin
CREATE POLICY "Users can delete their own posts or admin can delete" 
ON public.community_posts FOR DELETE 
USING (
    auth.uid() = author_id OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
```

#### Test Et / Test

```bash
# Supabase Studio'da test et / Test in Supabase Studio
# Table Editor'dan post eklemeyi/silmeyi dene / Try to add/delete posts from Table Editor
# Admin olmadan işlem yapamayacaksın / You shouldn't be able to operate without being admin
```

---

### 6. Input Validation ve Sanitization Güçlendir / Strengthen Input Validation

#### Adım 1: Zod Yükle / Step 1: Install Zod

```bash
npm install zod
```

#### Adım 2: Validation Schemas Oluştur / Step 2: Create Validation Schemas

**Yeni Dosya:** `lib/validations.ts`

```typescript
import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// Post validation
export const postSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must be less than 200 characters'),
    content: z.string()
        .min(10, 'Content must be at least 10 characters'),
    slug: z.string()
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    published: z.boolean(),
    category: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal('')),
});

// Profile validation
export const profileUpdateSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be less than 30 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    github: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    twitter: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
});

// Comment validation
export const commentSchema = z.object({
    content: z.string()
        .min(1, 'Comment cannot be empty')
        .max(5000, 'Comment must be less than 5000 characters'),
});
```

#### Adım 3: Validation Kullan / Step 3: Use Validation

**Örnek: AdminPanel'de kullanım / Example: Usage in AdminPanel**

```typescript
// hooks/useAdminData.ts içinde / In hooks/useAdminData.ts
import { postSchema } from '../lib/validations';

const createPost = async (post: Partial<AdminPost>) => {
    // Validate
    try {
        postSchema.parse(post);
    } catch (error) {
        if (error instanceof z.ZodError) {
            addToast(`Validation error: ${error.errors[0].message}`, 'error');
            return false;
        }
    }
    
    // Continue with creation...
};
```

---

## 🟡 ORTA ÖNCELİK (2 Hafta İçinde) / MEDIUM PRIORITY (Within 2 Weeks)

### 7. Security Headers Ekle / Add Security Headers

**Dosya:** `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    trailingSlash: true,
    poweredByHeader: false,
    
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.in',
            },
        ],
    },
    
    // TypeScript ve ESLint'i aktif et / Enable TypeScript and ESLint
    typescript: {
        ignoreBuildErrors: false,  // ✅ Değişti / Changed
    },
    eslint: {
        ignoreDuringBuilds: false,  // ✅ Değişti / Changed
    },
    
    // Güvenlik başlıkları ekle / Add security headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: `
                            default-src 'self';
                            script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supabase.co;
                            style-src 'self' 'unsafe-inline';
                            img-src 'self' data: https: *.supabase.co;
                            font-src 'self' data:;
                            connect-src 'self' *.supabase.co *.algolia.net;
                            frame-ancestors 'none';
                            base-uri 'self';
                            form-action 'self';
                        `.replace(/\s{2,}/g, ' ').trim(),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
```

**Test Et / Test:**

```bash
npm run build
npm run dev

# Tarayıcı DevTools > Network > Headers kontrol et
# Check Browser DevTools > Network > Headers
```

---

### 8. Rate Limiting Ekle / Add Rate Limiting

#### Adım 1: Upstash Redis Kurulumu / Step 1: Upstash Redis Setup

1. https://upstash.com 'a git / Go to https://upstash.com
2. Yeni bir Redis database oluştur / Create a new Redis database
3. Environment variables'ı kopyala / Copy environment variables

#### Adım 2: Paketleri Yükle / Step 2: Install Packages

```bash
npm install @upstash/ratelimit @upstash/redis
```

#### Adım 3: Environment Variables Ekle / Step 3: Add Environment Variables

**.env.local:**

```bash
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

#### Adım 4: Rate Limit Library Oluştur / Step 4: Create Rate Limit Library

**Yeni Dosya:** `lib/ratelimit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiter for general requests
export const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
    analytics: true,
    prefix: '@ratelimit',
})

// Rate limiter for authentication
export const authRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
    prefix: '@auth-ratelimit',
})
```

#### Adım 5: Middleware'e Ekle / Step 5: Add to Middleware

```typescript
// middleware.ts içine ekle / Add to middleware.ts
import { ratelimit } from './lib/ratelimit'

export async function middleware(request: NextRequest) {
    // Rate limiting
    const ip = request.ip ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
        return new Response('Too Many Requests', { 
            status: 429,
            headers: {
                'Content-Type': 'application/json',
            }
        })
    }
    
    // Rest of middleware...
}
```

---

### 9. Logging İyileştirmeleri / Logging Improvements

**Dosya:** `context/AuthContext.tsx`

```typescript
// Email'leri maskele / Mask emails
const maskEmail = (email: string) => {
    if (!email || typeof email !== 'string') return '***';
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    return `${name[0]}***@${domain}`;
};

// Kullanım / Usage
logger.log('[Auth] PKCE exchange success for user:', maskEmail(data.session.user.email));
logger.log('[Auth] Session found for user:', maskEmail(session.user.email));
logger.log('[Auth] Auth state changed:', event, session?.user?.email ? maskEmail(session.user.email) : 'no user');
```

---

## 🟢 UZUN VADELİ İYİLEŞTİRMELER / LONG-TERM IMPROVEMENTS (1-3 Months)

### 10. Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 11. Automated Security Testing

**Yeni Dosya:** `.github/workflows/security.yml`

```yaml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run lint
      - run: npm run type-check
```

---

## ✅ Doğrulama ve Test / Verification and Testing

### Her Düzeltmeden Sonra / After Each Fix

```bash
# Build kontrolü / Build check
npm run build

# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Test (varsa / if available)
npm test

# Development'ta test / Test in development
npm run dev
```

### Manuel Test Senaryoları / Manual Test Scenarios

1. **XSS Testi / XSS Test**
   - Forum'da HTML içeren bir mesaj gönder / Post a message with HTML in forum
   - `<script>alert('xss')</script>` gibi kod dene / Try code like
   - Kod çalışmamalı / Code should not execute

2. **Admin Authorization Testi / Admin Authorization Test**
   - Admin olmayan hesapla giriş yap / Login with non-admin account
   - `/admin` URL'ine git / Go to `/admin` URL
   - Redirect edilmeli / Should redirect

3. **Rate Limiting Testi / Rate Limiting Test**
   - Aynı endpoint'e hızlıca çok istek gönder / Send many requests quickly to same endpoint
   - 429 hatası almalısın / Should get 429 error

---

## 📝 Dökümanlar / Documents

Düzeltmeler tamamlandıkça bu dosyaları güncelle / Update these files as fixes are completed:

- [ ] `SECURITY_REPORT.md` - Durum güncellemeleri / Status updates
- [ ] `SECURITY_CHECKLIST.md` - Tamamlanan maddeler / Completed items
- [ ] `README.md` - Güvenlik notları ekle / Add security notes
- [ ] `.env.example` - Yeni environment variables

---

## 🆘 Yardım / Help

Sorularınız olursa / If you have questions:

1. SECURITY_REPORT.md dosyasını kontrol edin / Check SECURITY_REPORT.md
2. SECURITY_CHECKLIST.md'ye bakın / Look at SECURITY_CHECKLIST.md
3. Supabase documentation: https://supabase.com/docs
4. Next.js security documentation: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy

---

**Başarılar! / Good luck!** 🚀

**Son Güncelleme / Last Updated:** 16 Şubat 2026 / February 16, 2026
