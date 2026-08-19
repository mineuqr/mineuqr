/**
 * PAYMENT-CONFIRM-COMPATIBILITY-CLEANUP-1 — public paid-confirm bypass closed.
 * Compatibility surface only. Not a financial engine rewrite.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function walkTs(relDir: string): string[] {
  const abs = join(repoRoot, relDir);
  const out: string[] = [];
  const entries = readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    const child = join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      out.push(...walkTs(child));
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(child.replaceAll("\\", "/"));
    }
  }
  return out;
}

const PAYMENT =
  "server/operational-session/payment/PaymentConfirmService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const CHECK_BARREL = "server/operational-session/check/index.ts";
const PLATFORM_BARREL = "server/operational-session/index.ts";
const POS = "server/pos/services/PosSettlementInitiateService.ts";
const SESSION = "server/diningSession/sessionService.ts";
const SETTLE_ORDER = "server/order/application/SettleOrderPaidService.ts";
const COUNTER =
  "server/order/application/StaffCounterPickupSettlementService.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

const PAID_BY_ID = /settleCheckPaidById(?!Detailed)/;
const PAID_DETAILED = "settleCheckPaidByIdDetailed";
const FINALIZE = "finalizeOpenCheckById";

const APPLICATION_TREES = [
  "server/diningSession",
  "server/order/application",
  "server/pos/services",
  "server/pos/api",
  "server/operational-device",
];

describe("PAYMENT-CONFIRM-COMPATIBILITY-CLEANUP-1 architecture", () => {
  it("keeps the four Confirm callers on confirmPayment", () => {
    expect(read(POS)).toContain("await confirmPayment({");
    expect(read(SESSION)).toContain("await confirmPayment({");
    expect(read(SETTLE_ORDER)).toContain("await confirmPayment({");
    expect(read(COUNTER)).toContain("await confirmPayment({");
  });

  it("does not re-export paid-confirm façades from public barrels", () => {
    const checkBarrel = read(CHECK_BARREL);
    const platform = read(PLATFORM_BARREL);
    expect(checkBarrel).not.toMatch(PAID_BY_ID);
    expect(checkBarrel).not.toContain(PAID_DETAILED);
    expect(platform).not.toMatch(PAID_BY_ID);
    expect(platform).not.toContain(PAID_DETAILED);
    expect(read(CHECK)).toContain("export async function settleCheckPaidById");
    expect(read(CHECK)).toContain("export async function settleCheckPaidByIdDetailed");
    expect(read(CHECK)).not.toContain("export async function finalizeOpenCheckById");
    expect(read(CHECK)).toContain("async function finalizeOpenCheckById");
  });

  it("forbids application-level paid Confirm bypasses while allowing Check execution host", () => {
    const allowed = new Set([PAYMENT, CHECK]);
    const scanned = [
      ...APPLICATION_TREES.flatMap(walkTs),
      PLATFORM_BARREL,
      CHECK_BARREL,
      "server/routers.ts",
      "server/operational-session/operationalSessionLifecycle.ts",
    ];
    const unexpectedDetailed: string[] = [];
    const unexpectedPaidById: string[] = [];
    const unexpectedFinalize: string[] = [];
    for (const file of scanned) {
      if (allowed.has(file)) continue;
      const src = read(file);
      if (src.includes(PAID_DETAILED)) unexpectedDetailed.push(file);
      if (PAID_BY_ID.test(src)) unexpectedPaidById.push(file);
      if (src.includes(FINALIZE)) unexpectedFinalize.push(file);
    }
    expect(unexpectedDetailed).toEqual([]);
    expect(unexpectedPaidById).toEqual([]);
    expect(unexpectedFinalize).toEqual([]);
    expect(read(PAYMENT)).toContain("await settleCheckPaidByIdDetailed({");
    expect(read(CHECK)).toContain("return finalizeOpenCheckById({");
  });

  it("does not route complimentary, void, or Refund through confirmPayment", () => {
    const session = read(SESSION);
    const counter = read(COUNTER);
    const payment = read(PAYMENT);
    expect(session).toContain("settleCheckComplimentaryByIdDetailed");
    expect(counter).toContain("voidCheckByIdDetailed");
    expect(payment).not.toContain("settleCheckComplimentaryById");
    expect(payment).not.toContain("voidCheckById");
    expect(payment).not.toContain("applyRefundOnCheck");
    expect(payment).not.toContain("createSplitPaymentOnCheck");
    expect(payment).not.toContain("createMultiCheckAllocationOnCheck");
  });

  it("does not change schema, payments table, or the Check-owned transaction", () => {
    const journal = read(JOURNAL);
    const schema = read(SCHEMA);
    const payment = read(PAYMENT);
    expect(journal).toContain("0095_check_charges");
    expect(journal).not.toContain("0096_");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles.some((name) => name.startsWith("0096"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(payment).not.toContain("withCheckOwnedTransaction");
    expect(payment).not.toContain("db.transaction");
    expect(read(CHECK)).toContain("withCheckOwnedTransaction");
  });
});
