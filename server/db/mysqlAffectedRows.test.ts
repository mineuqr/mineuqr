import { describe, expect, it } from "vitest";
import { readMysqlAffectedRows } from "./mysqlAffectedRows";

describe("readMysqlAffectedRows", () => {
  it("reads affectedRows from drizzle mysql2 ResultSetHeader", () => {
    expect(readMysqlAffectedRows({ affectedRows: 1, insertId: 0 })).toBe(1);
    expect(readMysqlAffectedRows({ affectedRows: 0 })).toBe(0);
  });

  it("does not treat ResultSetHeader as array index 0", () => {
    const header = { affectedRows: 1, fieldCount: 0, insertId: 0 };
    expect((header as unknown as [{ affectedRows?: number }])[0]).toBeUndefined();
    expect(readMysqlAffectedRows(header)).toBe(1);
  });

  it("reads affectedRows from tuple-shaped results", () => {
    expect(readMysqlAffectedRows([{ affectedRows: 2 }])).toBe(2);
  });

  it("returns 0 for nullish or invalid values", () => {
    expect(readMysqlAffectedRows(null)).toBe(0);
    expect(readMysqlAffectedRows(undefined)).toBe(0);
    expect(readMysqlAffectedRows({})).toBe(0);
    expect(readMysqlAffectedRows([])).toBe(0);
  });
});

describe("claimReadyPushSend affectedRows integration", () => {
  it("returns true when ResultSetHeader reports one affected row", () => {
    expect(readMysqlAffectedRows({ affectedRows: 1 }) > 0).toBe(true);
  });

  it("returns false when no row matched", () => {
    expect(readMysqlAffectedRows({ affectedRows: 0 }) > 0).toBe(false);
  });
});
