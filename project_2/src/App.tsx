import { useState } from "react";
import type { Expense } from "./types/expense";
import ExpenseList from "./components/ExpenseList";
import ExpenseForm from "./components/ExpenseForm";
import "./App.css";
import SummaryCards from "./components/SummaryCards";
import CategoryBreakdown from "./components/CategoryBreakdown";
import DateRangeFilter from "./components/DateRangeFilter";
import AuthPage from "./components/AuthPage";
import { useAuth } from "./auth/AuthContext";

function App() {
  const { isAuthenticated, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  function handleSaved() {
    setEditingExpense(null);
    setRefreshKey((key) => key + 1);
  }

  function handleRefreshNeeded() {
    setRefreshKey((key) => key + 1);
  }

  // Giriş yapılmamışsa uygulamanın geri kalanını hiç render etme (harcama
  // istekleri auth ister, aksi halde hepsi 401 döner).
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="topbar-brand">Gider Takip</span>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => logout()}>
            Çıkış
          </button>
        </div>
      </header>

      <div className="app-shell">
      <aside className="side">
        <DateRangeFilter refreshKey={refreshKey} />
      </aside>

      <main className="main-col">
        <ExpenseForm
          editingExpense={editingExpense}
          onSaved={handleSaved}
          onCancelEdit={() => setEditingExpense(null)}
          onRefreshNeeded={handleRefreshNeeded}
        />

        <ExpenseList
          refreshKey={refreshKey}
          onEdit={setEditingExpense}
          onChanged={handleSaved}
        />
      </main>

      <aside className="side">
        <CategoryBreakdown refreshKey={refreshKey} />
        <SummaryCards refreshKey={refreshKey} />
      </aside>
      </div>
    </>
  );
}

export default App;