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