/** OPS-DASHBOARD-2 — display name for restaurant table rows. */
export function formatOpsTableName(row: {
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
}): string {
  const en = row.nameEn?.trim();
  if (en) return en;
  const ar = row.nameAr?.trim();
  if (ar) return ar;
  return `Table ${row.tableNumber}`;
}
