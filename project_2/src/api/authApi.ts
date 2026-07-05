// Kullanıcı sürücülü kimlik doğrulama çağrıları: login / register / logout.
//
// Bu çağrılar korumasız (permitAll) /api/auth uçlarına gider ve Bearer/refresh
// mantığından GEÇMEZ (httpClient.request kullanmaz) — çünkü bunlar oturumu daha
// yeni kuruyor. Hepsi credentials:'include' kullanır ki tarayıcı httpOnly
// refreshToken cookie'sini set edip geri gönderebilsin.
//
// (Otomatik token yenileme /api/auth/refresh, httpClient içinde ele alınır.)

import { API_ROOT } from "./apiConfig";
import { handleResponse } from "./httpClient";
import type { AuthResponse, Credentials } from "../types/auth";

const AUTH_URL = `${API_ROOT}/api/auth`;

// Yeni kullanıcı kaydı. Başarılıysa 201 (gövde yok) döner.
export async function register(credentials: Credentials): Promise<void> {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  return handleResponse<void>(response);
}

// Giriş. accessToken gövdede döner; refreshToken cookie olarak set edilir.
export async function login(credentials: Credentials): Promise<AuthResponse> {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  return handleResponse<AuthResponse>(response);
}

// Çıkış. Backend refresh token'ı iptal eder ve cookie'yi temizler.
export async function logout(): Promise<void> {
  const response = await fetch(`${AUTH_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse<void>(response);
}
