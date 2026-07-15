/**
 * ORDER-READ-MODIFIERS-PERSISTENCE-1 — normalize projected / persisted line modifiers.
 * Display labels only; no pricing or domain rule evaluation.
 */

export function normalizeOrderLineModifiers(
  raw: unknown
): readonly string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > 120) continue;
    out.push(trimmed);
    if (out.length >= 32) break;
  }
  return out;
}
