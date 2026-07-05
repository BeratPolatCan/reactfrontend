// Access token'ın tek kaynağı (single source of truth): localStorage.
// Hem AuthContext (UI state) hem httpClient (istek başlığı) buradan okur/yazar.
// localStorage'da tuttuğumuz için sayfa yenilense de oturum korunur.
//
// Güvenlik notu: Refresh token BURADA DEĞİL — o, JS'in erişemediği httpOnly
// cookie'de. Burada sadece kısa ömürlü (15 dk) access token var.

const ACCESS_TOKEN_KEY = "expense.accessToken";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
