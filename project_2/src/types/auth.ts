// Kimlik doğrulama ile ilgili paylaşılan tipler.

// Login ve register formlarının backend'e gönderdiği gövde.
export interface Credentials {
  username: string;
  password: string;
}

// /api/auth/login ve /api/auth/refresh uçlarının döndürdüğü gövde.
// (Refresh token gövdede DEĞİL; httpOnly cookie olarak gelir, JS erişemez.)
export interface AuthResponse {
  accessToken: string;
}
