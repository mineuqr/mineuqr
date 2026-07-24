/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — presentation-only amount helpers.
 * Does not duplicate domain money rules; maps user input → opaque decimal string.
 */

export type OpeningFloatParseResult =
  | { ok: true; amount: string }
  | { ok: false; reason: "required" | "invalid" };

/**
 * Normalize user-entered opening float / cash count for API.
 * Zero is allowed (domain policy: non-negative).
 */
export function parseMoneyAmountInput(raw: string): OpeningFloatParseResult {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return { ok: false, reason: "required" };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, reason: "invalid" };
  }
  const [whole, frac = ""] = trimmed.split(".");
  const normalized = `${Number.parseInt(whole || "0", 10)}.${(frac + "00").slice(0, 2)}`;
  return { ok: true, amount: normalized };
}

export function formatRegisterMoneyDisplay(
  amount: string,
  currencySymbol: string,
  language: "ar" | "en"
): string {
  const symbol = currencySymbol.trim() || (language === "ar" ? "ر.س" : "SAR");
  if (language === "ar") {
    return `${amount} ${symbol}`;
  }
  return `${symbol} ${amount}`;
}

export function formatOpenedAtDisplay(
  iso: string | null | undefined,
  language: "ar" | "en"
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(language === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
