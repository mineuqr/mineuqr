import type { AccountClassification } from "@shared/accountClassification";

const LABELS: Record<AccountClassification, { en: string; ar: string }> = {
  COMMERCIAL: { en: "Commercial", ar: "تجاري" },
  INTERNAL: { en: "Internal", ar: "داخلي" },
  SYSTEM: { en: "System", ar: "نظام" },
};

export function accountClassificationLabel(
  classification: AccountClassification,
  locale: "en" | "ar"
): string {
  return LABELS[classification][locale];
}
