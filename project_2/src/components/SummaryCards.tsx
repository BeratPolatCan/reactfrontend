import { useEffect, useState } from "react";
import type { Last30DaysSummary } from "../types/expense";
import { getLast30DaysSummary } from "../api/expenseApi";
import { formatTRY } from "../utils/format";

interface SummaryCardsProps {
  refreshKey: number;
}

function SummaryCards({ refreshKey }: SummaryCardsProps) {
  const [summary, setSummary] = useState<Last30DaysSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLast30DaysSummary()
      .then(setSummary)
      .catch((err: Error) => setError(err.message));
  }, [refreshKey]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return null;

  return (
    <div className="summary-cards">
      <div className="summary-card total">
        <p className="label">Son 30 Gün Toplam</p>
        <p className="value">{formatTRY(summary.totalAmount)}</p>
      </div>
      <div className="summary-card avg">
        <p className="label">Günlük Ortalama</p>
        <p className="value">{formatTRY(summary.dailyAverage)}</p>
      </div>
    </div>
  );
}

export default SummaryCards;
