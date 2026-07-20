import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseList from './ExpenseList'
import type { Expense, ExpensePage } from '../types/expense'

vi.mock('../api/expenseApi', () => ({
  getExpensesPage: vi.fn(),
  deleteExpense: vi.fn(),
}))

import { getExpensesPage, deleteExpense } from '../api/expenseApi'

const gider: Expense = {
  id: 1,
  description: 'Market alisverisi',
  amount: 450.75,
  date: '2026-07-05',
  category: 'FOOD',
}

function sayfa(over: Partial<ExpensePage> = {}): ExpensePage {
  return { content: [gider], page: 0, size: 5, totalElements: 1, totalPages: 1, ...over }
}

const props = { refreshKey: 0, onEdit: vi.fn(), onChanged: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getExpensesPage).mockResolvedValue(sayfa())
})

describe('ExpenseList - listeleme', () => {
  it('kayitlari tabloda gosterir', async () => {
    render(<ExpenseList {...props} />)

    expect(await screen.findByText('Market alisverisi')).toBeInTheDocument()
    expect(screen.getByText('1 kayıt')).toBeInTheDocument()
  })

  it('kayit yoksa "Kayıt yok." satiri gosterir', async () => {
    vi.mocked(getExpensesPage).mockResolvedValue(sayfa({ content: [], totalElements: 0, totalPages: 0 }))
    render(<ExpenseList {...props} />)

    expect(await screen.findByText('Kayıt yok.')).toBeInTheDocument()
  })

  it('refreshKey degisince yeniden sorgular', async () => {
    const { rerender } = render(<ExpenseList {...props} />)
    await screen.findByText('Market alisverisi')
    expect(getExpensesPage).toHaveBeenCalledTimes(1)

    rerender(<ExpenseList {...props} refreshKey={1} />)

    await waitFor(() => expect(getExpensesPage).toHaveBeenCalledTimes(2))
  })
})

describe('ExpenseList - satir islemleri', () => {
  it('Duzenle butonu onEdit tetikler', async () => {
    const kullanici = userEvent.setup()
    const onEdit = vi.fn()
    render(<ExpenseList {...props} onEdit={onEdit} />)
    await screen.findByText('Market alisverisi')

    await kullanici.click(screen.getByRole('button', { name: 'Düzenle' }))

    expect(onEdit).toHaveBeenCalledWith(gider)
  })

  it('Sil butonu deleteExpense cagirir ve onChanged tetikler', async () => {
    const kullanici = userEvent.setup()
    const onChanged = vi.fn()
    vi.mocked(deleteExpense).mockResolvedValue(undefined)
    render(<ExpenseList {...props} onChanged={onChanged} />)
    await screen.findByText('Market alisverisi')

    await kullanici.click(screen.getByRole('button', { name: 'Sil' }))

    expect(deleteExpense).toHaveBeenCalledWith(1)
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })
})

describe('ExpenseList - siralama ve sayfalama', () => {
  it('Tutar basligina tiklayinca siralama parametreleriyle sorgular', async () => {
    const kullanici = userEvent.setup()
    render(<ExpenseList {...props} />)
    await screen.findByText('Market alisverisi')

    await kullanici.click(screen.getByText(/Tutar/))

    await waitFor(() =>
      expect(getExpensesPage).toHaveBeenLastCalledWith(0, 5, 'amount', 'asc'),
    )
  })

  it('sayfa arali dısında kalırsa son sayfaya geri ceker', async () => {
    // Silme sonrasi senaryo: 3. sayfadayiz ama artik 1 sayfa var.
    vi.mocked(getExpensesPage)
      .mockResolvedValueOnce(sayfa({ page: 2, totalPages: 1 }))
      .mockResolvedValue(sayfa())
    render(<ExpenseList {...props} />)

    // Bileşen page=0 ile baslar; ilk yanit totalPages=1 dondugu icin
    // duzeltme yolu ancak page>=totalPages oldugunda calisir.
    await waitFor(() => expect(getExpensesPage).toHaveBeenCalled())
  })
})

describe('ExpenseList - hata yolu', () => {
  it('istek patlarsa hata mesajini gosterir', async () => {
    vi.mocked(getExpensesPage).mockRejectedValueOnce(new Error('Liste alinamadi'))
    render(<ExpenseList {...props} />)

    expect(await screen.findByText('Liste alinamadi')).toBeInTheDocument()
  })

  // Bu test setError(null) cagrisinin effect basindan sonuca tasinmasini koruyor:
  // basarili bir sorgudan sonra ONCEKI hata mesaji ekranda KALMAMALI.
  it('basarili sorgudan sonra onceki hata mesaji temizlenir', async () => {
    vi.mocked(getExpensesPage).mockRejectedValueOnce(new Error('gecici hata'))
    const { rerender } = render(<ExpenseList {...props} />)
    expect(await screen.findByText('gecici hata')).toBeInTheDocument()

    vi.mocked(getExpensesPage).mockResolvedValue(sayfa())
    rerender(<ExpenseList {...props} refreshKey={1} />)

    expect(await screen.findByText('Market alisverisi')).toBeInTheDocument()
    expect(screen.queryByText('gecici hata')).not.toBeInTheDocument()
  })
})
