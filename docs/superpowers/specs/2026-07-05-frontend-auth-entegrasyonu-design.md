# Frontend Auth Entegrasyonu — Tasarım Dokümanı

**Tarih:** 2026-07-05
**Kapsam:** `reactfrontend/project_2` (React 19 + Vite + TS) frontend'ini, kimlik doğrulama eklenmiş yeni backend'e (`spring_boot/project_1/expense-tracker`) uyumlu hale getirmek.

## Problem

Backend'e komple JWT tabanlı kimlik doğrulama eklendi. Artık `/api/expenses/**` uçları
`authenticated()` gerektiriyor. Mevcut frontend düz `fetch` ile, hiçbir `Authorization`
başlığı olmadan istek atıyor → **her istek 401 döner, uygulama tamamen kırık.**

Frontend'te şu an yok: login/register ekranı, token yönetimi, auth state.

## Hedef

Frontend'e bir auth katmanı ekleyerek uygulamayı yeniden çalışır hale getirmek:
kullanıcı giriş/kayıt yapabilsin, token'lar yönetilsin, korumalı harcama uçları çalışsın.

## Backend API Sözleşmesi (referans)

Auth uçları (`/api/auth/**`, herkese açık):
- `POST /api/auth/register` — body `{username, password}` → `201` (body yok)
- `POST /api/auth/login` — body `{username, password}` → `200 {accessToken}` + httpOnly `refreshToken` cookie (path `/api/auth`)
- `POST /api/auth/refresh` — `refreshToken` cookie'sinden okur → `200 {accessToken}` (cookie rotate edilir)
- `POST /api/auth/logout` — cookie'yi temizler → `204`

Harcama uçları (`/api/expenses/**`, `Authorization: Bearer <accessToken>` gerekir):
- `POST /` , `GET /` , `GET /page` , `GET /{id}` , `PUT /{id}` , `DELETE /{id}`,
  `GET /range` , `GET /summary/last-30-days` , `GET /summary/by-category` — endpoint imzaları **değişmedi**, sadece artık auth istiyor.
- `ExpenseResponseDto` artık audit alanları da içeriyor: `createdBy, createdDate, lastModifiedBy, lastModifiedDate`.

Token ömürleri: access token 15 dk, refresh token 7 gün. Seed kullanıcı: `demo` / `demo1234`.

## Kararlar

- **Oturum stratejisi:** Access token **localStorage**'da tutulur (sayfa yenilense de oturum kalır).
  Bir istek 401 dönerse otomatik `/api/auth/refresh` ile yenilenir ve istek bir kez tekrar denenir.
- **Auth UI:** Tam akış — Login + Register + Logout.

## Mimari (dosya bazlı)

### Yeni dosyalar
- `src/types/auth.ts` — `Credentials {username, password}`, `AuthResponse {accessToken}`.
- `src/auth/tokenStore.ts` — access token'ı localStorage'da tutan ince katman:
  `getAccessToken()`, `setAccessToken(t|null)`, `clear()`.
- `src/api/authApi.ts` — `register`, `login`, `refresh`, `logout`. Auth çağrıları `credentials:'include'`
  kullanır (refresh cookie'sinin set/gönderilmesi için).
- `src/api/httpClient.ts` — ortak `request<T>()`:
  1. `tokenStore`'dan token'ı okuyup `Authorization: Bearer` ekler.
  2. Yanıt 401 ise: tek bir refresh dener (eşzamanlı 401'ler tek promise'i paylaşır — token rotate
     edildiği için race guard şart), yeni token'ı saklar, orijinal isteği **bir kez** tekrar dener.
  3. Refresh başarısızsa: token temizlenir + `auth:expired` window event'i yayınlanır → UI login'e döner.
- `src/auth/AuthContext.tsx` — auth state provider: `isAuthenticated`, `login()`, `register()`, `logout()`.
  Token'ı state + `tokenStore` üzerinden yönetir; `auth:expired` event'ini dinler.
- `src/components/AuthPage.tsx` — tek ekranda Login/Register formu (aralarında geçiş).

### Değişecek dosyalar
- `src/api/expenseApi.ts` — tüm `fetch` çağrıları yeni `request()` üzerinden geçer.
- `src/types/expense.ts` — `Expense`'e opsiyonel audit alanları eklenir (tipte var, ekranda gösterilmez).
- `src/App.tsx` — auth guard: giriş yoksa `AuthPage`, varsa mevcut uygulama + üstte **Çıkış** butonu.
- `src/main.tsx` — kök `<AuthProvider>` ile sarmalanır.

### Backend değişiklikleri (ayrı repo, `audit-branch`)
- `config/CorsConfig.java` — `.allowCredentials(true)` eklenir (cookie'li auth isteklerinin
  cross-origin çalışması için zorunlu).
- `controller/AuthController.java` — refresh cookie `SameSite` değeri ortam bazlı olur:
  `cookieSecure ? "None" : "Strict"` (production cross-domain'de cookie gidebilsin diye).

## Veri Akışı

- **Login:** `authApi.login` → `{accessToken}` + cookie. Token state + localStorage'a yazılır → uygulama açılır.
- **Register:** `authApi.register` → başarılıysa aynı bilgilerle otomatik `login`.
- **İstek + 401 refresh:** harcama isteği 401 → `httpClient` refresh → yeni token → istek tekrar → başarı.
  Refresh de başarısızsa → logout → Login ekranı.
- **Uygulama açılışı:** localStorage'da token varsa uygulama gösterilir; ilk istek 401 verirse
  refresh akışı kendini onarır, olmazsa login'e düşer.
- **Logout:** `authApi.logout` (cookie temizlenir) + localStorage temizlenir → Login ekranı.

## Hata Yönetimi

- Mevcut `ApiError` (message + fieldErrors) korunur; auth formları alan hatalarını/401 mesajlarını gösterir.
- 401 → refresh → retry başarısız olursa tek noktada logout tetiklenir (`auth:expired`).
- Kayıt çakışması (409 `UsernameAlreadyExists`) kullanıcıya anlaşılır mesajla gösterilir.

## Kapsam Dışı (YAGNI)

- Kullanılmayan `src/environments/` dosyaları (bu iş kapsamında dokunulmaz).
- Audit alanlarının ekranda gösterimi (tipe eklenir, UI yok).
- Şifre güçlülük kuralları (backend de talep etmiyor).
- react-router (tek sayfalık koşullu render yeterli).

## Test

Backend local (`localhost:8080`) + frontend dev (`localhost:5173`) ayakta iken:
1. `demo` / `demo1234` ile login → harcamalar yükleniyor mu?
2. Yeni kullanıcı register → otomatik login → boş liste geliyor mu?
3. Harcama ekle / düzenle / sil / tarih filtresi / özet kartları çalışıyor mu?
4. Access token süresi dolunca (veya elle localStorage'daki token bozulunca) 401 → sessiz refresh → istek başarılı mı?
5. Logout → login ekranına dönüş; token localStorage'dan silinmiş mi?
