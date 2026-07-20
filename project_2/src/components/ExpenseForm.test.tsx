import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseForm from './ExpenseForm'
import type { Expense } from '../types/expense'
import { ApiError } from '../api/httpClient'

// expenseApi mock'lanir: bu testler formun DAVRANISINI dogrular, ag katmanini degil.
vi.mock('../api/expenseApi', async () => {
  const { ApiError } = await import('./../api/httpClient')
  return {
    ApiError,
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
  }
})

import { createExpense, updateExpense } from '../api/expenseApi'

const mevcutGider: Expense = {
  id: 42,
  description: 'Market alisverisi',
  amount: 450.75,
  date: '2026-07-05',
  category: 'FOOD',
}

function formuAc(props: Partial<React.ComponentProps<typeof ExpenseForm>> = {}) {
  const varsayilan = {
    editingExpense: null,
    onSaved: vi.fn(),
    onCancelEdit: vi.fn(),
    onRefreshNeeded: vi.fn(),
  }
  const tum = { ...varsayilan, ...props }
  render(<ExpenseForm {...tum} />)
  return tum
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExpenseForm - ekleme modu', () => {
  it('editingExpense yoksa bos form ve "Yeni Gider Ekle" basligi gosterir', () => {
    formuAc()

    expect(screen.getByText('Yeni Gider Ekle')).toBeInTheDocument()
    expect(screen.getByLabelText('Açıklama')).toHaveValue('')
    expect(screen.getByLabelText('Tutar')).toHaveValue(null)
    // Ekleme modunda "Vazgeç" butonu olmamali.
    expect(screen.queryByRole('button', { name: 'Vazgeç' })).not.toBeInTheDocument()
  })

  it('doldurulan degerlerle createExpense cagirir ve onSaved tetikler', async () => {
    const kullanici = userEvent.setup()
    const { onSaved } = formuAc()

    await kullanici.type(screen.getByLabelText('Açıklama'), 'Kahve')
    await kullanici.type(screen.getByLabelText('Tutar'), '75')
    await kullanici.type(screen.getByLabelText('Tarih'), '2026-07-17')
    await kullanici.selectOptions(screen.getByLabelText('Kategori'), 'FOOD')
    await kullanici.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(createExpense).toHaveBeenCalledWith({
      description: 'Kahve',
      amount: 75,
      date: '2026-07-17',
      category: 'FOOD',
    })
    expect(onSaved).toHaveBeenCalledOnce()
    expect(updateExpense).not.toHaveBeenCalled()
  })

  it('basarili kayittan sonra formu temizler', async () => {
    const kullanici = userEvent.setup()
    formuAc()

    await kullanici.type(screen.getByLabelText('Açıklama'), 'Kahve')
    await kullanici.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(screen.getByLabelText('Açıklama')).toHaveValue('')
  })
})

describe('ExpenseForm - duzenleme modu', () => {
  // Bu testler props->state senkronunu koruyor: editingExpense verilince
  // alanlarin DOLU gelmesi formun sozlesmesi.
  it('editingExpense verilince alanlari onun degerleriyle doldurur', () => {
    formuAc({ editingExpense: mevcutGider })

    expect(screen.getByText('Gideri Düzenle')).toBeInTheDocument()
    expect(screen.getByLabelText('Açıklama')).toHaveValue('Market alisverisi')
    expect(screen.getByLabelText('Tutar')).toHaveValue(450.75)
    expect(screen.getByLabelText('Tarih')).toHaveValue('2026-07-05')
    expect(screen.getByLabelText('Kategori')).toHaveValue('FOOD')
  })

  it('duzenleme modunda updateExpense cagirir (createExpense degil)', async () => {
    const kullanici = userEvent.setup()
    const { onSaved } = formuAc({ editingExpense: mevcutGider })

    await kullanici.click(screen.getByRole('button', { name: 'Güncelle' }))

    expect(updateExpense).toHaveBeenCalledWith(42, {
      description: 'Market alisverisi',
      amount: 450.75,
      date: '2026-07-05',
      category: 'FOOD',
    })
    expect(createExpense).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('Vazgec butonu onCancelEdit tetikler', async () => {
    const kullanici = userEvent.setup()
    const { onCancelEdit } = formuAc({ editingExpense: mevcutGider })

    await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(onCancelEdit).toHaveBeenCalledOnce()
  })
})

describe('ExpenseForm - hata yollari', () => {
  it('backend alan hatalarini ilgili alanin altinda gosterir', async () => {
    const kullanici = userEvent.setup()
    vi.mocked(createExpense).mockRejectedValueOnce(
      new ApiError('Girdiğin bilgilerde hata var', 400, { amount: 'must be greater than 0' }),
    )
    const { onRefreshNeeded } = formuAc()

    await kullanici.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(await screen.findByText('must be greater than 0')).toBeInTheDocument()
    expect(onRefreshNeeded).toHaveBeenCalledOnce()
  })

  it('alan hatasi olmayan hatalarda genel hata mesaji gosterir', async () => {
    const kullanici = userEvent.setup()
    vi.mocked(createExpense).mockRejectedValueOnce(new Error('Sunucuya ulasilamadi'))
    formuAc()

    await kullanici.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(await screen.findByText('Sunucuya ulasilamadi')).toBeInTheDocument()
  })

  it('hata durumunda formu TEMIZLEMEZ (kullanici yazdigini kaybetmesin)', async () => {
    const kullanici = userEvent.setup()
    vi.mocked(createExpense).mockRejectedValueOnce(new Error('hata'))
    formuAc()

    await kullanici.type(screen.getByLabelText('Açıklama'), 'Kahve')
    await kullanici.click(screen.getByRole('button', { name: 'Ekle' }))

    await screen.findByText('hata')
    expect(screen.getByLabelText('Açıklama')).toHaveValue('Kahve')
  })
})
