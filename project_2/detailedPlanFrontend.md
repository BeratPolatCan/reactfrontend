# Expense Tracker — React Frontend Detaylı Planı

Bu doküman, [detailedPlan.md](../project_1/detailedPlan.md)'de anlatılan Spring Boot backend'e bir React arayüzü ekleyecek, aşama aşama bir rehberdir. İlk React projen olduğu için her aşamada **ne yapıyoruz**, **neden yapıyoruz** ve **nasıl yapıyoruz** ayrı ayrı anlatılıyor — tıpkı backend rehberi gibi.

> Not: Backend zaten bitmiş durumda ve `http://localhost:8080/api/expenses` üzerinden çalışıyor (bkz. [detailedPlan.md](../project_1/detailedPlan.md) Aşama 7). Bu doküman ona dokunmuyor, tek istisna Aşama 2'deki küçük bir CORS ayarı.

---

## Genel Mimari Kararı

```
Tarayıcı (React SPA — localhost:5173)
   ↓  fetch() ile HTTP isteği + JSON
Spring Boot REST API (localhost:8080/api/expenses)
   ↓
PostgreSQL (Docker container)
```

React, backend'i hiç değiştirmeden, sadece HTTP üzerinden onunla konuşan **ayrı bir uygulama**. Backend'in bildiği tek şey "birileri `/api/expenses`'e istek atıyor" — kimin attığı (React, Postman, curl) onun için fark etmez. Bu ayrım (frontend/backend'in birbirinden bağımsız, sadece HTTP sözleşmesiyle konuşan iki ayrı uygulama olması) modern web mimarisinin temel prensiplerinden biri.

Bu proje `project_1`'in **içine değil**, ona **kardeş** ayrı bir proje olarak `project_2/` altına kuruluyor — repo kökünde `project_1/` (backend) ve `project_2/` (frontend) yan yana duruyor, `detailedPlan.md` ile `detailedPlanFrontend.md` de kendi projelerinin köküne yerleşiyor. `project_2/`'nin kendisi React uygulamasının kök klasörü (`package.json` dahil her şey doğrudan burada).

**Hedef klasör yapısı** (`project_2/` = React uygulamasının kökü):

```
project_2/
├── detailedPlanFrontend.md   (bu doküman)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── types/
    │   └── expense.ts          (TypeScript tipleri — backend DTO'larının karşılığı)
    ├── api/
    │   └── expenseApi.ts       (backend ile konuşan fetch fonksiyonları)
    └── components/
        ├── ExpenseList.tsx
        ├── ExpenseForm.tsx
        ├── SummaryCards.tsx
        ├── CategoryBreakdown.tsx
        └── DateRangeFilter.tsx
```

Bu yapı, backend'deki katmanlı mimariye (`controller/service/repository`) benzer bir mantıkla ayrılmış: `types` = veri şekilleri, `api` = dış dünyayla (backend) konuşma katmanı, `components` = ekranda görünen parçalar.

---

## Aşama 0 — Kavramsal Hazırlık

Aşağıdaki kavramları önce kabaca anla, koda girince tekrar tekrar karşına çıkacaklar:

- **Node.js / npm nedir?** Node.js, JavaScript'i tarayıcı dışında (senin bilgisayarında, bir "sunucu" gibi) çalıştırabilen bir çalışma ortamı. React projelerini geliştirirken kullandığın araçların (Vite, TypeScript derleyicisi vb.) hepsi Node.js üzerinde çalışır. **npm** (Node Package Manager), Node.js ile birlikte gelen, kütüphane (paket) indirip yöneten araç — Maven'ın Java dünyasındaki karşılığı gibi düşünebilirsin.
- **React nedir?** Kullanıcı arayüzü (UI) oluşturmak için kullanılan bir JavaScript kütüphanesi. Arayüzü küçük, yeniden kullanılabilir parçalara (**component**) bölerek inşa etmeni sağlar.
- **JSX nedir?** React'te HTML'e benzeyen ama aslında JavaScript içine gömülmüş bir sözdizimi. `<h1>Merhaba</h1>` yazarsın ama bu aslında arka planda bir JavaScript fonksiyon çağrısına dönüşür. `.tsx` uzantılı dosyalarda kullanılır.
- **Component nedir?** Ekranın bir parçasını üreten, tek bir işe odaklanan fonksiyon (ör. `ExpenseList` sadece gider tablosunu gösterir). Backend'deki bir Controller metodunun "tek bir endpoint'e bakması" gibi, bir component da "tek bir UI parçasına bakar".
- **Props nedir?** Bir component'e dışarıdan geçirilen parametreler — fonksiyon parametresi gibi düşün. Ör. `<ExpenseList refreshKey={5} />` içindeki `refreshKey`, `ExpenseList` component'ine geçirilen bir prop.
- **State nedir?** Bir component'in "hatırladığı", zamanla değişebilen veri (ör. formdaki input değeri, yüklenen gider listesi). State değiştiğinde React o component'i otomatik olarak yeniden çizer (**re-render**).
- **Hook nedir? (`useState`, `useEffect`)** Component'lerin state ve diğer React özelliklerini kullanmasını sağlayan özel fonksiyonlar. `useState`, bir component'e state eklemeni sağlar. `useEffect`, component ekrana ilk çıktığında (veya belirli bir değer değiştiğinde) bir şey yapmanı sağlar — biz bunu backend'den veri çekmek için kullanacağız.
- **SPA (Single Page Application) nedir?** Sayfa her tıklamada baştan yüklenmez; JavaScript, tarayıcıdaki içeriği (DOM'u) doğrudan günceller. React uygulamaları tipik olarak SPA'dır.
- **Vite nedir?** React projesini geliştirirken kullanacağımız araç: hem yeni proje iskeleti oluşturur, hem geliştirme sırasında anlık önizleme sunan bir sunucu (**dev server**) çalıştırır, hem de projeyi production için paketler (**bundler**). Spring Initializr'ın (start.spring.io) frontend dünyasındaki karşılığı gibi düşünebilirsin — ama aynı zamanda `mvnw spring-boot:run`'ın da karşılığı.
- **TypeScript'in React'teki rolü:** TypeScript, JavaScript'e Java'daki gibi statik tip kontrolü ekler. `interface Expense { id: number; ... }` gibi bir tip tanımlarsan, yanlış alan adı veya yanlış tipte veri kullanırsan derleme zamanında (kodu çalıştırmadan) hata alırsın — Java'da alıştığın güvenliğin bir kısmı JavaScript'e taşınmış olur.
- **Tarayıcıdan HTTP isteği — `fetch`:** Tarayıcının yerleşik (kütüphane gerektirmeyen) HTTP istemcisi. `fetch("http://localhost:8080/api/expenses")` çağrısı, backend'e bir GET isteği atar ve bir `Promise` (ileride sonuçlanacak bir söz) döner — `async/await` ile bu sonucu bekleyip kullanırız.

**Çıktı:** Bu kavramları kabaca anlaman yeterli, kodu yazarken tekrar tekrar karşına çıkacaklar ve oturacaklar.

---

## Aşama 1 — Node.js Kurulumu ve Projeyi Oluşturma

**Ne yapıyoruz:** Node.js'in kurulu olduğunu doğrulayıp, Vite ile React + TypeScript şablonundan yeni bir proje oluşturacağız.

**Nasıl yapıyoruz:**

1. Terminalde doğrula:
   ```bash
   node -v
   npm -v
   ```
   Node.js 18 veya üzeri görmelisin. Yoksa [nodejs.org](https://nodejs.org)'dan LTS sürümünü indir kur.

2. `project_2` klasörüne git ve Vite ile projeyi **mevcut klasörün içine** oluştur (`.` = "buraya"):
   ```bash
   cd "project_2"
   npm create vite@latest . -- --template react-ts
   ```
   Vite, klasörün zaten `detailedPlanFrontend.md` içerdiğini görüp boş olmadığı için soracak — devam etmeyi onayla. Bu, proje dosyalarını (`package.json`, `src/`, vb.) doğrudan `project_2/` içine, `project_1`'e **kardeş** bir proje olarak oluşturur.

3. Bağımlılıkları kur ve geliştirme sunucusunu başlat:
   ```bash
   npm install
   npm run dev
   ```

**Oluşan yapının önemli dosyaları:**
- `package.json` — projenin bağımlılıklarını ve çalıştırılabilir komutlarını (`npm run dev`, `npm run build`) listeler. Maven'daki `pom.xml`'in karşılığı.
- `tsconfig.json` — TypeScript derleyicisinin ayarları (ne kadar sıkı tip kontrolü yapılacağı vb.).
- `vite.config.ts` — Vite'ın ayar dosyası.
- `index.html` — tarayıcının yüklediği tek gerçek HTML dosyası; React uygulaması buraya "enjekte" edilir.
- `src/main.tsx` — uygulamanın gerçek giriş noktası; `App` component'ini `index.html` içindeki bir `<div id="root">`'a bağlar.
- `src/App.tsx` — ana component; şu an Vite'ın demo sayaç (counter) örneğini içeriyor, bunu Aşama 3'te temizleyeceğiz.

**Doğrulama:** Tarayıcıda `http://localhost:5173` adresini aç. Vite + React logolarını ve bir sayaç butonu gören varsayılan demo sayfasını görmelisin.

---

## Aşama 2 — Backend'e CORS Ayarı Ekleme

**Ne yapıyoruz:** Backend'e, React dev sunucusundan (`localhost:5173`) gelen isteklere izin veren bir CORS (Cross-Origin Resource Sharing) ayarı ekleyeceğiz.

**Neden gerekli:** Tarayıcılar, güvenlik amacıyla **same-origin policy** uygular: bir sayfa (`localhost:5173`) başka bir origin'e (`localhost:8080` — farklı port, farklı origin sayılır) JavaScript ile istek attığında, hedef sunucu açıkça izin vermedikçe tarayıcı cevabı **engeller**. Backend kodunda (`ExpenseController`, `SecurityConfig` vb.) hiçbir CORS ayarı yok — bu proje kapsamında hiç eklenmemişti çünkü backend o zamana kadar sadece Postman'den test ediliyordu (Postman, tarayıcı olmadığı için bu kısıtlamaya tabi değil). Şimdi bir tarayıcı uygulaması eklediğimize göre bu ayarı eklemek zorunludur, yoksa her `fetch` çağrısı konsolda bir CORS hatasıyla başarısız olur.

**Nasıl yapıyoruz:** Backend'de `src/main/java/com/example/expensetracker/config/CorsConfig.java` dosyasını oluştur:

```java
package com.example.expensetracker.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

**Satır satır ne oluyor:**
- `@Configuration` → Spring'e bu sınıfın bir yapılandırma sınıfı olduğunu, uygulama başlarken okunması gerektiğini söyler.
- `implements WebMvcConfigurer` → Spring MVC'nin bazı davranışlarını (burada CORS'u) özelleştirmemizi sağlayan arayüz.
- `addCorsMappings(CorsRegistry registry)` → CORS kurallarını tanımladığımız metot.
- `registry.addMapping("/api/**")` → bu kuralın `/api/` altındaki **tüm** endpoint'lere uygulanacağını belirtir (`ExpenseController`'daki her şey `/api/expenses` altında olduğu için kapsanıyor).
- `.allowedOrigins("http://localhost:5173")` → sadece bu origin'den (React dev sunucusu) gelen isteklere izin verilir. Production'a çıkarken buraya gerçek frontend adresini eklemen gerekecek.
- `.allowedMethods(...)` → hangi HTTP metotlarına izin verildiği (CRUD için gereken hepsi + tarayıcının bazı isteklerden önce otomatik attığı `OPTIONS` "preflight" isteği).
- `.allowedHeaders("*")` → istekte gönderilebilecek header'lara kısıtlama koymuyoruz (ör. `Content-Type: application/json`).

**Doğrulama:** Backend'i yeniden başlat (`mvnw spring-boot:run`). React dev sunucusu da açıkken tarayıcıda `localhost:5173`'ü aç, F12 ile Developer Tools → Console'u aç ve şunu çalıştır:
```js
fetch("http://localhost:8080/api/expenses").then(r => r.json()).then(console.log)
```
Konsolda kırmızı bir CORS hatası **görmemelisin**; seed verideki gider listesinin JSON halini görmelisin.

---

## Aşama 3 — Proje Yapısını Düzenleme

**Ne yapıyoruz:** Vite'ın demo içeriğini temizleyip kendi klasör yapımızı kuracağız.

**Nasıl yapıyoruz:**

1. `src/App.css` içeriğini tamamen sil (boş bırak — stil Aşama 13'te gelecek).
2. `src/App.tsx` içeriğini şununla değiştir:
   ```tsx
   function App() {
     return (
       <div className="app">
         <h1>Gider Takip</h1>
       </div>
     );
   }

   export default App;
   ```
3. `src/assets/react.svg` dosyasını silebilirsin (kullanmayacağız, opsiyonel).
4. Şu klasörleri oluştur: `src/types/`, `src/api/`, `src/components/`.

**Neden bu ayrım:** Backend'de `dto`, `service`, `controller` gibi paketlere ayırman gibi, frontend'de de "veri şekli" (types), "dış dünyayla konuşma" (api) ve "ekran parçaları" (components) birbirinden ayrı klasörlerde tutulur. Bu, proje büyüdükçe hangi dosyanın ne işe yaradığını tahmin etmeni kolaylaştırır.

**Doğrulama:** `npm run dev` çalışırken tarayıcıda sade bir "Gider Takip" başlığı görmelisin, konsolda hata olmamalı.

---

## Aşama 4 — TypeScript Tipleri

**Ne yapıyoruz:** Backend'deki DTO'ların birebir karşılığı olan TypeScript tiplerini tanımlayacağız.

**Neden:** Backend'de `ExpenseRequestDto`/`ExpenseResponseDto` ayrımının sebebi neyse (bkz. [detailedPlan.md](../project_1/detailedPlan.md) Aşama 5), burada da aynı sebep geçerli: oluşturma isteğinde `id` yok ama cevapta var. Ayrıca bu tipleri burada tek yerde tanımlayıp her yerde kullanmak, bir alan adını yanlış yazarsan TypeScript'in bunu **derleme zamanında** yakalamasını sağlar — çalıştırıp hatayı görmeyi beklemene gerek kalmaz.

`src/types/expense.ts`:
```typescript
export type Category =
  | "FOOD"
  | "TRANSPORT"
  | "BILLS"
  | "ENTERTAINMENT"
  | "HEALTH"
  | "SHOPPING"
  | "OTHER";

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string; // "yyyy-MM-dd" formatında (backend'in LocalDate'i JSON'da böyle görünür)
  category: Category;
}

export interface ExpenseInput {
  description: string;
  amount: number;
  date: string;
  category: Category;
}

export interface CategorySummary {
  category: Category;
  totalAmount: number;
}

export interface Last30DaysSummary {
  totalAmount: number;
  dailyAverage: number;
}
```

**Ne oluyor:**
- `type Category = "FOOD" | "TRANSPORT" | ...` → bir **union type** (literal string birleşimi). Backend'deki `Category` enum'unun karşılığı — bu tipte bir değişkene bu 7 string dışında bir şey atarsan TypeScript hata verir. Java enum'unun tip güvenliğine en yakın JavaScript karşılığı bu.
- `Expense` → backend'in `ExpenseResponseDto`'sunun karşılığı, `id` dahil.
- `ExpenseInput` → backend'in `ExpenseRequestDto`'sunun karşılığı, `id` yok — çünkü oluşturma/güncelleme isteğinde client id belirlemiyor.
- `CategorySummary` → `CategorySummaryDto`'nun karşılığı.
- `Last30DaysSummary` → `/summary/last-30-days` endpoint'inin döndürdüğü `Map<String, BigDecimal>`'in (`{totalAmount, dailyAverage}`) TypeScript karşılığı.
- `date: string` → backend `LocalDate`'i JSON'da `"2026-07-01"` gibi bir metin olarak gönderir; TypeScript'te ayrı bir `Date` sınıfı kullanmıyoruz, HTML'in `<input type="date">` elemanı da zaten bu formatta string üretir/kabul eder — bu bizim işimize yarayacak (Aşama 7, 11).

**Doğrulama:** Bu aşamada henüz çalışan bir ekran çıktısı yok; `npm run dev` konsolunda (terminalde) TypeScript hatası olmadığını gör.

---

## Aşama 5 — API Katmanı

**Ne yapıyoruz:** Backend'deki her endpoint için, `fetch` kullanan bir TypeScript fonksiyonu yazacağız.

**Neden ayrı bir katman:** Component'lerin içine doğrudan `fetch(...)` yazabilirdik ama bunu tek bir yerde toplarsak: (1) URL'yi tek yerde değiştiririz, (2) hata yönetimini (backend'in 400/404 JSON gövdesini okuma) tek yerde yazarız, (3) component'ler "nasıl" değil "ne" sorusuna odaklanır (`getAllExpenses()` çağırır, `fetch` detaylarıyla uğraşmaz). Bu, backend'deki Service katmanının Controller'ı HTTP detaylarından soyutlamasına çok benziyor.

`src/api/expenseApi.ts`:
```typescript
import type {
  Expense,
  ExpenseInput,
  CategorySummary,
  Last30DaysSummary,
} from "../types/expense";

const API_BASE_URL = "http://localhost:8080/api/expenses";

export class ApiError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.errors) {
      throw new ApiError("Girdiğin bilgilerde hata var", body.errors);
    }
    throw new ApiError(body?.message ?? `İstek başarısız: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const response = await fetch(API_BASE_URL);
  return handleResponse<Expense[]>(response);
}

export async function getExpenseById(id: number): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/${id}`);
  return handleResponse<Expense>(response);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Expense>(response);
}

