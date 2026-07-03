const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

// Sayıyı "₺1.234,56" gibi okunur bir para formatına çevirir.
export function formatTRY(amount: number): string {
  return tryFormatter.format(amount);
}
