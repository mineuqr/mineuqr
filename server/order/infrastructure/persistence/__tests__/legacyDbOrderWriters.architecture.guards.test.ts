/**
 * ORDER-LEGACY-DB-WRITERS-REMOVAL-AUDIT-1 — architecture guards.
 *
 * Forbidden: leftover db.ts Order writers that persist without the hardened
 * transactional Outbox path.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const DB_PATH = "server/db.ts";
const ORDER_PATHS = [
  "server/routers.ts",
  "server/order/application/PlaceOrderService.ts",
  "server/order/application/IdentityPlaceOrderService.ts",
  "server/order/application/AdvanceOrderStatusService.ts",
  "server/order/infrastructure/persistence/DrizzleOrderRepository.ts",
] as const;

describe("legacy db Order writers are absent", () => {
  it("does not export createOrder, createOrderItems, or updateOrderStatus from db.ts", () => {
    const db = read(DB_PATH);
    expect(db).not.toMatch(/export async function createOrder\b/);
    expect(db).not.toMatch(/export async function createOrderItems\b/);
    expect(db).not.toMatch(/export async function updateOrderStatus\b/);
  });

  it("does not call the removed db Order writers from supported Order paths", () => {
    for (const relativePath of ORDER_PATHS) {
      const source = read(relativePath);
      expect(source).not.toMatch(/\bcreateOrder\s*\(/);
      expect(source).not.toMatch(/\bcreateOrderItems\s*\(/);
      expect(source).not.toMatch(/\bupdateOrderStatus\s*\(/);
    }
  });
});
