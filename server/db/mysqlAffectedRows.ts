/** Read affectedRows from drizzle-orm mysql2 update/delete results (ResultSetHeader). */
export function readMysqlAffectedRows(result: unknown): number {
  if (result == null || typeof result !== "object") return 0;

  if ("affectedRows" in result) {
    const n = (result as { affectedRows?: number }).affectedRows;
    return typeof n === "number" ? n : 0;
  }

  if (Array.isArray(result)) {
    const first = result[0];
    if (first != null && typeof first === "object" && "affectedRows" in first) {
      const n = (first as { affectedRows?: number }).affectedRows;
      return typeof n === "number" ? n : 0;
    }
  }

  return 0;
}
