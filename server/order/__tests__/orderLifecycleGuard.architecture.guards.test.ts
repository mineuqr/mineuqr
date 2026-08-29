/**
 * ORDER-LIFECYCLE-GUARD-1 — one policy, one mutation authority, no bypass writers.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getOrderWorkspaceActions } from "../../../client/src/lib/operational-workspace/operationalActions";
import { ORDER_LIFECYCLE_ALLOWED_TRANSITIONS } from "../domain/policies/OrderLifecyclePolicy";

const repoRoot = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const POLICY = "server/order/domain/policies/OrderLifecyclePolicy.ts";
const CANCEL = "server/order/domain/policies/OrderCancellationPolicy.ts";
const AGGREGATE = "server/order/domain/aggregate/Order.ts";
const ADVANCE = "server/order/application/AdvanceOrderStatusService.ts";
const ROUTER = "server/routers.ts";
const DEVICE = "server/operational-device/services/DeviceOrderExecutionService.ts";
const STAFF_CANCEL =
  "server/order/application/StaffCounterPickupSettlementService.ts";
const PLACE = "server/order/application/PlaceOrderService.ts";
const POS_COMPLETE =
  "server/order/application/CompleteCashierPosOperationalService.ts";
const DB = "server/db.ts";
const REPO =
  "server/order/infrastructure/persistence/DrizzleOrderRepository.ts";
const ACTIONS =
  "client/src/lib/operational-workspace/useOrderStatusActions.ts";

describe("ORDER-LIFECYCLE-GUARD-1 architecture", () => {
  it("keeps one certified transition matrix", () => {
    expect(ORDER_LIFECYCLE_ALLOWED_TRANSITIONS).toEqual({
      pending: ["preparing", "cancelled"],
      preparing: ["ready"],
      ready: ["served"],
      served: [],
      cancelled: [],
    });
    const policy = read(POLICY);
    expect(policy).toContain("ORDER-LIFECYCLE-GUARD-1");
    expect(policy).toContain("ORDER_LIFECYCLE_ALLOWED_TRANSITIONS");
    expect(read(CANCEL)).toContain('return status === "pending"');
    expect(read(AGGREGATE)).toContain("OrderLifecyclePolicy.canTransition");
    expect(read(AGGREGATE)).toContain("OrderCancellationPolicy.canCancel");
  });

  it("routes every operational mutation through AdvanceOrderStatusService", () => {
    const router = read(ROUTER);
    const update = router.slice(
      router.indexOf("updateStatus: verifiedProcedure"),
      router.indexOf("activeCount: verifiedProcedure")
    );
    expect(update).toContain("advanceOrderStatusService.execute");
    expect(update).toContain("completeCashierPosOperationalService.execute");
    expect(update).not.toContain("updateOrderStatus");
    expect(read(DEVICE)).toContain("advanceOrderStatusService.execute");
    expect(read(STAFF_CANCEL)).toContain("advanceOrderStatusService.execute");
    expect(read(STAFF_CANCEL)).toContain('order.status !== "pending"');
    expect(read(POS_COMPLETE)).toContain("this.advance.executeSequential");
    expect(read(PLACE)).toContain("p.advanceStatus(CASHIER_POS_INBOUND_STATUS");
    expect(read(ADVANCE)).toContain("order.advanceStatus");
    expect(read(ADVANCE)).toContain("expectedUpdatedAt");
    expect(read(ADVANCE)).toContain("domainEvents: events");
  });

  it("keeps the removed db.updateOrderStatus writer absent", () => {
    expect(read(DB)).not.toMatch(/export async function updateOrderStatus\b/);
    expect(read(REPO)).not.toContain("updateOrderStatus");
    expect(read(ADVANCE)).not.toContain("updateOrderStatus");
    expect(read(REPO)).toContain("this.outbox.appendInTransaction");
    expect(read(REPO)).toContain("ConcurrencyConflictError");
  });

  it("does not expose restore as a live Orders Workspace action", () => {
    for (const status of ["pending", "preparing", "ready", "served", "cancelled"] as const) {
      expect(
        getOrderWorkspaceActions(status).some((a) => a.id === "restore-order"),
        status
      ).toBe(false);
    }
    expect(getOrderWorkspaceActions("pending").some((a) => a.id === "cancel-order")).toBe(
      true
    );
    expect(
      getOrderWorkspaceActions("preparing").some((a) => a.id === "cancel-order")
    ).toBe(false);
  });

  it("client action catalog is not a lifecycle writer", () => {
    const actions = read(ACTIONS);
    expect(actions).toContain("trpc.order.updateStatus.useMutation");
    expect(actions).toContain('if (actionId === "print-order"');
    expect(actions).not.toContain("updateOrderStatus");
    expect(actions).not.toContain("AdvanceOrderStatusService");
  });
});
