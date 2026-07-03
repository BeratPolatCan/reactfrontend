import type { Category } from "../types/expense";

// Backend enum sırasıyla birebir aynı — form select'i ve döngüler bunu kullanır.
export const CATEGORIES: Category[] = [
  "FOOD",
  "TRANSPORT",
  "BILLS",
  "ENTERTAINMENT",
  "HEALTH",
  "SHOPPING",
  "OTHER",
];

// Ekranda gösterilecek Türkçe etiketler (değer olarak yine enum gönderilir).
export const CATEGORY_LABELS: Record<Category, string> = {
  FOOD: "Yemek",
  TRANSPORT: "Ulaşım",
  BILLS: "Faturalar",
  ENTERTAINMENT: "Eğlence",
  HEALTH: "Sağlık",
  SHOPPING: "Alışveriş",
  OTHER: "Diğer",
};
