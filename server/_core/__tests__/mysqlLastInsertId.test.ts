import { describe, expect, it } from "vitest";
import { readMysqlLastInsertId } from "../mysqlLastInsertId";

describe("readMysqlLastInsertId", () => {
  it("reads LAST_INSERT_ID() row arrays", () => {
    expect(readMysqlLastInsertId([{ n: 7 }])).toBe(7);
  });

  it("reads drizzle/mysql2 execute [rows, fields] tuples", () => {
    const fields = [{ name: "n" }];
    expect(readMysqlLastInsertId([[{ n: 1 }], fields])).toBe(1);
    expect(readMysqlLastInsertId([[{ n: 2 }], fields])).toBe(2);
    expect(readMysqlLastInsertId([[{ n: 3 }], fields])).toBe(3);
  });

  it("reads mysql2 insertId on ResultSetHeader-like objects", () => {
    expect(readMysqlLastInsertId({ insertId: 12, affectedRows: 1 })).toBe(12);
  });

  it("reads insertId from a [header, fields] tuple", () => {
    expect(
      readMysqlLastInsertId([{ insertId: 9, affectedRows: 1 }, []])
    ).toBe(9);
  });

  it("returns NaN when the driver payload has no id", () => {
    expect(Number.isNaN(readMysqlLastInsertId(null))).toBe(true);
    expect(Number.isNaN(readMysqlLastInsertId({}))).toBe(true);
    expect(Number.isNaN(readMysqlLastInsertId([[], []]))).toBe(true);
    expect(Number.isNaN(readMysqlLastInsertId([[{}], []]))).toBe(true);
  });
});
