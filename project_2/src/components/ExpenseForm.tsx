import { useEffect, useState } from "react";
import type { Category, Expense, ExpenseInput } from "../types/expense";
import { ApiError, createExpense, updateExpense } from "../api/expenseApi";
import { CATEGORIES, CATEGORY_LABELS } from "../constants/categories";

interface ExpenseFormProps {
  editingExpense: Expense | null;
  onSaved: () => void;
  onCancelEdit: () => void;
  onRefreshNeeded: () => void;
}

function ExpenseForm({ editingExpense, onSaved, onCancelEdit, onRefreshNeeded }: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("FOOD");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingExpense) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO(Asama 3): props->state senkronu; test yazildiktan sonra key-reset desenine cevrilecek
      setDescription(editingExpense.description);
      setAmount(String(editingExpense.amount));
      setDate(editingExpense.date);
      setCategory(editingExpense.category);
    }
  }, [editingExpense]);

  function resetForm() {
    setDescription("");
    setAmount("");
    setDate("");
    setCategory("FOOD");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const input: ExpenseInput = { description, amount: Number(amount), date, category };

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, input);
      } else {
        await createExpense(input);
      }
      resetForm();
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setError((err as Error).message);
      }
      onRefreshNeeded();
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="card-title">{editingExpense ? "Gideri Düzenle" : "Yeni Gider Ekle"}</h2>
      <div className="form-row">
        <div className="field field-desc">
          <label>Açıklama</label>
          <input
            type="text"
            placeholder="Örn. Market alışverişi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
        </div>
        <div className="field">
          <label>Tutar</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
        </div>
        <div className="field">
          <label>Tarih</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {fieldErrors.date && <span className="field-error">{fieldErrors.date}</span>}
        </div>
        <div className="field">
          <label>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          {fieldErrors.category && <span className="field-error">{fieldErrors.category}</span>}
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            {editingExpense ? "Güncelle" : "Ekle"}
          </button>
          {editingExpense && (
            <button className="btn btn-secondary" type="button" onClick={onCancelEdit}>
              Vazgeç
            </button>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default ExpenseForm;
