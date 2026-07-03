import type { CSSProperties } from "react";

// Tablo hücrelerinin yazı ağırlığı. Renkler App.css'ten gelir; burada sadece
// vurguyu (kalınlık) ayarlıyoruz ki inline stil CSS renklerini ezmesin.
export const expenseListStyles: Record<string, CSSProperties> = {
  description: {
    fontWeight: 600,
  },
  amount: {
    fontWeight: 700,
  },
  date: {
    fontWeight: 500,
    color: "var(--text-muted)",
  },
};
