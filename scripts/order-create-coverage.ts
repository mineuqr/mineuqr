/**
 * ORDER-CREATE-COVERAGE-COMMAND-RESTORE-1
 *
 *   pnpm db:order-create:coverage
 *
 * Executable certification gate for the current Order Creation architecture.
 * Runs existing Vitest architecture guards + in-memory create atomicity.
 *
 * Database mode: none. Does not connect to TiDB. Does not create Orders.
 * Not real-DB certified. Not browser certified. Not Production certified.
 */
import { spawnSync } from "node:child_process";
import { ORDERING_PLATFORM_ACTIVE_CHANNELS } from "../server/ordering-platform/orderingPlatformOwnership";

/** Smallest existing set that proves authority, atomicity, channels, identity, boundaries. */
export const ORDER_CREATE_COVERAGE_TEST_FILES = [
  "server/ordering-platform/__tests__/orderCreateCoverage.architecture.guards.test.ts",
  "server/ordering-platform/__tests__/orderingPlatform.architecture.guards.test.ts",
  "shared/ordering-platform/__tests__/orderingChannelTaxonomy.architecture.guards.test.ts",
  "shared/ordering-platform/__tests__/nonTablePlaceOrder.architecture.guards.test.ts",
  "server/order/infrastructure/persistence/__tests__/legacyDbOrderWriters.architecture.guards.test.ts",
  "server/order/infrastructure/persistence/__tests__/orderCreateOutboxAtomicity.architecture.guards.test.ts",
  "server/order/infrastructure/persistence/__tests__/DrizzleOrderRepository.createAtomicity.test.ts",
  "server/order-create-pricing.test.ts",
  "server/order-authoritative-pricing.test.ts",
  "server/order/__tests__/firstOrderSessionAtomicity.test.ts",
  "server/order/__tests__/waiterAttachMustNotOpenSession.architecture.guards.test.ts",
  "server/order/application/__tests__/IdentityPlaceOrderService.test.ts",
  "server/order/application/__tests__/PlaceOrderService.cashierPosLifecycle.test.ts",
  "server/order/business-identity/application/__tests__/OrderDisplayIdentityResolver.test.ts",
  "server/order/__tests__/selfOrderCheckInOrderTransaction.architecture.guards.test.ts",
  "server/pos/__tests__/posSale.architecture.guards.test.ts",
  "client/src/lib/ordering-client/__tests__/kioskIdentityAdoption.architecture.guards.test.ts",
  "client/src/lib/ordering-client/__tests__/waiterOrderingFoundation.architecture.guards.test.ts",
] as const;

const CHANNEL_LABEL: Record<string, string> = {
  qr: "QR / Table  →  order.create  →  PlaceOrderService",
  waiter_tablet:
    "Waiter  →  placeAsWaiter / placeWaiterOrderForDevice  →  IdentityPlaceOrderService",
  kiosk: "Kiosk  →  order.placeWithIdentity  →  IdentityPlaceOrderService",
  cashier_pos: "POS / Counter  →  PosSaleService  →  IdentityPlaceOrderService",
};

function main(): void {
  console.log("=== MineuQR Order Create coverage ===\n");
  console.log(
    "Canonical: PlaceOrderService → DrizzleOrderRepository.insertTransactional"
  );
  console.log("Contract:  Order + Items + OrderCreated  (same transaction)");
  console.log(
    "Mode:      architecture guards + in-memory Vitest (NOT real-DB, NOT Production)\n"
  );
  console.log("Live Place channels:");
  for (const id of ORDERING_PLATFORM_ACTIVE_CHANNELS) {
    console.log(`  ${CHANNEL_LABEL[id] ?? id}`);
  }
  console.log("");

  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    pnpm,
    ["exec", "vitest", "run", "--reporter=dot", ...ORDER_CREATE_COVERAGE_TEST_FILES],
    { stdio: "inherit", cwd: process.cwd(), shell: process.platform === "win32" }
  );
  const code = result.status ?? 1;
  if (code === 0) {
    console.log("\nPASS — Order Create coverage");
    console.log("Evidence: SOURCE + TEST + IN-MEMORY. Not REAL-DB / BROWSER / PRODUCTION.");
  } else {
    console.error("\nFAIL — Order Create coverage");
  }
  process.exit(code);
}

main();
