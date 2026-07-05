// Korumalı (auth gerektiren) API çağrıları için ortak istemci.
//
// Görevleri:
//   1. Her isteğe access token'ı "Authorization: Bearer ..." olarak ekler.
//   2. Yanıt 401 ise: access token büyük ihtimalle dolmuştur → cookie'deki
//      refresh token ile SESSİZCE yeni bir access token alıp isteği bir kez
//      tekrarlar. Kullanıcı hiçbir kesinti görmez.
//   3. Refresh de başarısızsa: token temizlenir ve "auth:expired" olayı
//      yayınlanır; AuthContext bunu yakalayıp kullanıcıyı login ekranına atar.

import { API_ROOT } from "./apiConfig";
import { getAccessToken, setAccessToken, clearAccessToken } from "../auth/tokenStore";

// Backend'in döndürdüğü hataları taşıyan tek hata tipi.
// - message: kullanıcıya gösterilecek genel mesaj
// - status:  HTTP durum kodu (401, 409, ... duruma göre davranmak için)
// - fieldErrors: doğrulama hatalarında alan bazlı mesajlar { amount: "...", ... }
export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Fetch yanıtını istenen tipe çevirir; başarısızsa ApiError fırlatır.
// authApi de bu yardımcıyı kullanır, o yüzden export ediyoruz.
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.errors) {
      throw new ApiError("Girdiğin bilgilerde hata var", response.status, body.errors);
    }
    throw new ApiError(body?.message ?? `İstek başarısız: ${response.status}`, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// İsteği, geçerli access token'ı başlığa ekleyerek gönderir.
function sendWithAuth(path: string, options: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${API_ROOT}${path}`, { ...options, headers });
}

// Aynı anda birden çok istek 401 alırsa (liste + özetler hep birlikte yüklenir)
// hepsi ayrı ayrı refresh çağırmasın: ilk refresh'in promise'ini paylaşırlar.
// Refresh token her kullanımda rotate edildiği için bu şart — yoksa ikinci
// refresh, ilkinin döndürdüğü cookie'yi geçersiz bulup oturumu düşürür.
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  try {
    // credentials:'include' → tarayıcı httpOnly refresh cookie'sini gönderir.
    const response = await fetch(`${API_ROOT}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("refresh failed");
    }
    const data = (await response.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return true;
  } catch {
    // Refresh de olmadı → oturum gerçekten bitti.
    clearAccessToken();
    window.dispatchEvent(new Event("auth:expired"));
    return false;
  }
}

// Korumalı uçlara istek atmak için tek giriş noktası.
// path, API köküne göre görecelidir: örn. "/api/expenses/page?page=0".
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response = await sendWithAuth(path, options);

  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await sendWithAuth(path, options); // yeni token ile bir kez tekrar dene
    }
  }

  return handleResponse<T>(response);
}
