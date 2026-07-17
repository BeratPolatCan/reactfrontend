// Backend kök adresini tek yerde belirler; hem harcama (expenseApi) hem kimlik
// doğrulama (authApi) çağrıları buradan beslenir.
//
// Öncelik sırası:
//   1. VITE_API_BASE_URL env değişkeni (dolu ise ezer)
//   2. Aksi halde yerel backend
//
// Not: Bu mantık önceden expenseApi.ts içindeydi; auth uçları da aynı kökü
// kullansın diye ortak bir modüle taşındı.

const DEFAULT_API_ROOT = "http://localhost:8080";

// Env değişkeni protokolsüz ("host.com") girilirse tarayıcı bunu göreli yol
// sanar ve mevcut domain'e ekleyip 404 döner. Bu yüzden protokolü garanti
// altına alıp (yoksa https:// ekle) sondaki fazlalık /'ları temizliyoruz.
function normalizeApiRoot(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Env değişkeni tanımlı ama BOŞ olabilir; "" değeri ?? ile yakalanmaz,
// o yüzden boş/whitespace'i "tanımsız" gibi ele alıyoruz.
const envRoot = import.meta.env.VITE_API_BASE_URL?.trim();
const RAW_API_ROOT = envRoot && envRoot.length > 0 ? envRoot : DEFAULT_API_ROOT;

export const API_ROOT = normalizeApiRoot(RAW_API_ROOT);
