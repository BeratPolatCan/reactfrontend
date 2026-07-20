import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPage from './AuthPage'
import { ApiError } from '../api/httpClient'

const login = vi.fn()
const register = vi.fn()

// useAuth'u mock'luyoruz: bu testler AuthPage'in DAVRANISINI dogruluyor,
// context'in kendisini degil (o AuthContext.test.tsx'te test ediliyor).
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ login, register, isAuthenticated: false, logout: vi.fn() }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  login.mockResolvedValue(undefined)
  register.mockResolvedValue(undefined)
})

async function formuDoldur(kullanici: ReturnType<typeof userEvent.setup>, ad = 'berat') {
  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), ad)
  await kullanici.type(screen.getByLabelText('Şifre'), 'parola123')
}

describe('AuthPage - mod gecisi', () => {
  it('varsayilan olarak giris modunda acilir', () => {
    render(<AuthPage />)

    expect(screen.getByText('Hesabına giriş yap')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeInTheDocument()
  })

  it('kayit moduna gecebilir ve geri donebilir', async () => {
    const kullanici = userEvent.setup()
    render(<AuthPage />)

    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))
    expect(screen.getByText('Yeni bir hesap oluştur')).toBeInTheDocument()

    await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }))
    expect(screen.getByText('Hesabına giriş yap')).toBeInTheDocument()
  })

  it('mod degisince onceki hata mesaji temizlenir', async () => {
    const kullanici = userEvent.setup()
    login.mockRejectedValueOnce(new Error('bir hata'))
    render(<AuthPage />)

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }))
    expect(await screen.findByText('bir hata')).toBeInTheDocument()

    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    expect(screen.queryByText('bir hata')).not.toBeInTheDocument()
  })
})

describe('AuthPage - gonderim', () => {
  it('giris modunda login cagirir', async () => {
    const kullanici = userEvent.setup()
    render(<AuthPage />)

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }))

    expect(login).toHaveBeenCalledWith({ username: 'berat', password: 'parola123' })
    expect(register).not.toHaveBeenCalled()
  })

  it('kayit modunda register cagirir', async () => {
    const kullanici = userEvent.setup()
    render(<AuthPage />)
    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    expect(register).toHaveBeenCalledWith({ username: 'berat', password: 'parola123' })
    expect(login).not.toHaveBeenCalled()
  })

  // Kullanici adinin bas/son bosluklari temizleniyor; " berat" ile "berat"
  // ayri hesaplar gibi gorunmemeli.
  it('kullanici adinin bosluklarini kirpar', async () => {
    const kullanici = userEvent.setup()
    render(<AuthPage />)

    await formuDoldur(kullanici, '  berat  ')
    await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }))

    expect(login).toHaveBeenCalledWith({ username: 'berat', password: 'parola123' })
  })
})

describe('AuthPage - hata yollari', () => {
  it('401 icin anlasilir bir mesaj gosterir ("Bad credentials" degil)', async () => {
    const kullanici = userEvent.setup()
    login.mockRejectedValueOnce(new ApiError('Bad credentials', 401))
    render(<AuthPage />)

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }))

    expect(await screen.findByText('Kullanıcı adı veya şifre hatalı')).toBeInTheDocument()
    expect(screen.queryByText('Bad credentials')).not.toBeInTheDocument()
  })

  it('backend alan hatalarini ilgili alanin altinda gosterir', async () => {
    const kullanici = userEvent.setup()
    register.mockRejectedValueOnce(
      new ApiError('gecersiz', 400, { username: 'en az 3 karakter olmali' }),
    )
    render(<AuthPage />)
    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    expect(await screen.findByText('en az 3 karakter olmali')).toBeInTheDocument()
  })

  it('diger hatalarda sunucu mesajini gosterir', async () => {
    const kullanici = userEvent.setup()
    register.mockRejectedValueOnce(new ApiError('Bu kullanici adi zaten alinmis', 409))
    render(<AuthPage />)
    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }))

    expect(await screen.findByText('Bu kullanici adi zaten alinmis')).toBeInTheDocument()
  })

  // Cift gonderimi engeller: istek surerken buton kilitli olmali.
  it('istek surerken buton devre disi kalir', async () => {
    const kullanici = userEvent.setup()
    let cozumle: () => void = () => {}
    login.mockReturnValueOnce(new Promise<void>((res) => { cozumle = res }))
    render(<AuthPage />)

    await formuDoldur(kullanici)
    await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }))

    const buton = await screen.findByRole('button', { name: 'Lütfen bekle...' })
    expect(buton).toBeDisabled()

    cozumle()
    await screen.findByRole('button', { name: 'Giriş yap' })
  })
})

describe('AuthPage - guvenlik', () => {
  // Repo public: giris ekrani calisan bir parolayi ekranda ILAN ETMEMELI.
  // Backend'de sabit "demo1234" Sonar tarafindan BLOCKER olarak isaretlenip
  // kaldirilmisti; ayni deger frontend'de kalmisti.
  it('ekranda sabit bir demo parolasi gostermez', () => {
    render(<AuthPage />)

    expect(screen.queryByText(/demo1234/)).not.toBeInTheDocument()
  })
})
