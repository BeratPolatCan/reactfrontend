import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateRangeFilter from './DateRangeFilter'
import type { Expense } from '../types/expense'

vi.mock('../api/expenseApi', () => ({
  getExpensesByRange: vi.fn(),
}))

import { getExpensesByRange } from '../api/expenseApi'

const gider: Expense = {
  id: 1,
  description: 'Market alisverisi',
  amount: 450.75,
  date: '2026-07-05',
  category: 'FOOD',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getExpensesByRange).mockResolvedValue([])
})

async function araligiDoldurVeFiltrele() {
  const kullanici = userEvent.setup()
  await kullanici.type(screen.getByLabelText('Başlangıç'), '2026-07-01')
  await kullanici.type(screen.getByLabelText('Bitiş'), '2026-07-31')
  await kullanici.click(screen.getByRole('button', { name: 'Filtrele' }))
}

describe('DateRangeFilter - filtreleme', () => {
  it('acilista istek atmaz (tarihler bos)', () => {
    render(<DateRangeFilter refreshKey={0} />)
    expect(getExpensesByRange).not.toHaveBeenCalled()
  })

  it('secilen aralikla getExpensesByRange cagirir ve sonuclari listeler', async () => {
    vi.mocked(getExpensesByRange).mockResolvedValue([gider])
    render(<DateRangeFilter refreshKey={0} />)

    await araligiDoldurVeFiltrele()

    expect(getExpensesByRange).toHaveBeenCalledWith('2026-07-01', '2026-07-31')
    expect(await screen.findByText(/Market alisverisi/)).toBeInTheDocument()
  })

  it('sonuc bossa "bulunamadi" mesaji gosterir', async () => {
    render(<DateRangeFilter refreshKey={0} />)

    await araligiDoldurVeFiltrele()

    expect(await screen.findByText('Bu aralıkta gider bulunamadı.')).toBeInTheDocument()
  })
})

describe('DateRangeFilter - refreshKey ile tazeleme', () => {
  it('tarihler DOLUYKEN refreshKey degisince yeniden sorgular', async () => {
    const { rerender } = render(<DateRangeFilter refreshKey={0} />)
    await araligiDoldurVeFiltrele()
    expect(getExpensesByRange).toHaveBeenCalledTimes(1)

    // App.tsx bir gider eklendiginde/silindiginde refreshKey'i artirir.
    rerender(<DateRangeFilter refreshKey={1} />)

    expect(getExpensesByRange).toHaveBeenCalledTimes(2)
  })

  it('tarihler BOSKEN refreshKey degisse bile sorgu atmaz', () => {
    const { rerender } = render(<DateRangeFilter refreshKey={0} />)

    rerender(<DateRangeFilter refreshKey={1} />)

    expect(getExpensesByRange).not.toHaveBeenCalled()
  })
})

describe('DateRangeFilter - hata yolu', () => {
  it('istek patlarsa hata mesajini gosterir', async () => {
    vi.mocked(getExpensesByRange).mockRejectedValueOnce(new Error('Sunucuya ulasilamadi'))
    render(<DateRangeFilter refreshKey={0} />)

    await araligiDoldurVeFiltrele()

    expect(await screen.findByText('Sunucuya ulasilamadi')).toBeInTheDocument()
  })

  // Bu test setError(null) cagrisinin effect basindan sonuca tasinmasini
  // koruyor: basarili bir sorgudan sonra ONCEKI hata mesaji ekranda KALMAMALI.
  it('basarili sorgudan sonra onceki hata mesaji temizlenir', async () => {
    vi.mocked(getExpensesByRange).mockRejectedValueOnce(new Error('gecici hata'))
    render(<DateRangeFilter refreshKey={0} />)

    await araligiDoldurVeFiltrele()
    expect(await screen.findByText('gecici hata')).toBeInTheDocument()

    vi.mocked(getExpensesByRange).mockResolvedValue([gider])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Filtrele' }))

    expect(await screen.findByText(/Market alisverisi/)).toBeInTheDocument()
    expect(screen.queryByText('gecici hata')).not.toBeInTheDocument()
  })
})
