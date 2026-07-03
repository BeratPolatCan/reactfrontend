# Gider Takip Uygulaması — Frontend Dökümantasyonu

Bu belge, `project_2` React uygulamasının mimarisini, dosya dosya sorumluluklarını,
veri akışını ve çalıştırma adımlarını ayrıntılı olarak açıklar.

---

## 1. Genel Bakış

**Ne yapar?** Kullanıcının kişisel giderlerini yönetmesini sağlayan tek sayfalık
(SPA) bir web arayüzüdür. Backend'de (Spring Boot) tutulan giderler üzerinde şu
işlemleri yapar:

- Gider **ekleme / düzenleme / silme** (CRUD)
- Giderleri **sayfalı** (pagination) ve **sıralı** (tutar / tarih) listeleme
- **Tarih aralığına göre** filtreleme
- **Son 30 gün** toplam ve günlük ortalama özeti
- **Kategori bazlı** harcama dağılımı (bar grafik)

Uygulama yalnızca **arayüz (frontend)** katmanıdır; tüm veriler REST API üzerinden
uzaktaki bir Spring Boot servisinden gelir/gider. Kalıcı depolama backend'dedir.

### Teknoloji Yığını

| Katman | Teknoloji | Sürüm |
|--------|-----------|-------|
| UI kütüphanesi | React | ^19.2 |
| Dil | TypeScript | ~6.0 |
| Derleyici / Dev sunucu | Vite | ^8.1 |
| Linter | ESLint + typescript-eslint | ^10 / ^8 |
| Stil | Saf CSS (CSS değişkenleri) | — |
| HTTP | Tarayıcı `fetch` API'si | — |

> Not: Proje **harici bir state yönetim kütüphanesi (Redux vb.) veya router
> kullanmaz.** Durum yönetimi tamamen React'in `useState` / `useEffect`
> kancalarıyla, tek bir `App` bileşeninde toplanmıştır.

---

## 2. Mimari ve Veri Akışı

Uygulama klasik bir **katmanlı frontend** yapısına sahiptir:

```
  Tarayıcı
     │
     ▼
  index.html  ──►  main.tsx  ──►  <App />           (giriş noktası)
                                     │
              ┌──────────────────────┼───────────────────────┐
              ▼                       ▼                        ▼
       DateRangeFilter          ExpenseForm              CategoryBreakdown
                                ExpenseList               SummaryCards
              │                       │                        │
              └───────────────────────┼────────────────────────┘
                                      ▼
                          api/expenseApi.ts   (HTTP katmanı, fetch)
                                      │
                                      ▼
                       Spring Boot REST API  (/api/expenses/...)
```

### 2.1. Merkezi "yenileme" deseni: `refreshKey`

Bileşenler arasında paylaşılan global bir veri deposu yoktur. Bunun yerine
[`App.tsx`](src/App.tsx) basit ama etkili bir **sinyal (invalidation) deseni**
kullanır:

- `App` içinde bir sayaç tutulur: `const [refreshKey, setRefreshKey] = useState(0)`.
- Bu sayaç, veri okuyan tüm bileşenlere (`ExpenseList`, `SummaryCards`,
  `CategoryBreakdown`, `DateRangeFilter`) **prop** olarak geçirilir.
- Bir yazma işlemi (ekle/güncelle/sil) tamamlandığında `refreshKey` **1 artırılır**.
- Okuyan bileşenlerin `useEffect` bağımlılık dizisinde `refreshKey` bulunduğundan,
  değer değişince **hepsi otomatik olarak veriyi yeniden çeker**.

Bu sayede "gider eklendiğinde özet kartları da güncellensin" gibi çapraz güncellemeler,
global state olmadan sağlanır. `refreshKey`'in kendisi bir veri değil, yalnızca
"veriler değişti, yeniden yükleyin" anlamına gelen bir tetikleyicidir.

---

## 3. Proje Yapısı

