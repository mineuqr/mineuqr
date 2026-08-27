/**
 * SESSION-ORDER-REALTIME-REFRESH-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function orderCreateMutation(): string {
  const routers = read("server/routers.ts");
  const createStart = routers.indexOf("  create: publicProcedure");
  return routers.slice(
    createStart,
    routers.indexOf("  list: verifiedProcedure", createStart)
  );
}

describe("SESSION-ORDER-REALTIME-REFRESH-1 architecture guards", () => {
  it("order.create returns sessionId without awaiting refresh or relay", () => {
    const createFn = orderCreateMutation();
    expect(createFn).toContain("{ awaitRelay: false }");
    expect(createFn).not.toContain("awaitRelay: true");
    expect(createFn).toContain("sessionId");
    expect(createFn).not.toContain("getOwnerWorkspace");
    expect(createFn).not.toContain("invalidate");
    expect(createFn).not.toContain("notifyOwnerSessionOrderCreated");
    expect(createFn).not.toContain("runOrderEventRelayBatch");
    expect(createFn).not.toContain("enrollOrderForSessionCheck");
  });

  it("QR checkout publishes a same-origin Session hint after HTTP success", () => {
    const checkout = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    expect(checkout).toContain("notifyOwnerSessionOrderCreated");
    expect(checkout).toContain("createOrderMutation.mutateAsync");
    expect(checkout).not.toContain("session.getOwnerWorkspace.invalidate");
    expect(checkout).not.toContain("order.read.listActive.invalidate");
  });

  it("open Owner Session invalidates only the affected workspace query", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).toContain("subscribeSessionOrderCreated");
    expect(sheet).toContain("isOwnerSessionRefreshTarget");
    expect(sheet).toContain("utils.session.getOwnerWorkspace.invalidate");
    expect(sheet).toContain("sessionId: message.sessionId");
    expect(sheet).not.toContain("utils.session.getOwnerWorkspace.invalidate()");
    expect(sheet).not.toContain("order.read.listActive");
    expect(sheet).not.toContain("enrollOrderForSessionCheck");
  });

  it("keeps 10s polling fallback and write-model Session membership", () => {
    const runtime = read("client/src/lib/queryRuntime.ts");
    expect(runtime).toContain("DASHBOARD_ORDER_LIST_POLL_MS = 10_000");
    const workspace = read("server/diningSession/sessionOwnerWorkspace.ts");
    expect(workspace).toContain("getOrdersBySessionId");
    expect(workspace).not.toContain("order_read_orders");
  });
});
