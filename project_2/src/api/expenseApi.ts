import type {
  Expense,
  ExpenseInput,
  CategorySummary,
  Last30DaysSummary,
  ExpensePage,
} from "../types/expense";

// Backend kök adresi şu öncelikle belirlenir:
//   1. VITE_API_BASE_URL env değişkeni (dolu ise her şeyi ezer)
//   2. Üretim build'i ise (Vercel) → canlı Railway backend'i
//   3. Aksi halde (npm run dev) → yerel geliştirme sunucusu
const PROD_API_ROOT = "https://springboot-production-7df8.up.railway.app";
const DEV_API_ROOT = "http://localhost:8080";

// Env değişkeni protokolsüz ("host.com") girilirse tarayıcı bunu göreli yol
// sanar ve Vercel domain'ine ekleyip 404 döner. Bu yüzden protokolü garanti
// altına alıp (yoksa https:// ekle) sondaki fazlalık /'ları temizliyoruz.
function normalizeApiRoot(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Not: env değişkeni Vercel'de tanımlı ama BOŞ olabilir; "" değeri ?? ile
// yakalanmaz, o yüzden boş/whitespace'i "tanımsız" gibi ele alıyoruz.
const envRoot = import.meta.env.VITE_API_BASE_URL?.trim();
const RAW_API_ROOT =
  envRoot && envRoot.length > 0
    ? envRoot
    : import.meta.env.PROD
      ? PROD_API_ROOT
      : DEV_API_ROOT;
const API_ROOT = normalizeApiRoot(RAW_API_ROOT);
const API_BASE_URL = `${API_ROOT}/api/expenses`;

export class ApiError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.errors) {
      throw new ApiError("Girdiğin bilgilerde hata var", body.errors);
    }
    throw new ApiError(body?.message ?? `İstek başarısız: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const response = await fetch(API_BASE_URL);
  return handleResponse<Expense[]>(response);
}

export async function getExpensesPage(
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
  const response = await fetch(`${API_BASE_URL}/page?${params.toString()}`);
  return handleResponse<ExpensePage>(response);
}

export async function getExpenseById(id: number): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/${id}`);
  return handleResponse<Expense>(response);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Expense>(response);
}

export async function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Expense>(response);
}

export async function deleteExpense(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
  return handleResponse<void>(response);
}

export async function getExpensesByRange(
  startDate: string,
  endDate: string
): Promise<Expense[]> {
  const response = await fetch(
    `${API_BASE_URL}/range?startDate=${startDate}&endDate=${endDate}`
  );
  return handleResponse<Expense[]>(response);
}

export async function getLast30DaysSummary(): Promise<Last30DaysSummary> {
  const response = await fetch(`${API_BASE_URL}/summary/last-30-days`);
  return handleResponse<Last30DaysSummary>(response);
}

export async function getCategoryBreakdown(): Promise<CategorySummary[]> {
  const response = await fetch(`${API_BASE_URL}/summary/by-category`);
  return handleResponse<CategorySummary[]>(response);
}