```
project_2/
├── index.html                  # HTML iskeleti, #root ve main.tsx script'i
├── package.json                # Bağımlılıklar ve npm script'leri
├── vite.config.ts              # Vite + React eklentisi yapılandırması
├── tsconfig*.json              # TypeScript derleme ayarları
├── eslint.config.js            # ESLint kuralları
└── src/
    ├── main.tsx                # React uygulamasının bağlanma (mount) noktası
    ├── App.tsx                 # Kök bileşen, layout ve refreshKey orkestrasyonu
    ├── index.css               # Global reset / temel stiller
    ├── App.css                 # Uygulamaya özel tüm bileşen stilleri
    ├── api/
    │   └── expenseApi.ts       # REST API çağrıları + ApiError sınıfı
    ├── types/
    │   └── expense.ts          # TypeScript tip tanımları (DTO'lar)
    ├── constants/
    │   └── categories.ts       # Kategori enum listesi + Türkçe etiketler
    ├── utils/
    │   └── format.ts           # Para formatlama yardımcısı (₺)
    ├── environments/
    │   ├── environment.ts       # (Kullanılmıyor — bkz. §8)
    │   └── environment.prod.ts  # (Kullanılmıyor — bkz. §8)
    └── components/
        ├── ExpenseForm.tsx         # Ekleme/düzenleme formu
        ├── ExpenseList.tsx         # Sayfalı & sıralı gider tablosu
        ├── SummaryCards.tsx        # Son 30 gün özet kartları
        ├── CategoryBreakdown.tsx   # Kategori dağılımı bar grafiği
        ├── DateRangeFilter.tsx     # Tarih aralığı filtresi
        ├── ExpenseListStyle.tsx    # ExpenseList için inline stil objesi
        └── CategoryBreakdownType.tsx # CategoryBreakdown için inline stil objesi
```

---

## 4. Giriş Noktaları

### `index.html`
Vite'ın servis ettiği tek HTML dosyası. İçinde React'in monte edileceği boş bir
`<div id="root">` ve modül olarak yüklenen `/src/main.tsx` script'i bulunur.

### [`src/main.tsx`](src/main.tsx)
React ağacını DOM'a bağlar:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `createRoot` — React 18+ eşzamanlı (concurrent) kök API'si.
- `StrictMode` — geliştirme sırasında olası hataları erkenden yakalamak için
  bileşenleri iki kez render eder (yalnızca dev ortamında). Bu yüzden dev modda
  `useEffect` içindeki API çağrılarının iki kez tetiklendiğini görebilirsiniz;
  bu **beklenen** davranıştır.
- `import './index.css'` ile global stiller yüklenir.

---

## 5. Kök Bileşen — [`App.tsx`](src/App.tsx)

Uygulamanın "beyni". İki parça state tutar:

| State | Tip | Görevi |
|-------|-----|--------|
| `refreshKey` | `number` | Tüm okuyan bileşenlere yeniden yükleme sinyali (§2.1) |
| `editingExpense` | `Expense \| null` | Şu an düzenlenen gider; `null` ise "yeni ekleme" modu |

**İki geri çağırma (callback) fonksiyonu:**

- `handleSaved()` — Bir kayıt başarıyla kaydedilince çağrılır. Düzenleme modundan
  çıkar (`setEditingExpense(null)`) ve `refreshKey`'i artırarak tüm listeleri tazeler.
- `handleRefreshNeeded()` — Sadece `refreshKey`'i artırır (form hatasında bile
  listelerin güncel kalması için kullanılır).

**Yerleşim (layout):** Üç sütunlu bir grid (`app-shell`):

```
┌──────────────┬────────────────────┬──────────────────┐
│ Sol kenar    │ Ana sütun          │ Sağ kenar        │
│ DateRange    │ ExpenseForm        │ CategoryBreakdown│
│ Filter       │ ExpenseList        │ SummaryCards     │
└──────────────┴────────────────────┴──────────────────┘
```

