import { describe, it, expect } from 'vitest'
import { formatTRY, formatDateTime } from './format'

// NOT: Intl ciktisinin TAM esitligini test etmiyoruz. Para/tarih bicimlendirmesi
// Node'un ICU surumune gore degisebilir (bosluk tipi, simge konumu), bu da testi
// bizim kodumuz bozulmadan kirmizi yapar. Bizim kodumuzun sorumlulugu olan
// davranisi test ediyoruz; Intl'in kendi dogrulugu bizim isimiz degil.
describe('formatTRY', () => {
  it('tr-TR bicimiyle binlik ve ondalik ayiricisini uygular', () => {
    const sonuc = formatTRY(1234.56)
    expect(sonuc).toContain('1.234,56')
    expect(sonuc).toContain('₺')
  })

  it('her zaman iki ondalik basamak gosterir', () => {
    expect(formatTRY(5)).toContain('5,00')
  })

  it('negatif tutari isaretiyle gosterir', () => {
    expect(formatTRY(-50)).toContain('50,00')
    expect(formatTRY(-50)).toContain('-')
  })

  it('sifiri bicimlendirebilir', () => {
    expect(formatTRY(0)).toContain('0,00')
  })
})

describe('formatDateTime', () => {
  // Asil is mantigimiz bu: "deger yoksa/bozuksa tire don".
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['bos string', ''],
  ])('%s icin tire doner', (_ad, girdi) => {
    expect(formatDateTime(girdi)).toBe('—')
  })

  it('gecersiz tarih string icin tire doner', () => {
    expect(formatDateTime('bu-bir-tarih-degil')).toBe('—')
  })

  it('gecerli ISO damgasini bicimlendirir', () => {
    const sonuc = formatDateTime('2026-07-05T14:34:00Z')
    expect(sonuc).not.toBe('—')
    expect(sonuc).toContain('2026')
  })
})
