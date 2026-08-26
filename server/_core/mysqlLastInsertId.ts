/**
 * mysql2 / drizzle execute results for LAST_INSERT_ID() and INSERT insertId.
 * Driver boundary — ResultSetHeader vs row arrays vs [rows, fields] tuples.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteFromUnknown(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function readNFromRow(row: unknown): number | undefined {
  if (!isRecord(row) || !("n" in row)) return undefined;
  return finiteFromUnknown(row.n);
}

function readInsertId(value: unknown): number | undefined {
  if (!isRecord(value) || !("insertId" in value)) return undefined;
  return finiteFromUnknown(value.insertId);
}

export function readMysqlLastInsertId(result: unknown): number {
  if (Array.isArray(result)) {
    const first = result[0];
    const fromRow = readNFromRow(first);
    if (fromRow !== undefined) return fromRow;
    if (Array.isArray(first)) {
      const fromNestedRow = readNFromRow(first[0]);
      if (fromNestedRow !== undefined) return fromNestedRow;
    }
    const fromHeader = readInsertId(first);
    if (fromHeader !== undefined) return fromHeader;
  }
  const fromObject = readInsertId(result);
  if (fromObject !== undefined) return fromObject;
  return Number.NaN;
}
