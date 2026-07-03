import { useState } from "react";
import type { Expense } from "./types/expense";
import ExpenseList from "./components/ExpenseList";
import ExpenseForm from "./components/ExpenseForm";
import "./App.css";
import SummaryCards from "./components/SummaryCards";
import CategoryBreakdown from "./components/CategoryBreakdown";
import DateRangeFilter from "./components/DateRangeFilter";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  function handleSaved() {
    setEditingExpense(null);
    setRefreshKey((key) => key + 1);
  }

  function handleRefreshNeeded() {
    setRefreshKey((key) => key + 1);
  }

  return (
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
  );
}

export default App;