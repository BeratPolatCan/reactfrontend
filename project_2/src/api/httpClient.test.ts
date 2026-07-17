import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { request, handleResponse, ApiError } from './httpClient'
import { setAccessToken, getAccessToken } from '../auth/tokenStore'

const ESKI = 'suresi-dolmus-token'
const YENI = 'tazelenmis-token'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Gercek backend davranisini taklit eden mock:
//   - /api/auth/refresh  -> yeni access token doner
//   - korumali uclar     -> "Bearer YENI" ile 200, aksi halde 401
// Cagri SIRASINA degil, gonderilen token'a gore karar veriyor; boylece
// esszamanli istekler nasil siralanirsa siralansin test kararli kalir.
function backendKur(opts: { refreshBasarili?: boolean } = {}) {
  const { refreshBasarili = true } = opts
  let refreshSayisi = 0

  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url)

    if (u.endsWith('/api/auth/refresh')) {
      refreshSayisi++
      if (!refreshBasarili) return new Response('', { status: 401 })
      return jsonResponse({ accessToken: YENI })
    }

    const auth = new Headers(init?.headers).get('Authorization')
    if (auth === `Bearer ${YENI}`) return jsonResponse({ yol: u })
    return new Response('', { status: 401 })
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, refreshSayisi: () => refreshSayisi }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('request - token basliga eklenmesi', () => {
  it('token varsa Authorization: Bearer basligini ekler', async () => {
    setAccessToken(YENI)
    const { fetchMock } = backendKur()

    await request('/api/expenses')

    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${YENI}`)
  })

  it('token yoksa Authorization basligi gondermez', async () => {
    // Mock'u fetch'in tipiyle tanimliyoruz: parametre yazmadan da mock.calls
    // dogru tiplenir. Aksi halde TypeScript calls'i bos tuple sanar ve
    // [, init] ile okunamaz.
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/expenses')

    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).get('Authorization')).toBeNull()
  })
})

describe('request - 401 sonrasi sessiz refresh', () => {
  it('401 alinca refresh yapip istegi yeni token ile TEKRAR dener', async () => {
    setAccessToken(ESKI)
    const { fetchMock } = backendKur()

    const sonuc = await request<{ yol: string }>('/api/expenses')

    // Kullanici hicbir kesinti gormemeli: istek sonunda basarili.
    expect(sonuc.yol).toContain('/api/expenses')
    // Yeni token saklanmis olmali.
    expect(getAccessToken()).toBe(YENI)
    // 3 cagri: (1) 401 alan ilk istek, (2) refresh, (3) tekrar denenen istek.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('refresh cagrisini credentials:include ile yapar (httpOnly cookie gitsin diye)', async () => {
    setAccessToken(ESKI)
    const { fetchMock } = backendKur()

    await request('/api/expenses')

    const refreshCagrisi = fetchMock.mock.calls.find(([u]) =>
      String(u).endsWith('/api/auth/refresh'),
    )
    expect(refreshCagrisi?.[1]).toMatchObject({ method: 'POST', credentials: 'include' })
  })
})

describe('request - esszamanli 401ler', () => {
  // Bu, httpClient'taki paylasilan refreshPromise'in varlik sebebi:
  // refresh token her kullanimda rotate edildigi icin ikinci bir refresh,
  // ilkinin dondurdugu cookie'yi gecersiz bulup oturumu dusururdu.
  it('ayni anda 401 alan iki istek icin SADECE BIR kez refresh cagirir', async () => {
    setAccessToken(ESKI)
    const { fetchMock, refreshSayisi } = backendKur()

    await Promise.all([request('/api/expenses'), request('/api/summary')])

    expect(refreshSayisi()).toBe(1)

    const refreshCagrilari = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith('/api/auth/refresh'),
    )
    expect(refreshCagrilari).toHaveLength(1)
  })
})

describe('request - refresh de basarisizsa', () => {
  it('token temizlenir ve auth:expired olayi yayinlanir', async () => {
    setAccessToken(ESKI)
    backendKur({ refreshBasarili: false })

    const dinleyici = vi.fn()
    window.addEventListener('auth:expired', dinleyici)

    await expect(request('/api/expenses')).rejects.toBeInstanceOf(ApiError)

    expect(getAccessToken()).toBeNull()
    expect(dinleyici).toHaveBeenCalledTimes(1)

    window.removeEventListener('auth:expired', dinleyici)
  })

  it('refresh basarisizsa istegi TEKRAR denemez (sonsuz donguye girmez)', async () => {
    setAccessToken(ESKI)
    const { fetchMock } = backendKur({ refreshBasarili: false })

    await expect(request('/api/expenses')).rejects.toThrow()

    // Sadece 2 cagri olmali: (1) 401 alan istek, (2) basarisiz refresh.
    // Ucuncu bir "tekrar deneme" olmamali.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('handleResponse', () => {
  it('dogrulama hatalarinda fieldErrors tasiyan ApiError firlatir', async () => {
    const yanit = jsonResponse({ errors: { amount: 'must be greater than 0' } }, 400)

    const hata = await handleResponse(yanit).catch((e: unknown) => e)

    expect(hata).toBeInstanceOf(ApiError)
    expect((hata as ApiError).status).toBe(400)
    expect((hata as ApiError).fieldErrors).toEqual({ amount: 'must be greater than 0' })
  })

  it('backend mesaji varsa onu kullanir', async () => {
    const yanit = jsonResponse({ message: 'Bu e-posta zaten kayitli' }, 409)

    const hata = (await handleResponse(yanit).catch((e: unknown) => e)) as ApiError

    expect(hata.status).toBe(409)
    expect(hata.message).toBe('Bu e-posta zaten kayitli')
  })

  it('govdesiz hata yanitinda genel mesaj uretir', async () => {
    const hata = (await handleResponse(new Response('', { status: 500 })).catch(
      (e: unknown) => e,
    )) as ApiError

    expect(hata.status).toBe(500)
    expect(hata.message).toContain('500')
  })

  it('204 gibi govdesiz basarili yanitta patlamaz (undefined doner)', async () => {
    // response.json() bos govdede "Unexpected end of JSON input" atardi;
    // handleResponse'un onceden metni okumasinin sebebi bu.
    // NOT: Fetch spec'i 204'un govdesinin null OLMASINI zorunlu tutar; bos
    // string verilirse Response yapicisi "Invalid response status code" atar.
    const sonuc = await handleResponse(new Response(null, { status: 204 }))
    expect(sonuc).toBeUndefined()
  })

  it('dolu govdeyi parse eder', async () => {
    const sonuc = await handleResponse<{ id: number }>(jsonResponse({ id: 7 }))
    expect(sonuc).toEqual({ id: 7 })
  })
})
