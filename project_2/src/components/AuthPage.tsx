import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/httpClient";
import type { Credentials } from "../types/auth";

type Mode = "login" | "register";

// Giriş yapılmamışken gösterilen tek ekran: Login ile Register arasında geçiş yapar.
// Başarılı olunca AuthProvider isAuthenticated'i true yapar ve App otomatik olarak
// asıl uygulamaya geçer (bu bileşenin ayrıca yönlendirme yapmasına gerek yok).
function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const credentials: Credentials = { username: username.trim(), password };
      if (isLogin) {
        await login(credentials);
      } else {
        await register(credentials);
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else if (isLogin && err instanceof ApiError && err.status === 401) {
        // Backend "Bad credentials" döndürür; kullanıcıya daha anlaşılır mesaj göster.
        setError("Kullanıcı adı veya şifre hatalı");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setError(null);
    setFieldErrors({});
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Gider Takip</h1>
        <p className="auth-subtitle">
          {isLogin ? "Hesabına giriş yap" : "Yeni bir hesap oluştur"}
        </p>

        {/* label htmlFor <-> input id: olmadan ekran okuyucu alan adini okuyamaz
            ve etikete tiklamak input'a odaklanmaz. */}
        <div className="field">
          <label htmlFor="auth-username">Kullanıcı adı</label>
          <input
            id="auth-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
        </div>

        <div className="field">
          <label htmlFor="auth-password">Şifre</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </div>

        <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Lütfen bekle..." : isLogin ? "Giriş yap" : "Kayıt ol"}
        </button>

        {error && <p className="error">{error}</p>}

        <p className="auth-switch">
          {isLogin ? "Hesabın yok mu? " : "Zaten hesabın var mı? "}
          <button type="button" className="auth-link" onClick={switchMode}>
            {isLogin ? "Kayıt ol" : "Giriş yap"}
          </button>
        </p>

        {/* Demo hesap ipucu artik SABIT DEGIL, ortamdan geliyor.
            Onceden "demo / demo1234" ekranda yaziliydi; repo public oldugu icin
            calisan bir parolayi ilan etmek demekti (ayni sabit backend'de
            DataSeeder'da da vardi ve Sonar tarafindan BLOCKER isaretlenmisti).
            Ustelik backend'de demo hesabi artik yalnizca DEMO_PASSWORD tanimliysa
            olusuyor -- yani sabit ipucu cogu zaman YANLIS bilgi veriyordu.

            Yerelde gostermek istersen .env'e ekle:
              VITE_DEMO_HINT=demo / senin-yerel-parolan */}
        {isLogin && import.meta.env.VITE_DEMO_HINT && (
          <p className="auth-hint">
            Demo hesap: <strong>{import.meta.env.VITE_DEMO_HINT}</strong>
          </p>
        )}
      </form>
    </div>
  );
}

export default AuthPage;
