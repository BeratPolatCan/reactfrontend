import type {
  Expense,
  ExpenseInput,
  CategorySummary,
  Last30DaysSummary,
  ExpensePage,
} from "../types/expense";
import { request } from "./httpClient";

// ApiError'ı buradan da dışa aç: mevcut bileşenler (ör. ExpenseForm) onu
// "../api/expenseApi" üzerinden import ediyor — import yolları bozulmasın.
export { ApiError } from "./httpClient";

// Tüm harcama uçları /api/expenses altında ve artık auth (Bearer token) ister.
// request() token'ı otomatik ekler; 401 gelirse sessizce refresh + tekrar dener.
const EXPENSES_PATH = "/api/expenses";

export function getAllExpenses(): Promise<Expense[]> {
  return request<Expense[]>(EXPENSES_PATH);
}

export function getExpensesPage(
  page: number,
  size: number,
  sortField: string | null,
  sortDir: string
): Promise<ExpensePage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (sortField) {
    params.set("sortField", sortField);
    params.set("sortDir", sortDir);
  }
  return request<ExpensePage>(`${EXPENSES_PATH}/page?${params.toString()}`);
}

export function getExpenseById(id: number): Promise<Expense> {
  return request<Expense>(`${EXPENSES_PATH}/${id}`);
}

export function createExpense(input: ExpenseInput): Promise<Expense> {
  return request<Expense>(EXPENSES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  return request<Expense>(`${EXPENSES_PATH}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deleteExpense(id: number): Promise<void> {
  return request<void>(`${EXPENSES_PATH}/${id}`, { method: "DELETE" });
}

export function getExpensesByRange(
  startDate: string,
  endDate: string
): Promise<Expense[]> {
  return request<Expense[]>(
    `${EXPENSES_PATH}/range?startDate=${startDate}&endDate=${endDate}`
  );
}

export function getLast30DaysSummary(): Promise<Last30DaysSummary> {
  return request<Last30DaysSummary>(`${EXPENSES_PATH}/summary/last-30-days`);
}

export function getCategoryBreakdown(): Promise<CategorySummary[]> {
  return request<CategorySummary[]>(`${EXPENSES_PATH}/summary/by-category`);
}
