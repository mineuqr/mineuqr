import { describe, expect, it } from "vitest";
import { readMysqlLastInsertId } from "../mysqlLastInsertId";

describe("readMysqlLastInsertId", () => {
  it("reads LAST_INSERT_ID() row arrays", () => {
    expect(readMysqlLastInsertId([{ n: 7 }])).toBe(7);
  });

  it("reads mysql2 insertId on ResultSetHeader-like objects", () => {
    expect(readMysqlLastInsertId({ insertId: 12, affectedRows: 1 })).toBe(12);
  });

  it("returns NaN when the driver payload has no id", () => {
    expect(Number.isNaN(readMysqlLastInsertId(null))).toBe(true);
    expect(Number.isNaN(readMysqlLastInsertId({}))).toBe(true);
  });
});