export async function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Expense>(response);
}

export async function deleteExpense(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
  return handleResponse<void>(response);
}

export async function getExpensesByRange(
  startDate: string,
  endDate: string
): Promise<Expense[]> {
  const response = await fetch(
    `${API_BASE_URL}/range?startDate=${startDate}&endDate=${endDate}`
  );
  return handleResponse<Expense[]>(response);
}

export async function getLast30DaysSummary(): Promise<Last30DaysSummary> {
  const response = await fetch(`${API_BASE_URL}/summary/last-30-days`);
  return handleResponse<Last30DaysSummary>(response);
}

export async function getCategoryBreakdown(): Promise<CategorySummary[]> {
  const response = await fetch(`${API_BASE_URL}/summary/by-category`);
  return handleResponse<CategorySummary[]>(response);
}
```

**Dikkat edilecek noktalar:**
- `async`/`await` → `fetch` bir `Promise` döner (sonucun "ileride" hazır olacağını temsil eder). `await`, o sonucu bekler; Java'daki `Future.get()`'e benzer ama dili bloklamaz. `async` işaretli bir fonksiyon her zaman bir `Promise` döner.
- `handleResponse<T>` → **generic** bir fonksiyon (Java'daki `<T>` ile aynı fikir): "hangi tipte veri beklediğimi çağıran taraf söyler, ben onu ona göre `Promise`'e sararım".
- `response.ok` → HTTP status kodu 200-299 aralığındaysa `true`. Backend `GlobalExceptionHandler`'ın döndürdüğü 400/404'ler burada `false` olur.
- `body?.errors` kontrolü → backend'in validasyon hatası (400) formatı `{ errors: { alan: mesaj } }` şeklinde (bkz. [detailedPlan.md](../project_1/detailedPlan.md) Aşama 8); bunu ayrı yakalayıp `ApiError.fieldErrors` içine koyuyoruz — bunu Aşama 12'de forma bağlayacağız.
- `response.status === 204` özel durumu → `DELETE` başarılı olduğunda backend gövdesiz `204 No Content` döner; boş bir gövdeyi `.json()` ile okumaya çalışmak hataya sebep olur, o yüzden burada erken çıkıyoruz.
- `ApiError extends Error` → JavaScript'in yerleşik `Error` sınıfını genişletip üstüne `fieldErrors` alanı ekliyoruz — Java'da özel bir exception sınıfı yazmana çok benziyor (`ExpenseNotFoundException` gibi).

**Doğrulama:** Henüz ekranda bir şey yok; sadece `npm run dev` terminalinde TypeScript hatası olmadığını doğrula. Fonksiyonlar Aşama 6'dan itibaren kullanılacak.

---

## Aşama 6 — İlk Component: Gider Listesi

**Ne yapıyoruz:** Backend'deki tüm giderleri tablo halinde gösteren ilk component'i yazıp ekrana bağlayacağız — bu, ilk kez gerçek veriyi ekranda göreceğin aşama.

`src/components/ExpenseList.tsx`:
```tsx
import { useEffect, useState } from "react";
import type { Expense } from "../types/expense";
import { getAllExpenses } from "../api/expenseApi";

