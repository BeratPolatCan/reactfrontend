import { useState } from "react";
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
  // Alanlar props'tan DOGRUDAN ilklendiriliyor; props'u state'e kopyalayan bir
  // useEffect YOK. Duzenlenen kayit degistiginde formun tazelenmesini App.tsx'teki
  // "key" saglar: key degisince React bu bileseni unmount/remount eder ve
  // asagidaki ilklendiriciler yeniden calisir.
  //
  // Onceki hali effect icinde setState cagiriyordu (react-hooks/set-state-in-effect):
  // fazladan render turu ureten ve React'in onermedigi props->state senkronu.
  // ONEMLI: Bu desen App.tsx'teki key= olmadan CALISMAZ -- bagimlilik
  // ExpenseForm.test.tsx'te "key ile remount" testiyle korunuyor.
  const [description, setDescription] = useState(editingExpense?.description ?? "");
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : "");
  const [date, setDate] = useState(editingExpense?.date ?? "");
  const [category, setCategory] = useState<Category>(editingExpense?.category ?? "FOOD");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
        {/* label htmlFor <-> input id baglantisi erisilebilirlik icin sart:
            olmadan ekran okuyucu alanin adini okuyamaz ve etikete tiklamak
            input'a odaklanmaz. */}
        <div className="field field-desc">
          <label htmlFor="expense-description">Açıklama</label>
          <input
            id="expense-description"
            type="text"
            placeholder="Örn. Market alışverişi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
        </div>
        <div className="field">
          <label htmlFor="expense-amount">Tutar</label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
        </div>
        <div className="field">
          <label htmlFor="expense-date">Tarih</label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {fieldErrors.date && <span className="field-error">{fieldErrors.date}</span>}
        </div>
        <div className="field">
          <label htmlFor="expense-category">Kategori</label>
          <select
            id="expense-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
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
