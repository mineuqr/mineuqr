/**
 * ORDERING-OPERATIONAL-NOTES-PRESENTATION-1
 * Presentation-only note normalization. No domain/validation rules.
 * Absent or blank projected notes → null (render nothing).
 */
export function presentationalNote(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
