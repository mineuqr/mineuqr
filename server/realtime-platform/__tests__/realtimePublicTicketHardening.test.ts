/**
 * REALTIME-PUBLIC-TICKET-HARDENING-1 — opaque ticket registry + auth tests.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  authorizeRealtimeCredential,
} from "../tickets/authorizeRealtimeCredential";
import {
  bindOpaqueTicketConnection,
  cleanupOpaqueRealtimeTickets,
  clearOpaqueRealtimeTicketRegistry,
  getOpaqueTicketRegistrySize,
  isOpaqueRealtimeTicket,
  issueOpaqueCustomerTicket,
  lookupOpaqueRealtimeTicket,
  OPAQUE_TICKET_PREFIX,
  renewOpaqueCustomerTicket,
  revokeOpaqueRealtimeTicket,
} from "../tickets/RealtimeOpaqueTicketRegistry";
import {
  clearRealtimeTicketRevocations,
  mintRealtimeTicket,
  verifyRealtimeTicket,
} from "../tickets/RealtimeTicketService";
import { hashTrackingToken } from "../privacy/publicCustomerHint";
import {
  getRealtimeMetrics,
  resetRealtimeMetrics,
} from "../observability/realtimeMetrics";
import { RealtimeSseGateway } from "../gateway/RealtimeSseGateway";
import { InMemoryRealtimePubSub } from "../pubsub/RealtimePubSub";
import type { Response } from "express";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

beforeEach(() => {
  clearOpaqueRealtimeTicketRegistry();
  clearRealtimeTicketRevocations();
  resetRealtimeMetrics();
  delete process.env.REALTIME_LEGACY_CUSTOMER_JWT;
  delete process.env.REALTIME_OPAQUE_CUSTOMER_TICKETS;
});

afterEach(() => {
  clearOpaqueRealtimeTicketRegistry();
  delete process.env.REALTIME_LEGACY_CUSTOMER_JWT;
  delete process.env.REALTIME_OPAQUE_CUSTOMER_TICKETS;
});

describe("REALTIME-PUBLIC-TICKET-HARDENING-1 opaque issuance", () => {
  it("issues unguessable opaque tickets without JWT payload", async () => {
    const trackingHash = hashTrackingToken("tok-public-hardening-1");
    const minted = issueOpaqueCustomerTicket({
      restaurantId: 42,
      orderId: 99,
      trackingTokenHash: trackingHash,
    });

    expect(minted.token.startsWith(OPAQUE_TICKET_PREFIX)).toBe(true);
    expect(isOpaqueRealtimeTicket(minted.token)).toBe(true);
    expect(minted.token.includes(".")).toBe(false);
    expect(minted.token).not.toMatch(/restaurantId|orderId|eyJ/);
    // 256-bit body after prefix
    expect(minted.token.length).toBeGreaterThan(OPAQUE_TICKET_PREFIX.length + 40);
    expect(minted.channels).toEqual(["customer"]);
    expect(getRealtimeMetrics().ticketsIssued).toBe(1);
  });

  it("registry lookup authorizes and never returns client-decodable claims on wire", async () => {
    const trackingHash = hashTrackingToken("tok-a");
    const minted = issueOpaqueCustomerTicket({
      restaurantId: 7,
      orderId: 3,
      trackingTokenHash: trackingHash,
    });
    const looked = lookupOpaqueRealtimeTicket(minted.token);
    expect(looked.ok).toBe(true);
    if (!looked.ok) return;
    expect(looked.claims.restaurantId).toBe(7);
    expect(looked.claims.orderId).toBe(3);
    expect(looked.claims.channels).toEqual(["customer"]);
    expect(looked.claims.trackingRef).toBe(trackingHash);
    // Token itself is not base64 JSON
    expect(() => JSON.parse(Buffer.from(minted.token, "base64").toString())).toThrow();
  });

  it("rejects forgery / unknown opaque ids", async () => {
    expect(lookupOpaqueRealtimeTicket(`${OPAQUE_TICKET_PREFIX}forged`).ok).toBe(
      false
    );
    expect((await authorizeRealtimeCredential(`${OPAQUE_TICKET_PREFIX}forged`)).ok).toBe(
      false
    );
  });

  it("revokes and expires correctly", async () => {
    const minted = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 2,
      trackingTokenHash: hashTrackingToken("tok-rev"),
      ttlSeconds: 600,
    });
    expect((await authorizeRealtimeCredential(minted.token)).ok).toBe(true);
    revokeOpaqueRealtimeTicket(minted.token, "test");
    const revoked = await authorizeRealtimeCredential(minted.token);
    expect(revoked.ok).toBe(false);
    if (revoked.ok) return;
    expect(revoked.code).toBe("revoked");

    const short = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 2,
      trackingTokenHash: hashTrackingToken("tok-exp"),
      ttlSeconds: 600,
    });
    const looked = lookupOpaqueRealtimeTicket(short.token);
    expect(looked.ok).toBe(true);
    if (!looked.ok) return;
    looked.record.expiresAt = Math.floor(Date.now() / 1000) - 1;
    const expired = await authorizeRealtimeCredential(short.token);
    expect(expired.ok).toBe(false);
    if (expired.ok) return;
    expect(expired.code).toBe("expired");
    expect(getRealtimeMetrics().ticketsRevoked).toBeGreaterThanOrEqual(1);
    expect(getRealtimeMetrics().ticketsExpired).toBeGreaterThanOrEqual(1);
  });

  it("renews by rotating opaque ticket id", async () => {
    const first = issueOpaqueCustomerTicket({
      restaurantId: 5,
      orderId: 8,
      trackingTokenHash: hashTrackingToken("tok-renew"),
    });
    const renewed = renewOpaqueCustomerTicket(first.token);
    expect(renewed).not.toBeNull();
    expect(renewed!.token).not.toBe(first.token);
    expect((await authorizeRealtimeCredential(first.token)).ok).toBe(false);
    expect((await authorizeRealtimeCredential(renewed!.token)).ok).toBe(true);
    expect(getRealtimeMetrics().ticketsRenewed).toBe(1);
  });

  it("cleanup removes dead tickets after grace", async () => {
    const minted = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 1,
      trackingTokenHash: hashTrackingToken("tok-clean"),
      ttlSeconds: 600,
    });
    revokeOpaqueRealtimeTicket(minted.token, "cleanup");
    // Force lastAccess/expiry into the past via grace 0 after marking revoked
    const removed = cleanupOpaqueRealtimeTickets(0);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(getOpaqueTicketRegistrySize()).toBe(0);
  });

  it("supports concurrent tickets for same order", async () => {
    const hash = hashTrackingToken("tok-multi");
    const a = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 10,
      trackingTokenHash: hash,
    });
    const b = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 10,
      trackingTokenHash: hash,
    });
    expect(a.token).not.toBe(b.token);
    expect((await authorizeRealtimeCredential(a.token)).ok).toBe(true);
    expect((await authorizeRealtimeCredential(b.token)).ok).toBe(true);
  });

  it("binds connection id on first open", async () => {
    const minted = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 1,
      trackingTokenHash: hashTrackingToken("tok-bind"),
    });
    bindOpaqueTicketConnection(minted.token, "conn-1");
    const looked = lookupOpaqueRealtimeTicket(minted.token);
    expect(looked.ok).toBe(true);
    if (!looked.ok) return;
    expect(looked.record.boundConnectionId).toBe("conn-1");
    bindOpaqueTicketConnection(minted.token, "conn-2");
    expect(looked.record.boundConnectionId).toBe("conn-1");
  });
});

describe("REALTIME-PUBLIC-TICKET-HARDENING-1 isolation + migration", () => {
  it("opaque customer cannot authorize staff channels", async () => {
    const minted = issueOpaqueCustomerTicket({
      restaurantId: 9,
      orderId: 1,
      trackingTokenHash: hashTrackingToken("tok-acl"),
    });
    const auth = await authorizeRealtimeCredential(minted.token);
    expect(auth.ok).toBe(true);
    if (!auth.ok) return;
    expect(auth.claims.channels).toEqual(["customer"]);
    expect(auth.claims.channels.includes("orders" as never)).toBe(false);
  });

  it("cross-customer ACL differs by orderId in registry claims", async () => {
    const a = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 100,
      trackingTokenHash: hashTrackingToken("tok-a"),
    });
    const b = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 200,
      trackingTokenHash: hashTrackingToken("tok-b"),
    });
    const ca = await authorizeRealtimeCredential(a.token);
    const cb = await authorizeRealtimeCredential(b.token);
    expect(ca.ok && cb.ok).toBe(true);
    if (!ca.ok || !cb.ok) return;
    expect(ca.claims.orderId).not.toBe(cb.claims.orderId);
  });

  it("cross-tenant isolation via restaurantId in registry", async () => {
    const a = issueOpaqueCustomerTicket({
      restaurantId: 1,
      orderId: 1,
      trackingTokenHash: hashTrackingToken("t1"),
    });
    const b = issueOpaqueCustomerTicket({
      restaurantId: 2,
      orderId: 1,
      trackingTokenHash: hashTrackingToken("t2"),
    });
    const ca = await authorizeRealtimeCredential(a.token);
    const cb = await authorizeRealtimeCredential(b.token);
    if (!ca.ok || !cb.ok) throw new Error("auth failed");
    expect(ca.claims.restaurantId).not.toBe(cb.claims.restaurantId);
  });

  it("accepts legacy customer JWT while migration flag enabled", async () => {
    process.env.REALTIME_LEGACY_CUSTOMER_JWT = "true";
    const legacy = mintRealtimeTicket({
      restaurantId: 3,
      authMode: "customer_tracking",
      sub: "th:abc",
      channels: ["customer"],
      orderId: 5,
      trackingRef: "abc",
    });
    expect(verifyRealtimeTicket(legacy.token).ok).toBe(true);
    expect((await authorizeRealtimeCredential(legacy.token)).ok).toBe(true);
  });

  it("rejects legacy customer JWT when migration disabled", async () => {
    process.env.REALTIME_LEGACY_CUSTOMER_JWT = "false";
    const legacy = mintRealtimeTicket({
      restaurantId: 3,
      authMode: "customer_tracking",
      sub: "th:abc",
      channels: ["customer"],
      orderId: 5,
      trackingRef: "abc",
    });
    expect((await authorizeRealtimeCredential(legacy.token)).ok).toBe(false);
  });

  it("staff JWT path unchanged", async () => {
    const staff = mintRealtimeTicket({
      restaurantId: 3,
      authMode: "staff_session",
      sub: "user:1",
      channels: ["orders"],
    });
    expect((await authorizeRealtimeCredential(staff.token)).ok).toBe(true);
  });
});

describe("REALTIME-PUBLIC-TICKET-HARDENING-1 gateway", () => {
  it("opens SSE with opaque ticket and sanitizes customer ready", async () => {
    const bus = new InMemoryRealtimePubSub();
    const gateway = new RealtimeSseGateway(bus);
    const chunks: string[] = [];
    const res = {
      status() {
        return this;
      },
      setHeader() {
        return this;
      },
      write(chunk: string) {
        chunks.push(chunk);
      },
      end() {},
      on() {
        return this;
      },
      flushHeaders() {},
    } as unknown as Response;

    const minted = issueOpaqueCustomerTicket({
      restaurantId: 3,
      orderId: 55,
      trackingTokenHash: hashTrackingToken("tok-gw"),
    });

    const opened = await gateway.open({
      connectionId: "c-opaque",
      token: minted.token,
      channels: ["customer"],
      res,
    });
    expect(opened.ok).toBe(true);
    const ready = chunks.join("");
    expect(ready).toContain("platform.ready");
    expect(ready).not.toContain('"restaurantId"');
    expect(ready).not.toContain('"orderId"');
    expect(ready).not.toContain("trackingRef");
    void gateway.shutdown();
  });
});

describe("REALTIME-PUBLIC-TICKET-HARDENING-1 architecture", () => {
  it("customer mint uses opaque registry by default", async () => {
    const router = read(
      "server/realtime-platform/realtimePlatformRouter.ts"
    );
    expect(router).toContain("issueOpaqueCustomerTicket");
    expect(router).toContain("isOpaqueCustomerTicketsEnabled");
    expect(router).toContain("renewCustomerTicket");
    const opaqueBranch = router.match(
      /if \(isOpaqueCustomerTicketsEnabled\(\)\) \{[\s\S]*?return \{[\s\S]*?\};\s*\}/
    );
    expect(opaqueBranch?.[0]).toBeTruthy();
    const returned = opaqueBranch![0].match(/return \{[\s\S]*?\};/);
    expect(returned?.[0]).toBeTruthy();
    expect(returned![0]).not.toContain("trackingRef");
    expect(returned![0]).not.toContain("restaurantId");
    expect(returned![0]).not.toContain("orderId");
  });

  it("gateway authorizes via unified credential helper", async () => {
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain("authorizeRealtimeCredential");
    expect(gateway).toContain("bindOpaqueTicketConnection");
  });

  it("OrderStatusPage / customer hook unchanged (no EventSource)", async () => {
    const page = read("client/src/pages/OrderStatusPage.tsx");
    expect(page).toContain("useCustomerTrackingRealtime");
    expect(page).not.toContain("EventSource");
    const hook = read("client/src/hooks/useCustomerTrackingRealtime.ts");
    expect(hook).toContain("mintCustomerTicket");
    expect(hook).not.toContain("new EventSource");
  });

  it("program docs exist", async () => {
    const base =
      "docs/engineering/programs/REALTIME-PUBLIC-TICKET-HARDENING-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
