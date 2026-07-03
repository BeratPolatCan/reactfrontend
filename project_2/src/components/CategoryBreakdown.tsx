import { useEffect, useState } from "react";
import type { CategorySummary } from "../types/expense";
import { getCategoryBreakdown } from "../api/expenseApi";
import { categoryBreakdownStyles } from "./CategoryBreakdownType";
import { CATEGORY_LABELS } from "../constants/categories";
import { formatTRY } from "../utils/format";

interface CategoryBreakdownProps {
  refreshKey: number;
}

function CategoryBreakdown({ refreshKey }: CategoryBreakdownProps) {
  const [breakdown, setBreakdown] = useState<CategorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategoryBreakdown()
      .then(setBreakdown)
      .catch((err: Error) => setError(err.message));
  }, [refreshKey]);

  if (error) return <p className="error">{error}</p>;

  const maxTotal = Math.max(...breakdown.map((b) => b.totalAmount), 1);

  return (
    <div className="card">
      <h2 className="card-title">Kategori Dağılımı</h2>
      {breakdown.length === 0 && <p className="muted">Henüz veri yok.</p>}
      {breakdown.map((item) => (
        <div key={item.category} className={`category-row cat-${item.category}`}>
          <span className="category-dot" />
          <span className="category-label" style={categoryBreakdownStyles.label}>
            {CATEGORY_LABELS[item.category]}
          </span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.totalAmount / maxTotal) * 100}%` }}
            />
          </div>
          <span className="category-amount" style={categoryBreakdownStyles.amount}>
            {formatTRY(item.totalAmount)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default CategoryBreakdown;
