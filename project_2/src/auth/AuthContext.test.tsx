import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { getAccessToken } from './tokenStore'

vi.mock('../api/authApi', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

import { login as loginApi, register as registerApi, logout as logoutApi } from '../api/authApi'

const KIMLIK = { username: 'berat', password: 'parola123' }

function sar({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function authKancasi() {
  return renderHook(() => useAuth(), { wrapper: sar })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(loginApi).mockResolvedValue({ accessToken: 'yeni-token' })
  vi.mocked(registerApi).mockResolvedValue(undefined)
  vi.mocked(logoutApi).mockResolvedValue(undefined)
})

describe('AuthContext - baslangic durumu', () => {
  it('localStorage bossa giris yapilmamis sayilir', () => {
    const { result } = authKancasi()
    expect(result.current.isAuthenticated).toBe(false)
  })

  // Sayfa yenilendiginde oturumun korunmasinin sebebi bu: token localStorage'da.
  it('localStorage\'da token varsa giris yapilmis sayilir', () => {
    localStorage.setItem('expense.accessToken', 'kayitli-token')

    const { result } = authKancasi()

    expect(result.current.isAuthenticated).toBe(true)
  })
})

describe('AuthContext - login', () => {
  it('token\'i hem localStorage\'a hem state\'e yazar', async () => {
    const { result } = authKancasi()

    await act(async () => {
      await result.current.login(KIMLIK)
    })

    expect(loginApi).toHaveBeenCalledWith(KIMLIK)
    expect(getAccessToken()).toBe('yeni-token')      // kalicilik
    expect(result.current.isAuthenticated).toBe(true) // UI
  })

  it('login patlarsa hata yukari firlar ve giris yapilmis sayilmaz', async () => {
    vi.mocked(loginApi).mockRejectedValueOnce(new Error('Kullanici adi veya parola hatali'))
    const { result } = authKancasi()

    await expect(
      act(async () => {
        await result.current.login(KIMLIK)
      }),
    ).rejects.toThrow('Kullanici adi veya parola hatali')

    expect(result.current.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
  })
})

describe('AuthContext - register', () => {
  // Kayit sonrasi otomatik giris: kullanici ayrica login olmak zorunda kalmaz.
  it('kayittan sonra OTOMATIK giris yapar', async () => {
    const { result } = authKancasi()

    await act(async () => {
      await result.current.register(KIMLIK)
    })

    expect(registerApi).toHaveBeenCalledWith(KIMLIK)
    expect(loginApi).toHaveBeenCalledWith(KIMLIK)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('kayit patlarsa login denenmez', async () => {
    vi.mocked(registerApi).mockRejectedValueOnce(new Error('Bu e-posta zaten kayitli'))
    const { result } = authKancasi()

    await expect(
      act(async () => {
        await result.current.register(KIMLIK)
      }),
    ).rejects.toThrow('Bu e-posta zaten kayitli')

    expect(loginApi).not.toHaveBeenCalled()
  })
})

describe('AuthContext - logout', () => {
  it('sunucuya haber verir ve yerel token\'i temizler', async () => {
    localStorage.setItem('expense.accessToken', 'kayitli-token')
    const { result } = authKancasi()

    await act(async () => {
      await result.current.logout()
    })

    expect(logoutApi).toHaveBeenCalled()
    expect(getAccessToken()).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  // Onemli dayaniklilik davranisi: sunucu erisilemez olsa bile kullanici
  // cikis yapabilmeli. Aksi halde ag koptugunda oturumda kilitli kalirdi.
  it('sunucu ERISILEMEZ olsa bile yerel cikisi tamamlar', async () => {
    localStorage.setItem('expense.accessToken', 'kayitli-token')
    vi.mocked(logoutApi).mockRejectedValueOnce(new Error('Sunucuya ulasilamadi'))
    const { result } = authKancasi()

    await act(async () => {
      await result.current.logout()
    })

    expect(getAccessToken()).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})

describe('AuthContext - auth:expired olayi', () => {
  // httpClient ile ENTEGRASYON NOKTASI: refresh de basarisiz olunca httpClient
  // "auth:expired" yayinlar (bkz. httpClient.test.ts), AuthContext onu dinleyip
  // kullaniciyi login ekranina dusurur. Iki taraf da test edildigi icin
  // sozlesmenin tamami korunuyor.
  it('olay yayinlaninca oturumu dusurur', async () => {
    localStorage.setItem('expense.accessToken', 'kayitli-token')
    const { result } = authKancasi()
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('auth:expired'))
    })

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false))
  })

  it('bilesen kaldirilinca dinleyiciyi birakir (sizinti olmasin)', () => {
    const ekle = vi.spyOn(window, 'addEventListener')
    const kaldir = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(
      <AuthProvider>
        <div />
      </AuthProvider>,
    )
    expect(ekle).toHaveBeenCalledWith('auth:expired', expect.any(Function))

    unmount()

    expect(kaldir).toHaveBeenCalledWith('auth:expired', expect.any(Function))
  })
})

describe('useAuth - yanlis kullanim', () => {
  it('AuthProvider disinda cagrilirsa acik bir hata firlatir', () => {
    function Disarida() {
      useAuth()
      return null
    }
    // React hatayi konsola basar; testi kirletmesin diye susturuyoruz.
    const sessiz = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Disarida />)).toThrow(
      'useAuth yalnızca <AuthProvider> içinde kullanılabilir',
    )

    sessiz.mockRestore()
  })

  it('saglayici icindeki cocuklara deger ulasir', () => {
    function Gosterge() {
      const { isAuthenticated } = useAuth()
      return <span>{isAuthenticated ? 'girisli' : 'girissiz'}</span>
    }

    render(
      <AuthProvider>
        <Gosterge />
      </AuthProvider>,
    )

    expect(screen.getByText('girissiz')).toBeInTheDocument()
  })
})
