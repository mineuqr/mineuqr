/**
 * REALTIME-AUTH-EXPIRY-DEEP-AUDIT-AND-HARDENING-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("REALTIME-AUTH-EXPIRY-DEEP-AUDIT-AND-HARDENING-1 architecture", () => {
  it("reconnects with a fresh credential instead of the expired ticket", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("refreshCredential");
    expect(client).toContain("realtimeTicketNeedsRefresh");
    expect(client).toContain("ticket_expired");
    expect(client).toContain("openSourceAfterCredentialRefresh");
    expect(client).not.toContain("commitCollectionFact");
    expect(client).not.toContain("confirmPayment");
  });

  it("adopted surfaces remint after expiry", () => {
    const orders = read(
      "client/src/lib/orders-workspace/useOrdersWorkspaceRealtime.ts"
    );
    const kitchen = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    const expo = read(
      "client/src/lib/operational-screen/kitchen/useExpoRuntimeRealtime.ts"
    );
    const customer = read("client/src/hooks/useCustomerTrackingRealtime.ts");
    for (const body of [orders, kitchen, expo, customer]) {
      expect(body).toContain("refreshCredential");
      expect(body).toContain("expiresAt");
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("allocateCashierInvoiceForOrder");
    }
  });

  it("keeps ticket expiry in Unix seconds on the server", () => {
    const tickets = read(
      "server/realtime-platform/tickets/RealtimeTicketService.ts"
    );
    expect(tickets).toContain("Math.floor(Date.now() / 1000)");
    expect(tickets).toContain("if (claims.exp < now)");
    expect(tickets).toContain("incRealtimeMetric(\"ticketsIssued\")");
    expect(tickets).not.toContain("commitCollectionFact");
  });
});
