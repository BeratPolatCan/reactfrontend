import { useEffect, useState } from "react";
import type { Expense } from "../types/expense";
import { getExpensesByRange } from "../api/expenseApi";
import { formatTRY } from "../utils/format";

interface DateRangeFilterProps {
  refreshKey: number;
}

function DateRangeFilter({ refreshKey }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<Expense[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRange(start: string, end: string) {
    // setError(null) bilerek EN BASTA degil: bu fonksiyon asagidaki effect'ten
    // de cagriliyor ve senkron bir setState effect govdesinde
    // react-hooks/set-state-in-effect kuralini ihlal ederdi (fazladan render).
    // Hatayi sonuc gelince temizliyoruz.
    try {
      const data = await getExpensesByRange(start, end);
      setError(null);
      setResults(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    fetchRange(startDate, endDate);
  }

  useEffect(() => {
    if (!startDate || !endDate) return;
    // fetchRange'i BURADAN cagirmiyoruz: kural fonksiyon sinirinin otesini
    // goremedigi icin, icindeki setState'ler await'ten sonra olsa bile cagriyi
    // "effect'te senkron setState" sayip isaretliyordu. Promise zincirini
    // dogrudan kurunca async sinir acik hale geliyor.
    getExpensesByRange(startDate, endDate)
      .then((data) => {
        setError(null);
        setResults(data);
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece refreshKey değiştiğinde tazelemek istiyoruz
  }, [refreshKey]);

  return (
    <div className="card">
      <h2 className="card-title">Tarih Aralığı</h2>
      <form className="filter-form" onSubmit={handleFilter}>
        {/* label htmlFor <-> input id: olmadan ekran okuyucu alan adini okuyamaz
            ve etikete tiklamak input'a odaklanmaz. */}
        <div className="field">
          <label htmlFor="range-start">Başlangıç</label>
          <input
            id="range-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="range-end">Bitiş</label>
          <input
            id="range-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit">Filtrele</button>
      </form>
      {error && <p className="error">{error}</p>}
      {results && results.length === 0 && <p className="muted">Bu aralıkta gider bulunamadı.</p>}
      {results && results.length > 0 && (
        <ul className="filter-results">
          {results.map((expense) => (
            <li key={expense.id}>
              <span>{expense.date} — {expense.description}</span>
              <span className="r-amount">{formatTRY(expense.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DateRangeFilter;
