import type { CSSProperties } from "react";

// Kategori satırındaki etiket ve tutarın yazı ağırlığı. Renk/hizalama App.css'te.
export const categoryBreakdownStyles: Record<string, CSSProperties> = {
  label: {
    fontWeight: 500,
  },
  amount: {
    fontWeight: 700,
  },
};