`ExpenseList`'in `onEdit` prop'una doğrudan `setEditingExpense` bağlanır; böylece
listedeki "Düzenle" butonuna basınca ilgili gider forma yüklenir.

---

## 6. Katman Katman Detaylar

### 6.1. Tip Tanımları — [`types/expense.ts`](src/types/expense.ts)

Backend ile frontend arasındaki sözleşmeyi (DTO) tanımlar:

- **`Category`** — 7 sabit değerden oluşan birleşim (union) tipi:
  `FOOD | TRANSPORT | BILLS | ENTERTAINMENT | HEALTH | SHOPPING | OTHER`.
  Bu değerler backend enum'u ile **birebir aynı** olmalıdır.
- **`Expense`** — Backend'den okunan tam gider kaydı (`id` dahil).
  `date` alanı `"yyyy-MM-dd"` string formatındadır (Java `LocalDate`'in JSON hali).
- **`ExpenseInput`** — Yazma (POST/PUT) için gönderilen gövde; `id` içermez.
- **`CategorySummary`** — `{ category, totalAmount }`, kategori dağılımı için.
- **`Last30DaysSummary`** — `{ totalAmount, dailyAverage }`, özet kartları için.
- **`ExpensePage`** — Sayfalama cevabı: `content`, `page`, `size`,
  `totalElements`, `totalPages`.

### 6.2. API Katmanı — [`api/expenseApi.ts`](src/api/expenseApi.ts)

Tüm HTTP iletişiminin toplandığı tek dosya. Bileşenler `fetch`'i doğrudan
çağırmaz; hep bu fonksiyonları kullanır.

**Temel URL:**
```ts
const PROD_API_ROOT = "https://springboot-production-7df8.up.railway.app";
const DEV_API_ROOT = "http://localhost:8080";
const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? PROD_API_ROOT : DEV_API_ROOT);
const API_BASE_URL = `${API_ROOT}/api/expenses`;
```
Kök adres şu öncelik sırasıyla belirlenir:
1. **`VITE_API_BASE_URL`** ortam değişkeni verilmişse — her şeyi ezer.
2. Aksi halde **üretim build'i** ise (`import.meta.env.PROD === true`, ör. Vercel)
   → canlı Railway backend'i.
3. Aksi halde (**`npm run dev`**) → `http://localhost:8080` (yerel geliştirme).

Bu sayede Vercel'de hiçbir ortam değişkeni ayarlamasan bile üretim build'i doğrudan
Railway backend'ine bağlanır. Farklı bir backend'e yönlendirmek istersen bir `.env`
dosyasıyla `VITE_API_BASE_URL`'i ayarlaman yeterli.

> ⚠️ **Vite ipucu:** Ortam değişkeni yalnızca `VITE_` önekliyse tarayıcı koduna
> dahil edilir. `apiUrl`, `production` gibi öneksiz değişkenler build'e **hiç
> girmez** — bu yüzden Vercel'e böyle isimlerle değişken eklemek işe yaramaz.

**`ApiError` sınıfı:** Standart `Error`'ı genişletir ve isteğe bağlı
`fieldErrors` (alan adı → hata mesajı) taşır. Böylece backend'in doğrulama
(validation) hataları form üzerinde ilgili alanların altında gösterilebilir.

**`handleResponse<T>()` — merkezi cevap işleyici:**
1. Cevap başarısızsa (`!response.ok`) gövdeyi JSON olarak okumayı dener.
2. Gövdede `errors` varsa → alan bazlı `ApiError` fırlatır ("Girdiğin bilgilerde hata var").
3. Aksi halde `message` veya HTTP durum koduyla genel bir `ApiError` fırlatır.
4. `204 No Content` durumunda `undefined` döner (silme işlemleri için).
5. Aksi halde gövdeyi `T` tipinde parse edip döndürür.

**Dışa aktarılan fonksiyonlar:**

| Fonksiyon | HTTP | Endpoint | Açıklama |
|-----------|------|----------|----------|
| `getAllExpenses()` | GET | `/api/expenses` | Tüm giderler (dizi) |
| `getExpensesPage(page, size, sortField, sortDir)` | GET | `/api/expenses/page?...` | Sayfalı + sıralı liste |
| `getExpenseById(id)` | GET | `/api/expenses/{id}` | Tek gider |
| `createExpense(input)` | POST | `/api/expenses` | Yeni gider |
| `updateExpense(id, input)` | PUT | `/api/expenses/{id}` | Gider güncelle |
| `deleteExpense(id)` | DELETE | `/api/expenses/{id}` | Gider sil |
| `getExpensesByRange(startDate, endDate)` | GET | `/api/expenses/range?...` | Tarih aralığı |
| `getLast30DaysSummary()` | GET | `/api/expenses/summary/last-30-days` | 30 gün özeti |
| `getCategoryBreakdown()` | GET | `/api/expenses/summary/by-category` | Kategori dağılımı |

Sıralama parametreleri yalnızca `sortField` doluysa URL'e eklenir
(`URLSearchParams` ile güvenli biçimde kodlanır).

### 6.3. Sabitler — [`constants/categories.ts`](src/constants/categories.ts)

- **`CATEGORIES`** — Kategori değerlerini backend enum sırasıyla tutan dizi.
  Form `<select>` seçenekleri ve döngüler bunu kullanır.
- **`CATEGORY_LABELS`** — Her enum değeri için ekranda gösterilecek Türkçe karşılık
  (`FOOD → "Yemek"` gibi). Backend'e her zaman enum **değeri** (`FOOD`) gönderilir,
  kullanıcıya etiket (`"Yemek"`) gösterilir.

### 6.4. Yardımcılar — [`utils/format.ts`](src/utils/format.ts)

- **`formatTRY(amount)`** — Sayıyı `Intl.NumberFormat("tr-TR", …)` ile Türk Lirası
  para formatına çevirir: `1234.56 → "₺1.234,56"`. Formatlayıcı modül düzeyinde bir
  kez oluşturulur (performans için tekrar kullanılır).

---

## 7. Bileşenler

Tüm okuyan bileşenler ortak bir kalıbı paylaşır: `refreshKey` prop'unu alır,
`useEffect` içinde ilgili API fonksiyonunu çağırır, sonucu/hatayı local state'te
tutar ve render eder.

### 7.1. [`ExpenseForm.tsx`](src/components/ExpenseForm.tsx)
Hem **ekleme** hem **düzenleme** yapan tek form.

- **Props:** `editingExpense`, `onSaved`, `onCancelEdit`, `onRefreshNeeded`.
- `editingExpense` değiştiğinde `useEffect` form alanlarını o giderin değerleriyle
  doldurur (düzenleme moduna geçiş).
- `handleSubmit`:
  - `editingExpense` varsa `updateExpense`, yoksa `createExpense` çağırır.
  - Başarılıysa formu sıfırlar ve `onSaved()` tetikler.
  - `ApiError` + `fieldErrors` gelirse hataları alanların altına yazar; genel hata
    ise formun altında `error` olarak gösterilir.
- Başlık ve buton metni moda göre değişir ("Yeni Gider Ekle" / "Gideri Düzenle",
  "Ekle" / "Güncelle"). Düzenleme modunda ek bir "Vazgeç" butonu görünür.

### 7.2. [`ExpenseList.tsx`](src/components/ExpenseList.tsx)
Ana veri tablosu — en karmaşık bileşen.

- **Props:** `refreshKey`, `onEdit`, `onChanged`.
- **Yerel state:** `pageData`, `loading`, `error`, `sortField`, `sortDirection`,
  `page`, `size`.
- **Sayfalama:** başlangıç sayfa boyutu `MIN_SIZE = 5`, "Daha fazla/az göster"
  butonları `SIZE_STEP = 5` adımıyla boyutu değiştirir. İleri/geri butonları
  sınırda `disabled` olur.
- **Sıralama:** Tutar/Tarih başlıklarına tıklanınca sıralanır. Aynı sütuna tekrar
  tıklamak yönü (`asc ↔ desc`) çevirir; `sortArrow` ile `↑ ↓ ↕` okları gösterilir.
  Sıralama değişince sayfa 0'a döner.
- **Sınır kontrolü:** Son sayfadaki tek kayıt silinince o sayfa boşalırsa, effect
  içinde otomatik olarak bir önceki sayfaya (`totalPages - 1`) geçilir.
- **Silme:** `handleDelete` → `deleteExpense` → başarı/başarısızlıkta `onChanged()`
  ile tüm ekranı tazeler.
- Kategori, renkli bir `badge` (`cat-FOOD` vb. CSS sınıfı) ile gösterilir; tutar
  `formatTRY` ile biçimlendirilir.

### 7.3. [`SummaryCards.tsx`](src/components/SummaryCards.tsx)
İki gradient kart: **Son 30 Gün Toplam** ve **Günlük Ortalama**.
`getLast30DaysSummary()` verisini çeker, `formatTRY` ile gösterir. Veri gelene
kadar `null` döner (hiçbir şey render etmez).

### 7.4. [`CategoryBreakdown.tsx`](src/components/CategoryBreakdown.tsx)
Kategori başına toplam harcamayı **yatay bar** olarak gösterir.
`getCategoryBreakdown()` verisini çeker. Bar genişlikleri, en yüksek toplama göre
oransal hesaplanır:
```ts
const maxTotal = Math.max(...breakdown.map(b => b.totalAmount), 1);
// width: (item.totalAmount / maxTotal) * 100 %
```
`, 1` eklenmesi, veri boşken `Math.max()`'in `-Infinity` dönmesini ve sıfıra
bölmeyi engeller. Her satır kategori rengini `cat-*` sınıfından alır.

### 7.5. [`DateRangeFilter.tsx`](src/components/DateRangeFilter.tsx)
Başlangıç/bitiş tarihi seçip aralıktaki giderleri listeler.

- Form gönderilince `getExpensesByRange(start, end)` çağrılır.
- `useEffect` yalnızca `refreshKey` değiştiğinde ve iki tarih de doluysa sonuçları
  tazeler (bilinçli olarak `exhaustive-deps` kuralı bir satırda devre dışı
  bırakılmıştır — yorumda açıklanmıştır).
- Sonuç yoksa "Bu aralıkta gider bulunamadı." mesajı gösterir.

### 7.6. Inline stil objeleri — `ExpenseListStyle.tsx` & `CategoryBreakdownType.tsx`
Bunlar bileşen değil, birer **`CSSProperties` sözlüğüdür**. Yalnızca yazı ağırlığı
(bold) gibi vurguları inline olarak taşırlar; renk ve hizalama gibi asıl stiller
`App.css`'ten gelir. Amaç, inline stilin CSS renklerini ezmemesini sağlamaktır.

> İsimlendirme notu: `CategoryBreakdownType.tsx` bir "tip" dosyası değildir; içerik
> aslında stil objesidir. İsim biraz yanıltıcı olsa da işlevi `ExpenseListStyle.tsx`
> ile aynıdır.

---

## 8. Ortam Dosyaları — `environments/` (⚠️ Şu an kullanılmıyor)

`environment.ts` ve `environment.prod.ts` dosyaları Angular tarzı bir ortam
yapılandırması tanımlar:

```ts
export const enviroment = {
  production: false,
  apiUrl: "springboot-production-7df8.up.railway.app",
};
```

**Önemli tespitler:**

1. **Bu dosyalar hiçbir yerde import edilmiyor.** Proje genelinde arama
   yapıldığında `enviroment`/`environment` yalnızca bu iki dosyanın içinde geçiyor.
   Uygulamanın gerçekte kullandığı adres, [`expenseApi.ts`](src/api/expenseApi.ts)
   içindeki `import.meta.env.VITE_API_BASE_URL`'dir. Yani bu dosyalar **ölü koddur**
   (muhtemelen Angular'dan alışkanlıkla eklenmiş, Vite'ta karşılığı yok).
2. **Yazım hatası:** Dışa aktarılan sabitin adı `enviroment` — İngilizce doğrusu
   `environment` (eksik `n`). Kullanılsaydı bile bu isimle çağrılması gerekirdi.
3. **Adres tutarsızlığı:** `environment.ts` içindeki `apiUrl` protokolsüz
   (`springboot-…`), `environment.prod.ts` ise `/api/v1` yolunu içeriyor. Oysa
   gerçek API katmanı `/api/expenses` yolunu kullanıyor. Yani bu değerler güncel
   değil ve yanıltıcı.

**Öneri:** API adresini `VITE_API_BASE_URL` ortam değişkeni (`.env` dosyası)
üzerinden yönetmeye devam edin ve bu iki dosyayı **silin** ya da içeriğini gerçek
kullanımı yansıtacak şekilde düzeltip fiilen import edin. Şu anki halleriyle kafa
karışıklığı dışında bir işleve sahip değiller.

---

## 9. Stiller

- [`index.css`](src/index.css) — Vite'ın varsayılan global reset/temel stilleri.
- [`App.css`](src/App.css) — Uygulamanın **tüm** görsel tasarımı. Öne çıkanlar:
  - `:root` içinde renk, radius, gölge için **CSS değişkenleri** (tema kolaylığı).
  - `.app-shell` üç sütunlu grid; `@media (max-width: 1180px)` altında tek sütuna
    düşer (responsive).
  - Kategori renkleri `.cat-FOOD … .cat-OTHER` sınıflarında `--cat` değişkeni ile;
    `badge` ve dağılım çubukları bu değişkeni `color-mix` ile kullanır.
  - Özet kartları gradient arka planlıdır (`.summary-card.total`, `.avg`).

---

## 10. Çalıştırma

**npm script'leri** ([`package.json`](package.json)):

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Vite geliştirme sunucusunu başlatır (hot reload) |
| `npm run build` | `tsc -b` ile tip kontrolü + `vite build` ile üretim derlemesi |
| `npm run preview` | Üretim derlemesini yerelde önizler |
| `npm run lint` | ESLint ile kod denetimi |

**Adımlar:**

```bash
cd project_2
npm install
# API adresini ayarlamak için (opsiyonel) proje köküne .env ekleyin:
#   VITE_API_BASE_URL=https://springboot-production-7df8.up.railway.app
npm run dev
```

Backend `http://localhost:8080` üzerinde çalışıyorsa hiçbir yapılandırma
gerektirmeden bağlanır (varsayılan değer budur).

---

## 11. Notlar ve İyileştirme Önerileri

- **Ölü ortam dosyaları:** `environments/environment*.ts` kullanılmıyor, yazım
  hatası ve tutarsız adres içeriyor (bkz. §8). Temizlenmesi önerilir.
- **`getAllExpenses` ve `getExpenseById`** API katmanında tanımlı ancak hiçbir
  bileşen tarafından çağrılmıyor (liste sayfalı `getExpensesPage`'i kullanıyor).
  İleride kullanılmayacaksa kaldırılabilir.
- **Hata yönetimi tutarlı:** Tüm çağrılar `ApiError` üzerinden yönetiliyor; alan
  bazlı doğrulama hataları forma güzelce yansıtılıyor.
- **StrictMode & çift istek:** Dev modda `useEffect`'lerin iki kez tetiklenmesi
  normaldir (§4); üretimde tek sefer çalışır.
- **Kimlik doğrulama yok:** API çağrılarında token/oturum yönetimi bulunmuyor;
  backend herkese açık varsayılıyor. Gerçek kullanımda yetkilendirme eklenmelidir.
```
