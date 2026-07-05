import { useEffect, useState } from "react";
import type { Expense, ExpensePage } from "../types/expense";
import { getExpensesPage, deleteExpense } from "../api/expenseApi";
import { expenseListStyles } from "./ExpenseListStyle";
import { CATEGORY_LABELS } from "../constants/categories";
import { formatTRY, formatDateTime } from "../utils/format";

interface ExpenseListProps {
  refreshKey: number;
  onEdit: (expense: Expense) => void;
  onChanged: () => void;
}

type SortField = "amount" | "date";
type SortDirection = "asc" | "desc";

const MIN_SIZE = 5;
const SIZE_STEP = 5;

function ExpenseList({ refreshKey, onEdit, onChanged }: ExpenseListProps) {
  const [pageData, setPageData] = useState<ExpensePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(MIN_SIZE);

  useEffect(() => {
    setError(null);
    getExpensesPage(page, size, sortField, sortDirection)
      .then((data) => {
        // Bir sayfa silme sonrası mevcut sayfa aralık dışı kalırsa geri çek.
        if (data.totalPages > 0 && page >= data.totalPages) {
          setPage(data.totalPages - 1);
          return;
        }
        setPageData(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, page, size, sortField, sortDirection]);

  async function handleDelete(id: number) {
    try {
      await deleteExpense(id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
      onChanged();
    }
  }

  function handleSort(field: SortField) {
    setPage(0);
    if (sortField === field) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function sortArrow(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  if (!pageData) {
    if (loading) return <p className="muted">Yükleniyor...</p>;
    return null;
  }

  const { content, totalElements, totalPages } = pageData;

  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="expense-table-card">
        <div className="table-head">
          <h2>Giderler</h2>
          <span className="count">{totalElements} kayıt</span>
        </div>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Açıklama</th>
              <th className="sortable" onClick={() => handleSort("amount")}>
                Tutar <span className="sort-arrow">{sortArrow("amount")}</span>
              </th>
              <th className="sortable" onClick={() => handleSort("date")}>
                Tarih <span className="sort-arrow">{sortArrow("date")}</span>
              </th>
              <th>Kategori</th>
              <th>Eklendi</th>
              <th>Düzenlendi</th>
              <th className="cell-actions">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {content.map((expense) => (
              <tr key={expense.id}>
                <td style={expenseListStyles.description}>{expense.description}</td>
                <td className="amount-cell" style={expenseListStyles.amount}>
                  {formatTRY(expense.amount)}
                </td>
                <td style={expenseListStyles.date}>{expense.date}</td>
                <td>
                  <span className={`badge cat-${expense.category}`}>
                    {CATEGORY_LABELS[expense.category]}
                  </span>
                </td>
                <td className="audit-cell">{formatDateTime(expense.createdDate)}</td>
                <td className="audit-cell">{formatDateTime(expense.lastModifiedDate)}</td>
                <td className="cell-actions">
                  <span className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(expense)}>
                      Düzenle
                    </button>
                    <button
                      className="btn btn-ghost btn-sm danger"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Sil
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {content.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        <div className="expense-table-pagination">
          <div className="pagination-group">
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              ← Önceki
            </button>
            <span className="page-indicator">
              Sayfa {page + 1} / {Math.max(totalPages, 1)}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki →
            </button>
          </div>
          <div className="pagination-group">
            {size > MIN_SIZE && (
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => {
                  setPage(0);
                  setSize((s) => Math.max(s - SIZE_STEP, MIN_SIZE));
                }}
              >
                Daha az göster (-{SIZE_STEP})
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => {
                setPage(0);
                setSize((s) => s + SIZE_STEP);
              }}
            >
              Daha fazla göster (+{SIZE_STEP})
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ExpenseList;
