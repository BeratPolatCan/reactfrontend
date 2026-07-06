// Uygulamanın kimlik doğrulama durumunu (giriş yapıldı mı?) ve login/register/
// logout işlemlerini tüm bileşenlere sağlayan React context'i.
//
// - Token'ı localStorage'dan başlatır → sayfa yenilense de oturum korunur.
// - httpClient, refresh de başarısız olduğunda "auth:expired" olayını yayınlar;
//   burada onu dinleyip kullanıcıyı otomatik olarak login ekranına düşürüyoruz.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";
import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
} from "../api/authApi";  
import type { Credentials } from "../types/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Oturum durumunun tek göstergesi: elimizde access token var mı?
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  useEffect(() => {
    function handleExpired() {
      setToken(null);
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  async function login(credentials: Credentials) {
    const { accessToken } = await loginApi(credentials);
    setAccessToken(accessToken); // localStorage
    setToken(accessToken); // React state → UI güncellenir
  }

  async function register(credentials: Credentials) {
    await registerApi(credentials);
    // Kayıt sonrası otomatik giriş → kullanıcı doğrudan uygulamaya alınır.
    await login(credentials);
  }

  async function logout() {
    try {
      await logoutApi(); // sunucudaki refresh token'ı iptal et + cookie'yi temizle
    } catch {
      // Sunucu erişilemese bile yerel çıkışı tamamla.
    }
    clearAccessToken();
    setToken(null);
  }

  const value: AuthContextValue = {
    isAuthenticated: token !== null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth yalnızca <AuthProvider> içinde kullanılabilir");
  }
  return context;
}
