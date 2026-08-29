/**
 * FIRST-ORDER-SESSION-CREATE-FAIL-CLOSED-HARDENING-1 — architecture guards.
 *
 * Forbidden state: a newly-opened Dining Session (or its empty Check) surviving a
 * first Order that failed. Runtime proof lives in firstOrderSessionAtomicity.test.ts;
 * these guards pin only the structural boundaries that runtime tests cannot observe.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("first-order Session atomicity guards", () => {
  it("resolves the Session on the Order persist transaction, not before it", () => {
    const routers = read("server/routers.ts");
    const start = routers.indexOf(
      "FIRST-ORDER-SESSION-CREATE-FAIL-CLOSED-HARDENING-1"
    );
    expect(start).toBeGreaterThan(-1);
    const create = routers.slice(
      start,
      routers.indexOf("ORDERING_CHANNEL_QR", start)
    );

    expect(create).toContain("resolveSessionInTransaction");
    // The Order identity may not carry a Session resolved ahead of the transaction.
    expect(create).toContain("sessionId: null");
    expect(create).toContain("sessionToken: null");
  });

  it("passes the transaction handle through Session opening", () => {
    const sessionService = read("server/diningSession/sessionService.ts");
    const create = sessionService.slice(
      sessionService.indexOf("async function createSession"),
      sessionService.indexOf("export async function getActiveSession")
    );

    // Every opening write takes the caller transaction when one is supplied.
    expect(create).toContain("writeOpeningRows");
    expect(create).toContain("insertSession(");
    expect(create).toContain("insertSessionEvent(");
    expect(create).toContain("createOpenCheckForSession(");
    expect(create).toContain("opened = await writeOpeningRows(client)");
  });

  it("stamps the transactionally resolved sessionId on the Order row and event", () => {
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    const insert = repo.slice(
      repo.indexOf("private async insertTransactional"),
      repo.indexOf("private async updateTransactional")
    );

    // Session resolution must precede the Order INSERT so sessionId is never patched later.
    const resolveAt = insert.indexOf("resolveSessionInTransaction");
    const lockAt = insert.indexOf("requireRestaurantRowForOrderPersist");
    const orderInsertAt = insert.indexOf("tx.insert(orders)");
    expect(lockAt).toBeGreaterThan(-1);
    expect(resolveAt).toBeGreaterThan(lockAt);
    expect(orderInsertAt).toBeGreaterThan(resolveAt);

    // Both the row and the reconstituted aggregate use the resolved id.
    expect(insert).toContain("sessionId: resolvedSessionId");
    expect(insert).toContain(
      "...(resolvedSessionId != null ? { sessionId: resolvedSessionId } : {})"
    );
  });

  it("never compensates a failed first Order by removing a Session or Check", () => {
    const sessionService = read("server/diningSession/sessionService.ts");
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );

    for (const source of [sessionService, repo]) {
      expect(source).not.toMatch(/delete\s*\(\s*diningSessions/i);
      expect(source).not.toMatch(/deleteSession|dropSession|purgeSession/i);
      expect(source).not.toMatch(/compensat|rollbackSession/i);
    }
  });

  it("keeps the standalone Session race recovery for callers without a transaction", () => {
    const sessionService = read("server/diningSession/sessionService.ts");
    const resolve = sessionService.slice(
      sessionService.indexOf("export async function resolveSessionForOrderCreate")
    );

    // Duplicate-key recovery by re-reading the winner stays intact off-transaction.
    expect(resolve).toContain("isMysqlDuplicateKeyError(err)");
    expect(resolve).toContain("if (client) throw err;");
    expect(resolve).toContain("const winner = await findActiveSession(");
  });
});
