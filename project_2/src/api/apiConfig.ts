// Backend kök adresini tek yerde belirler; hem harcama (expenseApi) hem kimlik
// doğrulama (authApi) çağrıları buradan beslenir.
//
// Öncelik sırası:
//   1. VITE_API_BASE_URL env değişkeni (dolu ise her şeyi ezer)
//   2. Üretim build'i ise (Vercel) → canlı Railway backend'i
//   3. Aksi halde (npm run dev) → yerel geliştirme sunucusu
//
// Not: Bu mantık önceden expenseApi.ts içindeydi; auth uçları da aynı kökü
// kullansın diye ortak bir modüle taşındı.

const PROD_API_ROOT = "https://springboot-production-7df8.up.railway.app";
const DEV_API_ROOT = "http://localhost:8080";

// Env değişkeni protokolsüz ("host.com") girilirse tarayıcı bunu göreli yol
// sanar ve Vercel domain'ine ekleyip 404 döner. Bu yüzden protokolü garanti
// altına alıp (yoksa https:// ekle) sondaki fazlalık /'ları temizliyoruz.
function normalizeApiRoot(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Env değişkeni Vercel'de tanımlı ama BOŞ olabilir; "" değeri ?? ile
// yakalanmaz, o yüzden boş/whitespace'i "tanımsız" gibi ele alıyoruz.
const envRoot = import.meta.env.VITE_API_BASE_URL?.trim();
const RAW_API_ROOT =
  envRoot && envRoot.length > 0
    ? envRoot
    : import.meta.env.PROD
      ? PROD_API_ROOT
      : DEV_API_ROOT;

export const API_ROOT = normalizeApiRoot(RAW_API_ROOT);
