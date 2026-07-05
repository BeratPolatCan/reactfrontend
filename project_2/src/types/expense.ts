export type Category =
  | "FOOD"
  | "TRANSPORT"
  | "BILLS"
  | "ENTERTAINMENT"
  | "HEALTH"
  | "SHOPPING"
  | "OTHER";

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string; // "yyyy-MM-dd" formatında (backend'in LocalDate'i JSON'da böyle görünür)
  category: Category;
  // Backend'in otomatik doldurduğu denetim (audit) alanları. ISO zaman damgası
  // (örn. "2026-07-05T14:34:00Z"). owner-scoped olduğu için *By alanları hep
  // giriş yapan kullanıcıdır; UI'da sadece tarih+saat'leri gösteriyoruz.
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

export interface ExpenseInput {
  description: string;
  amount: number;
  date: string;
  category: Category;
}

export interface CategorySummary {
  category: Category;
  totalAmount: number;
}

export interface Last30DaysSummary {
  totalAmount: number;
  dailyAverage: number;
}

// Backend'in /page endpoint'inin döndürdüğü sayfa cevabı.
export interface ExpensePage {
  content: Expense[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}