interface ExpenseListProps {
  refreshKey: number;
}

function ExpenseList({ refreshKey }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAllExpenses()
      .then(setExpenses)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p>Yükleniyor...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Açıklama</th>
          <th>Tutar</th>
          <th>Tarih</th>
          <th>Kategori</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{expense.description}</td>
            <td>{expense.amount.toFixed(2)} TL</td>
            <td>{expense.date}</td>
            <td>{expense.category}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ExpenseList;
```

`src/App.tsx`'i güncelle:
```tsx
import { useState } from "react";
import ExpenseList from "./components/ExpenseList";
import "./App.css";

function App() {
  const [refreshKey] = useState(0);

  return (
    <div className="app">
      <h1>Gider Takip</h1>
      <ExpenseList refreshKey={refreshKey} />
    </div>
  );
}

export default App;
```

**Ne oluyor:**
- `useState<Expense[]>([])` → `expenses` adında, başlangıçta boş dizi olan bir state. `setExpenses` çağrıldığında React component'i yeniden çizer.
- `useEffect(() => { ... }, [refreshKey])` → component ekrana ilk çıktığında **ve** `refreshKey` her değiştiğinde içindeki kod çalışır. `[refreshKey]`'e **dependency array** denir — React'e "bu değerler değişmedikçe tekrar çalıştırma" der. Şu an `refreshKey` hiç değişmiyor (Aşama 7'de değişecek), yani sadece ilk açılışta bir kez çalışıyor.
- `.finally(() => setLoading(false))` → istek başarılı da olsa hata da alsa, yüklenme göstergesini kapat.
- `key={expense.id}` → React, bir listeyi (`.map(...)`) render ederken her elemana benzersiz bir `key` ister; bu sayede liste değiştiğinde (bir eleman eklenip/silindiğinde) hangi elemanın hangisi olduğunu takip edip gereksiz yeniden çizimi önler. `id` bu iş için ideal çünkü zaten benzersiz.
- `expense.amount.toFixed(2)` → sayıyı virgülden sonra 2 basamağa yuvarlar (para gösterimi için).

**Doğrulama:** Backend (`mvnw spring-boot:run`) ve Docker Postgres çalışırken, `npm run dev` ile frontend'i başlat, `localhost:5173`'te seed veri olan 9 giderin tablo halinde göründüğünü doğrula.

---

## Aşama 7 — Gider Ekleme Formu

**Ne yapıyoruz:** Yeni gider ekleyebileceğin bir form yazıp, ekleme başarılı olduğunda listenin otomatik yenilenmesini sağlayacağız.

`src/components/ExpenseForm.tsx`:
```tsx
import { useState } from "react";
import type { Category, ExpenseInput } from "../types/expense";
import { createExpense } from "../api/expenseApi";

const CATEGORIES: Category[] = [
  "FOOD",
  "TRANSPORT",
  "BILLS",
  "ENTERTAINMENT",
  "HEALTH",
  "SHOPPING",
  "OTHER",
];

interface ExpenseFormProps {
  onSaved: () => void;
}

function ExpenseForm({ onSaved }: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("FOOD");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input: ExpenseInput = {
      description,
      amount: Number(amount),
      date,
      category,
    };

    try {
      await createExpense(input);
      setDescription("");
      setAmount("");
      setDate("");
      setCategory("FOOD");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Açıklama"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="Tutar"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button type="submit">Ekle</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default ExpenseForm;
```

`src/App.tsx`'i güncelle:
```tsx
import { useState } from "react";
import ExpenseList from "./components/ExpenseList";
import ExpenseForm from "./components/ExpenseForm";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="app">
      <h1>Gider Takip</h1>
      <ExpenseForm onSaved={handleSaved} />
      <ExpenseList refreshKey={refreshKey} />
    </div>
  );
}

export default App;
```

**Ne oluyor — burası React'in en önemli fikirlerinden birini içeriyor:**
- **Controlled input deseni:** Her `<input>`'un `value`'su bir state'e bağlı (`value={description}`) ve her değişiklikte (`onChange`) o state güncelleniyor. Yani input'un ekrandaki değeri her zaman React state'inin "aynası" — input kendi başına bir hafızaya sahip değil, React onu tamamen kontrol ediyor (bu yüzden adı "controlled").
- `event.preventDefault()` → tarayıcının formu göndermenin varsayılan davranışı olan "sayfayı yeniden yükleme"sini engeller; bunun yerine kendi `fetch` isteğimizi atacağız (SPA mantığı).
- **State'i yukarı taşıma (lifting state up):** `ExpenseForm`, `ExpenseList`'in hiçbir şeyini bilmiyor. Sadece başarılı kayıttan sonra kendisine dışarıdan verilen `onSaved()` fonksiyonunu çağırıyor. Bu fonksiyonu **kim geçtiyse** (burada `App`), ne olacağına o karar veriyor: `App`, `refreshKey`'i bir artırıyor, bu da `ExpenseList`'teki `useEffect`'in `[refreshKey]` bağımlılığı sayesinde yeniden tetiklenmesini sağlıyor → liste otomatik yenileniyor. İki component birbirini tanımadan, ortak ata (`App`) üzerinden haberleşiyor — React'te veri akışının temel deseni budur.
- `amount: Number(amount)` → HTML `<input>`'dan gelen her değer string'dir (input `type="number"` olsa bile `event.target.value` string döner); backend `BigDecimal` beklediği için (JSON'da sayı olarak) burada `Number(...)` ile gerçek bir sayıya çeviriyoruz.

**Doğrulama:** Formdan yeni bir gider ekle (ör. "Kahve", 45.50, bugünün tarihi, FOOD), sayfa yenilenmeden listenin altına yeni satırın eklendiğini gör.

---

## Aşama 8 — Düzenleme ve Silme

**Ne yapıyoruz:** Listedeki her satıra "Düzenle" ve "Sil" butonları ekleyip, formu hem ekleme hem düzenleme için kullanılabilir hale getireceğiz.

`src/components/ExpenseList.tsx`'i güncelle:
```tsx
import { useEffect, useState } from "react";
import type { Expense } from "../types/expense";
import { getAllExpenses, deleteExpense } from "../api/expenseApi";

interface ExpenseListProps {
  refreshKey: number;
  onEdit: (expense: Expense) => void;
  onChanged: () => void;
}

function ExpenseList({ refreshKey, onEdit, onChanged }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAllExpenses()
      .then(setExpenses)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleDelete(id: number) {
    if (!confirm("Bu gideri silmek istediğine emin misin?")) return;
    try {
      await deleteExpense(id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p>Yükleniyor...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Açıklama</th>
          <th>Tutar</th>
          <th>Tarih</th>
          <th>Kategori</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{expense.description}</td>
            <td>{expense.amount.toFixed(2)} TL</td>
            <td>{expense.date}</td>
            <td>{expense.category}</td>
            <td>
              <button onClick={() => onEdit(expense)}>Düzenle</button>
              <button onClick={() => handleDelete(expense.id)}>Sil</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ExpenseList;
```

`src/components/ExpenseForm.tsx`'i güncelle (düzenleme modu eklendi):
```tsx
import { useEffect, useState } from "react";
import type { Category, Expense, ExpenseInput } from "../types/expense";
import { createExpense, updateExpense } from "../api/expenseApi";

const CATEGORIES: Category[] = [
  "FOOD",
  "TRANSPORT",
  "BILLS",
  "ENTERTAINMENT",
  "HEALTH",
  "SHOPPING",
  "OTHER",
];

interface ExpenseFormProps {
  editingExpense: Expense | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}

function ExpenseForm({ editingExpense, onSaved, onCancelEdit }: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("FOOD");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmount(String(editingExpense.amount));
      setDate(editingExpense.date);
      setCategory(editingExpense.category);
    }
  }, [editingExpense]);

  function resetForm() {
    setDescription("");
    setAmount("");
    setDate("");
    setCategory("FOOD");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input: ExpenseInput = {
      description,
      amount: Number(amount),
      date,
      category,
    };

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, input);
      } else {
        await createExpense(input);
      }
      resetForm();
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Açıklama"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="Tutar"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button type="submit">{editingExpense ? "Güncelle" : "Ekle"}</button>
      {editingExpense && (
        <button type="button" onClick={onCancelEdit}>
          Vazgeç
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default ExpenseForm;
```

`src/App.tsx`'i güncelle:
```tsx
import { useState } from "react";
import type { Expense } from "./types/expense";
import ExpenseList from "./components/ExpenseList";
import ExpenseForm from "./components/ExpenseForm";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  function handleSaved() {
    setEditingExpense(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="app">
      <h1>Gider Takip</h1>
      <ExpenseForm
        editingExpense={editingExpense}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingExpense(null)}
      />
      <ExpenseList
        refreshKey={refreshKey}
        onEdit={setEditingExpense}
        onChanged={handleSaved}
      />
    </div>
  );
}

export default App;
```

**Ne oluyor:**
- `editingExpense` state'i neden `App`'te yaşıyor: hem `ExpenseForm` (formu doldurmak için) hem `ExpenseList` (hangi satırın "Düzenle"ye basıldığını bildirmek için) buna ihtiyaç duyuyor — iki kardeş component birbirini bilmeden, ortak ata üzerinden bu veriyi paylaşıyor (Aşama 7'deki desenin devamı).
- `useEffect(() => { ... }, [editingExpense])` formda: `editingExpense` prop'u her değiştiğinde (yani "Düzenle"ye her basıldığında) form alanlarını o giderin verileriyle dolduruyoruz.
- `type="button"` üzerindeki "Vazgeç" butonu: `<button>`'ın **varsayılan** `type`'ı `"submit"`'tir — bir formun içindeki her buton, özellikle belirtilmezse forma tıklandığında submit tetikler. `type="button"` ile bunu bilinçli olarak kapatıyoruz.
- `confirm(...)` → tarayıcının yerleşik, basit bir onay penceresi (Evet/Hayır) açan fonksiyonu; kalıcı bir silme işleminden önce kullanıcıyı bir kez daha uyarmak için.
- `onEdit={setEditingExpense}` → `setEditingExpense` doğrudan bir prop olarak geçiliyor çünkü imzası zaten `ExpenseList`'in beklediği `(expense: Expense) => void` ile birebir uyuyor — ekstra bir sarmalayıcı fonksiyon yazmaya gerek yok.

**Doğrulama:** Bir satırda "Düzenle"ye bas → form o giderin bilgileriyle dolmalı, buton metni "Güncelle" olmalı. Değiştirip gönder → liste güncellenmeli. "Sil"e bas, onaylayınca kayıt kalkmalı. Aynı kaydı ikinci kez silmeyi dene (ör. iki sekmede aynı sayfayı açıp birinden sil, diğerinden tekrar sil) — backend'in 404 hatası, formun/listenin `error` alanında görünmeli.

---

## Aşama 9 — Özet Kartları

**Ne yapıyoruz:** Son 30 günün toplam gideri ve günlük ortalamasını gösteren iki kart ekleyeceğiz.

`src/components/SummaryCards.tsx`:
```tsx
import { useEffect, useState } from "react";
import type { Last30DaysSummary } from "../types/expense";
import { getLast30DaysSummary } from "../api/expenseApi";

interface SummaryCardsProps {
  refreshKey: number;
}

function SummaryCards({ refreshKey }: SummaryCardsProps) {
  const [summary, setSummary] = useState<Last30DaysSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLast30DaysSummary()
      .then(setSummary)
      .catch((err: Error) => setError(err.message));
  }, [refreshKey]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return null;

  return (
    <div className="summary-cards">
      <div className="card">
        <h3>Son 30 Gün Toplam</h3>
        <p>{summary.totalAmount.toFixed(2)} TL</p>
      </div>
      <div className="card">
        <h3>Günlük Ortalama</h3>
        <p>{summary.dailyAverage.toFixed(2)} TL</p>
      </div>
    </div>
  );
}

export default SummaryCards;
```

`src/App.tsx`'e ekle (başlığın altına, formdan önce):
```tsx
import SummaryCards from "./components/SummaryCards";
// ...
<h1>Gider Takip</h1>
<SummaryCards refreshKey={refreshKey} />
<ExpenseForm ... />
```

**Ne oluyor:**
- `if (!summary) return null` → veri henüz gelmediyse (ilk render anında) hiçbir şey çizme; `summary.totalAmount` gibi bir alana erişmeye çalışırsan `summary` henüz `null` olduğu için hataya (`undefined` hatası) çarpardın. Bu, React'te "veri hazır olana kadar bekle" için çok yaygın bir desen.
- `refreshKey`'i buraya da geçiriyoruz ki bir gider eklendiğinde/silindiğinde bu kartlar da otomatik güncellensin — aynı `refreshKey` birden fazla component'in "şimdi yeniden veri çek" sinyalini paylaşması için kullanılıyor.

**Doğrulama:** Kartlardaki toplam ve ortalamanın, seed veri + eklediğin/sildiğin kayıtlarla tutarlı olduğunu (istersen elle toplayarak) doğrula. Yeni bir gider ekleyince kartların da güncellendiğini gör.

---

## Aşama 10 — Kategori Dağılımı

**Ne yapıyoruz:** Her kategorideki toplam harcamayı, oransal genişlikte bir çubukla (chart kütüphanesi kullanmadan, sade CSS ile) göstereceğiz.

`src/components/CategoryBreakdown.tsx`:
```tsx
import { useEffect, useState } from "react";
import type { CategorySummary } from "../types/expense";
import { getCategoryBreakdown } from "../api/expenseApi";

interface CategoryBreakdownProps {
  refreshKey: number;
}

function CategoryBreakdown({ refreshKey }: CategoryBreakdownProps) {
  const [breakdown, setBreakdown] = useState<CategorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategoryBreakdown()
      .then(setBreakdown)
      .catch((err: Error) => setError(err.message));
  }, [refreshKey]);

  if (error) return <p className="error">{error}</p>;

  const maxTotal = Math.max(...breakdown.map((b) => b.totalAmount), 1);

  return (
    <div className="category-breakdown">
      <h3>Kategori Dağılımı</h3>
      {breakdown.map((item) => (
        <div key={item.category} className="category-row">
          <span className="category-label">{item.category}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.totalAmount / maxTotal) * 100}%` }}
            />
          </div>
          <span className="category-amount">{item.totalAmount.toFixed(2)} TL</span>
        </div>
      ))}
    </div>
  );
}

export default CategoryBreakdown;
```

`src/App.tsx`'e ekle (listeden sonra):
```tsx
import CategoryBreakdown from "./components/CategoryBreakdown";
// ...
<ExpenseList ... />
<CategoryBreakdown refreshKey={refreshKey} />
```

**Ne oluyor:**
- `Math.max(...breakdown.map((b) => b.totalAmount), 1)` → en yüksek kategori toplamını bulur (çubukların yüzdesini buna göre hesaplayacağız); sona eklenen `1`, liste boşken `Math.max()`'in `-Infinity` dönüp sıfıra bölme hatası yaratmasını engelleyen bir güvenlik payı.
- `style={{ width: ... }}` → JSX'te satır içi (inline) stil, bir JavaScript nesnesi olarak verilir — dıştaki `{}` "burada JavaScript ifadesi var" demek, içteki `{ width: ... }` ise gerçek stil nesnesi. Bunu CSS dosyasına değil buraya yazmamızın sebebi: genişlik her satırda **farklı ve veriye bağlı** (dinamik), CSS dosyasındaki class'lar ise sabit/tekrarlanan stiller için (Aşama 13'te onları göreceksin).
- `key={item.category}` → burada `id` yok, ama `category` zaten benzersiz (her kategoriden bir satır var), o yüzden `key` olarak onu kullanabiliyoruz.

**Doğrulama:** Her kategorinin çubuk genişliğinin, o kategorinin toplam tutarıyla orantılı olduğunu görsel olarak kontrol et (en yüksek tutarlı kategori tam dolu çubuğa sahip olmalı).

---

## Aşama 11 — Tarih Aralığı Filtreleme

**Ne yapıyoruz:** İki tarih seçip, o aralıktaki giderleri ayrı bir listede gösteren bir bileşen ekleyeceğiz.

`src/components/DateRangeFilter.tsx`:
```tsx
import { useState } from "react";
import type { Expense } from "../types/expense";
import { getExpensesByRange } from "../api/expenseApi";

function DateRangeFilter() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const data = await getExpensesByRange(startDate, endDate);
      setResults(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="date-range-filter">
      <h3>Tarih Aralığına Göre Listele</h3>
      <form onSubmit={handleFilter}>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        <button type="submit">Filtrele</button>
      </form>
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && <p>Bu aralıkta gider bulunamadı.</p>}
      {results && results.length > 0 && (
        <ul>
          {results.map((expense) => (
            <li key={expense.id}>
              {expense.date} — {expense.description} — {expense.amount.toFixed(2)} TL
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DateRangeFilter;
```

`src/App.tsx`'e ekle (en alta):
```tsx
import DateRangeFilter from "./components/DateRangeFilter";
// ...
<CategoryBreakdown ... />
<DateRangeFilter />
```

**Ne oluyor:**
- Bu component'te **`useEffect` yok** — önceki tüm component'ler ekrana çıkar çıkmaz otomatik veri çekiyordu, ama burada kullanıcı iki tarih seçip "Filtrele"ye basmadan bir istek atmak anlamsız. Bu yüzden veri çekme, sadece `handleFilter` (form submit) içinde, **açıkça tetiklenerek** yapılıyor. Aynı `fetch` mantığı, farklı bir tetikleyici.
- `results: Expense[] | null` → `null` = "henüz hiç filtreleme yapılmadı", boş dizi `[]` = "filtreleme yapıldı ama sonuç yok". Bu ikisini ayırmak, "Bu aralıkta gider bulunamadı" mesajını sadece gerçekten bir arama yapıldıktan sonra göstermemizi sağlıyor.
- `refreshKey` prop'u yok çünkü bu component `App`'teki genel yenileme döngüsüne katılmıyor — kendi tetikleyicisiyle (form submit) bağımsız çalışıyor.

**Doğrulama:** Seed veride olduğunu bildiğin bir tarih aralığı seç (ör. bugünden 40 gün öncesine kadar), sonuçların doğru filtrelendiğini gör. Sonuç çıkmayacak dar bir aralık dene, "Bu aralıkta gider bulunamadı" mesajını gör.

---

## Aşama 12 — Form Validasyon Hatalarını Alan Bazında Gösterme

**Ne yapıyoruz:** Backend'in 400 hatasında döndürdüğü alan bazlı mesajları (`{ errors: { description: "Açıklama boş olamaz", ... } }`), her input'un altında göstereceğiz.

**Neden:** Şu ana kadar `ExpenseForm`'daki `error`, backend'den gelen **tek bir genel** mesajı gösteriyordu. Ama backend validasyon hatasında (bkz. [detailedPlan.md](../project_1/detailedPlan.md) Aşama 8) aslında **hangi alanın** neden hatalı olduğunu ayrı ayrı söylüyor — bunu kullanmazsak kullanıcıya sadece "bir şeyler yanlış" deriz, hangi alanı düzelteceğini söylemeyiz. Aşama 5'teki `ApiError.fieldErrors` tam olarak bunun için vardı.

`src/components/ExpenseForm.tsx`'i güncelle (state ve hata yakalama kısmı):
```tsx
import { useEffect, useState } from "react";
import type { Category, Expense, ExpenseInput } from "../types/expense";
import { ApiError, createExpense, updateExpense } from "../api/expenseApi";

// ...CATEGORIES aynı...

function ExpenseForm({ editingExpense, onSaved, onCancelEdit }: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("FOOD");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ...useEffect ve resetForm aynı...

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const input: ExpenseInput = { description, amount: Number(amount), date, category };

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, input);
      } else {
        await createExpense(input);
      }
      resetForm();
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setError((err as Error).message);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          placeholder="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
      </div>
      <div>
        <input
          type="number"
          step="0.01"
          placeholder="Tutar"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
      </div>
      <div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {fieldErrors.date && <span className="field-error">{fieldErrors.date}</span>}
      </div>
      <div>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {fieldErrors.category && <span className="field-error">{fieldErrors.category}</span>}
      </div>
      <button type="submit">{editingExpense ? "Güncelle" : "Ekle"}</button>
      {editingExpense && <button type="button" onClick={onCancelEdit}>Vazgeç</button>}
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default ExpenseForm;
```

**Ne oluyor:**
- `required` özniteliklerini input'lardan kaldırdık — çünkü artık tarayıcının kendi (İngilizce, sade) doğrulamasına değil, backend'in döndürdüğü gerçek (Türkçe, alan bazlı) validasyon mesajlarına güveniyoruz. Böylece boş bir formu göndermeyi deneyip backend'in `400` cevabını ve alan mesajlarını görebilirsin.
- `err instanceof ApiError` → JavaScript'te `catch` bloğuna düşen hatanın tipini `instanceof` ile kontrol ediyoruz (Java'daki `catch (ApiError e)` çoklu catch bloklarının JS/TS'teki en yakın karşılığı — TypeScript'te `catch` her zaman `unknown`/`any` tipinde yakalar, tipi kendin daraltman gerekir).
- `Record<string, string>` → TypeScript'te "anahtarları string, değerleri string olan bir obje" tipi; Java'daki `Map<String, String>`'in karşılığı.

**Doğrulama:** Formu boş bırakıp gönder → her alanın altında backend'in Türkçe hata mesajı görünmeli (`Açıklama boş olamaz`, `Tutar boş olamaz`, `Tarih boş olamaz`, `Kategori boş olamaz`). Negatif bir tutar dene (`-5`) → `Tutar pozitif olmalı` mesajını gör.

---

## Aşama 13 — Stil (CSS)

**Ne yapıyoruz:** Şimdiye kadar stilsiz/çıplak duran arayüze sade, okunabilir bir görünüm kazandıracağız.

`src/App.css`:
```css
* {
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  background: #f4f5f7;
  margin: 0;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

h1 {
  color: #1f2937;
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.card h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #6b7280;
}

.card p {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #111827;
}

form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

form input,
form select,
form button {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

form button {
  background: #2563eb;
  color: white;
  border: none;
  cursor: pointer;
}

form button:hover {
  background: #1d4ed8;
}

.field-error {
  display: block;
  color: #dc2626;
  font-size: 12px;
  margin-top: 2px;
}

.error {
  color: #dc2626;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #f9fafb;
  color: #374151;
}

.category-breakdown,
.date-range-filter {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.category-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.category-label {
  width: 120px;
  font-size: 13px;
  color: #374151;
}

.bar-track {
  flex: 1;
  background: #e5e7eb;
  border-radius: 4px;
  height: 12px;
  overflow: hidden;
}

.bar-fill {
  background: #2563eb;
  height: 100%;
}

.category-amount {
  width: 90px;
  text-align: right;
  font-size: 13px;
}
```

**Ne oluyor:**
- Bu tamamen standart CSS — React'e özgü tek fark, HTML'deki `class="..."` yerine JSX'te `className="..."` yazman gerekmesiydi (Aşama 6-11'de zaten böyle yazmıştın); sebebi, `class` kelimesinin JavaScript'te zaten başka bir anlamı (sınıf tanımlama) olması.
- `box-sizing: border-box` → padding ve border'ın elemanın toplam genişliğine *eklenmek* yerine *içine dahil edilmesini* sağlar; layout hesaplarını basitleştiren yaygın bir sıfırlama kuralı.
- Aşama 10'daki `.bar-fill`'in `width`'i burada **yok** — çünkü o değer veriye bağlı olduğu için component içinde `style={{ width: ... }}` ile satır içi veriliyor (dinamik); buradaki `.bar-fill` sadece rengi/yüksekliği gibi sabit kısımları tanımlıyor. Dinamik ve statik stillerin ayrışması bu şekilde.

**Doğrulama:** Tarayıcıda sayfayı yenile, kartların, formun, tablonun, kategori çubuklarının düzenli bir görünüme kavuştuğunu doğrula.

---

## Aşama 14 — Son Kontrol Listesi

- [ ] Backend (`mvnw spring-boot:run`) ve Docker Postgres (`docker compose up -d`) çalışıyor
- [ ] Backend'de `CorsConfig` eklenmiş, `localhost:5173`'ten gelen isteklere izin veriyor
- [ ] `npm run dev` hatasız çalışıyor, `localhost:5173` açılıyor
- [ ] Sayfa açılışında seed veri listesi görünüyor
- [ ] Yeni gider ekleme çalışıyor, liste otomatik güncelleniyor
- [ ] Düzenleme çalışıyor (form doğru verilerle doluyor, güncelleme sonrası liste yenileniyor)
- [ ] Silme çalışıyor (onay penceresi çıkıyor, silinen kayıt listeden kalkıyor)
- [ ] Son 30 gün toplam + günlük ortalama kartları doğru sayıları gösteriyor
- [ ] Kategori dağılımı doğru oranlarda çubuklarla gösteriliyor
- [ ] Tarih aralığı filtreleme doğru sonuçları listeliyor, sonuç yokken uygun mesaj gösteriyor
- [ ] Boş/geçersiz formla gönderim yapıldığında backend'in alan bazlı Türkçe hata mesajları formda görünüyor
- [ ] Var olmayan bir kaydı silmeye/güncellemeye çalışınca 404 hatası ekranda görünüyor (konsolda sessiz sessiz kaybolmuyor)

---

## Sonraki Proje İçin Not

Bu ilk React projesi kapsamlı olarak bırakılan konular — sıradaki bir frontend projesinde bunları ekleyebilirsin:
- **React Router** — birden fazla sayfa/URL gerektiren uygulamalar için (bu proje tek sayfalık bir dashboard olduğu için gerekmedi)
- **Global state kütüphaneleri** (Redux, Zustand) — bu projedeki state ihtiyacı `useState` + prop geçmekle rahatça karşılandı, ama büyük uygulamalarda prop'ları çok katman aşağı taşımak (`prop drilling`) zorlaşabilir
- **Form kütüphaneleri** (`react-hook-form`) — çok alanlı, karmaşık validasyonlu formlarda elle yazılan `useState`'ler yerine kullanılır
- **Chart kütüphanesi** (`recharts`, `chart.js`) — kategori dağılımını gerçek bir pasta/bar grafiği olarak çizmek için (biz bilinçli olarak sade CSS çubuklarla yetindik)
- **Test** (`Vitest` + `React Testing Library`) — backend'deki `ExpenseServiceTest.java`'nın frontend karşılığı
- **`.env` ile API URL yönetimi** — şu an `API_BASE_URL` kod içine sabit yazılı; production'da farklı bir backend adresine deploy edeceksen ortam değişkenine taşınması gerekir
- **Production build & deploy** (`npm run build`, statik dosyaları bir sunucuya/CDN'e koyma)
- **Backend'e auth eklenirse** — şu an backend tamamen açık (kimlik doğrulama yok); ileride eklenirse frontend'in her `fetch` isteğine bir token eklemesi gerekecek
