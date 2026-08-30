/**
 * REALTIME-PLATFORM-FOUNDATION-1 — unit tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertHintIsMetadataOnly,
  createRealtimeHint,
  negotiateRealtimeCapabilities,
  RealtimeSequenceTracker,
  REALTIME_PROTOCOL_VERSION,
  REALTIME_CHANNEL_REGISTRY,
  REALTIME_SURFACE_CAPABILITY_REGISTRY,
} from "@shared/realtime-platform";
import {
  clearRealtimeTicketRevocations,
  filterChannelsForAuthMode,
  isRealtimeTicketRevoked,
  mintRealtimeTicket,
  revokeRealtimeTicket,
  verifyRealtimeTicket,
} from "../tickets/RealtimeTicketService";
import { InMemoryRealtimePubSub } from "../pubsub/RealtimePubSub";
import { RealtimeHintPublisher } from "../publisher/RealtimeHintPublisher";
import { RealtimeSseGateway } from "../gateway/RealtimeSseGateway";
import {
  getRealtimeMetrics,
  resetRealtimeMetrics,
} from "../observability/realtimeMetrics";
import type { Response } from "express";

beforeEach(() => {
  clearRealtimeTicketRevocations();
  resetRealtimeMetrics();
});

describe("protocol negotiation", () => {
  it("negotiates v1 capabilities as intersection", async () => {
    const result = negotiateRealtimeCapabilities({
      protocolVersion: REALTIME_PROTOCOL_VERSION,
      heartbeat: true,
      compression: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.negotiated.heartbeat).toBe(true);
    expect(result.negotiated.compression).toBe(false);
  });

  it("rejects unsupported protocol version", async () => {
    const result = negotiateRealtimeCapabilities({ protocolVersion: 99 });
    expect(result.ok).toBe(false);
  });
});

describe("hint envelope", () => {
  it("creates metadata-only hints", async () => {
    const hint = createRealtimeHint({
      type: "order.status_changed",
      channel: "orders",
      restaurantId: 7,
      aggregateId: "42",
      seq: 3,
      correlationId: "c1",
    });
    expect(hint.v).toBe(1);
    assertHintIsMetadataOnly(hint);
  });

  it("rejects invalid channel", async () => {
    expect(() =>
      createRealtimeHint({
        type: "order.created",
        channel: "nope" as never,
        restaurantId: 1,
        seq: 1,
      })
    ).toThrow();
  });
});

describe("channel + surface registries", () => {
  it("defines all channels with tenant scope", async () => {
    for (const def of Object.values(REALTIME_CHANNEL_REGISTRY)) {
      expect(def.tenantScoped).toBe(true);
      expect(def.authModes.length).toBeGreaterThan(0);
    }
  });

  it("orders, kitchen, expo, and customer-tracking may be migrated; others stay false", async () => {
    const migrated = new Set(
      REALTIME_SURFACE_CAPABILITY_REGISTRY.filter((s) => s.migrated).map(
        (s) => s.surfaceId
      )
    );
    expect(migrated.has("orders-workspace")).toBe(true);
    expect(migrated.has("kitchen-screen")).toBe(true);
    expect(migrated.has("expo-screen")).toBe(true);
    expect(migrated.has("customer-tracking")).toBe(true);
    for (const surface of REALTIME_SURFACE_CAPABILITY_REGISTRY) {
      if (migrated.has(surface.surfaceId)) continue;
      expect(surface.migrated).toBe(false);
    }
  });
});

describe("tickets", () => {
  it("mints and verifies staff tickets with channel ACL", async () => {
    const minted = mintRealtimeTicket({
      restaurantId: 9,
      authMode: "staff_session",
      sub: "user:1",
      channels: ["orders", "customer"],
    });
    // customer not allowed for staff_session
    expect(minted.claims.channels).toEqual(["orders"]);
    const verified = verifyRealtimeTicket(minted.token);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.claims.restaurantId).toBe(9);
  });

  it("rejects an actually expired HMAC ticket using Unix seconds", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    try {
      const minted = mintRealtimeTicket({
        restaurantId: 1,
        authMode: "staff_session",
        sub: "user:1",
        channels: ["orders"],
        ttlSeconds: 5,
      });
      expect(minted.claims.iat).toBe(1_700_000_000);
      expect(minted.claims.exp).toBe(1_700_000_005);
      expect(verifyRealtimeTicket(minted.token).ok).toBe(true);
      vi.setSystemTime(1_700_000_006_000);
      const expired = verifyRealtimeTicket(minted.token);
      expect(expired.ok).toBe(false);
      if (expired.ok) return;
      expect(expired.code).toBe("expired");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects bad signatures and supports revocation", async () => {
    const minted = mintRealtimeTicket({
      restaurantId: 1,
      authMode: "staff_session",
      sub: "user:1",
      channels: ["dashboard"],
    });
    expect(verifyRealtimeTicket(minted.token + "x").ok).toBe(false);
    revokeRealtimeTicket(minted.claims.jti);
    expect(isRealtimeTicketRevoked(minted.claims.jti)).toBe(true);
  });

  it("filters customer channels", async () => {
    expect(
      filterChannelsForAuthMode(["orders", "customer"], "customer_tracking")
    ).toEqual(["customer"]);
  });
});

describe("publisher + bus", () => {
  it("publishes hints to subscribers", async () => {
    const bus = new InMemoryRealtimePubSub();
    const publisher = new RealtimeHintPublisher(bus);
    const seen: number[] = [];
    bus.subscribe({ restaurantId: 5, channel: "orders" }, (h) => {
      seen.push(h.seq);
    });
    await publisher.publish({
      type: "order.ready",
      channel: "orders",
      restaurantId: 5,
      aggregateId: "1",
      seq: 10,
    });
    expect(seen).toEqual([10]);
    expect(getRealtimeMetrics().publishes).toBe(1);
  });
});

describe("sequence tracker", () => {
  it("detects duplicates and gaps", async () => {
    const t = new RealtimeSequenceTracker();
    expect(t.observe(1, "orders", 1, "a").action).toBe("apply");
    expect(t.observe(1, "orders", 1, "a").action).toBe("apply"); // equal refresh
    expect(t.observe(1, "orders", 0, "a").action).toBe("duplicate");
    const gap = t.observe(1, "orders", 5, "a");
    expect(gap.action).toBe("gap");
  });
});

describe("SSE gateway", () => {
  afterEach(async () => {
    /* noop */
  });

  function mockRes() {
    const chunks: string[] = [];
    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader() {
        return this;
      },
      flushHeaders() {},
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
      end() {},
      on() {
        return this;
      },
      chunks,
    };
    return res as unknown as Response & { chunks: string[]; statusCode: number };
  }

  it("opens connection, delivers tenant-scoped hints, blocks cross-tenant", async () => {
    const bus = new InMemoryRealtimePubSub();
    const gateway = new RealtimeSseGateway(bus);
    const minted = mintRealtimeTicket({
      restaurantId: 3,
      authMode: "staff_session",
      sub: "user:9",
      channels: ["kitchen"],
    });
    const res = mockRes();
    const opened = await gateway.open({
      connectionId: "c1",
      token: minted.token,
      res,
    });
    expect(opened.ok).toBe(true);

    bus.publish(
      createRealtimeHint({
        type: "kitchen.queue_changed",
        channel: "kitchen",
        restaurantId: 3,
        seq: 1,
      })
    );
    bus.publish(
      createRealtimeHint({
        type: "kitchen.queue_changed",
        channel: "kitchen",
        restaurantId: 999,
        seq: 1,
      })
    );

    const body = (res as unknown as { chunks: string[] }).chunks.join("");
    expect(body).toContain("kitchen.queue_changed");
    expect(body).toContain('"restaurantId":3');
    expect(body).not.toContain('"restaurantId":999');

    await gateway.shutdown();
  });

  it("rejects an actually expired HMAC ticket before opening a connection", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    try {
      const gateway = new RealtimeSseGateway(new InMemoryRealtimePubSub());
      const minted = mintRealtimeTicket({
        restaurantId: 3,
        authMode: "staff_session",
        sub: "user:9",
        channels: ["kitchen"],
        ttlSeconds: 1,
      });
      vi.setSystemTime(1_700_000_002_000);
      const res = mockRes();
      const opened = await gateway.open({
        connectionId: "c-expired",
        token: minted.token,
        res,
      });
      expect(opened.ok).toBe(false);
      if (opened.ok) return;
      expect(opened.status).toBe(401);
      expect(opened.message).toContain("expired");
      expect(gateway.connectionCount).toBe(0);
      expect(getRealtimeMetrics().authFailures).toBeGreaterThanOrEqual(1);
      expect(getRealtimeMetrics().connections).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects missing/invalid tickets", async () => {
    const gateway = new RealtimeSseGateway(new InMemoryRealtimePubSub());
    const res = mockRes();
    const opened = await gateway.open({
      connectionId: "c2",
      token: "not-a-ticket",
      res,
    });
    expect(opened.ok).toBe(false);
    if (opened.ok) return;
    expect(opened.status).toBeGreaterThanOrEqual(401);
  });
});
