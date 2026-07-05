const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

// Sayıyı "₺1.234,56" gibi okunur bir para formatına çevirir.
export function formatTRY(amount: number): string {
  return tryFormatter.format(amount);
}

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Backend'den gelen ISO zaman damgasını ("2026-07-05T14:34:00Z") okunur bir
// Türkçe tarih+saate ("5 Tem 2026 14:34") çevirir. Değer yoksa/bozuksa "—" döner.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}
