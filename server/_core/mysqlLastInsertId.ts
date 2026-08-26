/**
 * mysql2 / drizzle execute results for LAST_INSERT_ID() and INSERT insertId.
 * Driver boundary — ResultSetHeader vs row arrays.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readMysqlLastInsertId(result: unknown): number {
  if (Array.isArray(result)) {
    const row = result[0];
    if (isRecord(row) && "n" in row) {
      const n = Number(row.n);
      if (Number.isFinite(n)) return n;
    }
  }
  if (isRecord(result) && "insertId" in result) {
    const n = Number(result.insertId);
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}
