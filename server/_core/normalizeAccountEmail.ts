/** Canonical account email form for storage and lookup (AUTH-POLICY-1B.5). */
export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeAccountEmailOrNull(
  email: string | null | undefined
): string | null {
  if (email == null) return null;
  const normalized = normalizeAccountEmail(email);
  return normalized.length > 0 ? normalized : null;
}

/** True when normalized emails differ (treat null/empty as distinct from a real address). */
export function accountEmailChanged(
  previous: string | null | undefined,
  next: string | null | undefined
): boolean {
  return normalizeAccountEmailOrNull(previous) !== normalizeAccountEmailOrNull(next);
}
