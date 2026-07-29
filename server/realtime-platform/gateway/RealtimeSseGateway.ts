/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * SSE gateway — connection lifecycle, ACL, fan-out. No business rules.
 */

import type { Response } from "express";
import type { RealtimeHint, RealtimeTicketClaims } from "@shared/realtime-platform";
import { DEFAULT_SERVER_CAPABILITIES } from "@shared/realtime-platform";
import type { RealtimePubSub } from "../pubsub/RealtimePubSub";
import { authorizeRealtimeCredential } from "../tickets/authorizeRealtimeCredential";
import {
  bindOpaqueTicketConnection,
  isOpaqueRealtimeTicket,
} from "../tickets/RealtimeOpaqueTicketRegistry";
import {
  incRealtimeMetric,
  noteRealtimeEvent,
} from "../observability/realtimeMetrics";
import { toPublicCustomerRealtimeHint } from "../privacy/publicCustomerHint";

export type RealtimeConnection = {
  id: string;
  claims: RealtimeTicketClaims;
  channels: string[];
  res: Response;
  unsubs: Array<() => void>;
  heartbeat: ReturnType<typeof setInterval> | null;
  closed: boolean;
};

function writeSse(
  res: Response,
  event: string,
  data: unknown,
  id?: string
): void {
  if (id) res.write(`id: ${id}\n`);
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export class RealtimeSseGateway {
  private readonly connections = new Map<string, RealtimeConnection>();
  private shuttingDown = false;

  constructor(private readonly bus: RealtimePubSub) {}

  get connectionCount(): number {
    return this.connections.size;
  }

  open(input: {
    connectionId: string;
    token: string;
    channels?: string[];
    lastEventId?: string;
    res: Response;
  }): { ok: true; connection: RealtimeConnection } | { ok: false; status: number; message: string } {
    if (this.shuttingDown) {
      return { ok: false, status: 503, message: "Realtime gateway shutting down" };
    }

    const verified = authorizeRealtimeCredential(input.token);
    if (!verified.ok) {
      incRealtimeMetric("authFailures");
      noteRealtimeEvent("realtime_auth_failed", { code: verified.code });
      return {
        ok: false,
        status:
          verified.code === "expired" || verified.code === "revoked"
            ? 401
            : 403,
        message: `Realtime ticket ${verified.code}`,
      };
    }

    const allowed = new Set(verified.claims.channels);
    const requested =
      input.channels?.length
        ? input.channels.filter((c) => allowed.has(c as never))
        : verified.claims.channels;

    if (requested.length === 0) {
      incRealtimeMetric("channelAuthFailures");
      return { ok: false, status: 403, message: "No permitted channels" };
    }

    const res = input.res;
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as { flushHeaders?: () => void }).flushHeaders === "function") {
      (res as { flushHeaders: () => void }).flushHeaders();
    }

    const connection: RealtimeConnection = {
      id: input.connectionId,
      claims: verified.claims,
      channels: requested,
      res,
      unsubs: [],
      heartbeat: null,
      closed: false,
    };

    if (isOpaqueRealtimeTicket(input.token)) {
      bindOpaqueTicketConnection(input.token, connection.id);
    }

    for (const channel of requested) {
      const unsub = this.bus.subscribe(
        { restaurantId: verified.claims.restaurantId, channel },
        (hint) => this.deliver(connection, hint)
      );
      connection.unsubs.push(unsub);
      incRealtimeMetric("subscriptions");
    }

    const heartbeatMs =
      verified.claims.capabilities.heartbeat
        ? DEFAULT_SERVER_CAPABILITIES.heartbeatIntervalMs
        : 0;

    if (heartbeatMs > 0) {
      connection.heartbeat = setInterval(() => {
        if (connection.closed) return;
        try {
          writeSse(res, "platform.heartbeat", {
            ts: new Date().toISOString(),
            connectionId: connection.id,
          });
          incRealtimeMetric("heartbeats");
        } catch {
          this.close(connection.id);
        }
      }, heartbeatMs);
    }

    this.connections.set(connection.id, connection);
    incRealtimeMetric("connections");
    noteRealtimeEvent("realtime_connection_opened", {
      connectionId: connection.id,
      restaurantId: verified.claims.restaurantId,
      channels: requested,
      lastEventId: input.lastEventId ?? null,
    });

    const isCustomer = verified.claims.authMode === "customer_tracking";
    writeSse(
      res,
      "platform.ready",
      isCustomer
        ? {
            connectionId: connection.id,
            channels: requested,
            protocolVersion: verified.claims.protocolVersion,
          }
        : {
            connectionId: connection.id,
            restaurantId: verified.claims.restaurantId,
            channels: requested,
            protocolVersion: verified.claims.protocolVersion,
          }
    );

    // Resume does not replay domain history — instruct catch-up refetch.
    if (input.lastEventId) {
      writeSse(res, "platform.catch_up", {
        reason: "resume",
        lastEventId: input.lastEventId,
      });
    }

    res.on("close", () => this.close(connection.id));

    return { ok: true, connection };
  }

  private deliver(connection: RealtimeConnection, hint: RealtimeHint): void {
    if (connection.closed) return;
    // Hard tenant isolation
    if (hint.restaurantId !== connection.claims.restaurantId) {
      incRealtimeMetric("dropped");
      return;
    }
    if (!connection.channels.includes(hint.channel)) {
      incRealtimeMetric("dropped");
      return;
    }
    // Customer token scope: only own aggregate when orderId bound
    if (
      connection.claims.authMode === "customer_tracking" &&
      connection.claims.orderId != null &&
      hint.aggregateId != null &&
      hint.aggregateId !== String(connection.claims.orderId)
    ) {
      incRealtimeMetric("dropped");
      return;
    }

    try {
      const isCustomer = connection.claims.authMode === "customer_tracking";
      const trackingRef =
        connection.claims.trackingRef ??
        connection.claims.sub.replace(/^th:/, "");
      // Public event ids: connection-scoped only (no tracking/order identifiers).
      const eventId = isCustomer
        ? `customer:${connection.id}:${hint.seq}`
        : `${hint.channel}:${hint.aggregateId ?? "_"}:${hint.seq}`;
      const payload = isCustomer
        ? toPublicCustomerRealtimeHint(hint, trackingRef)
        : hint;
      writeSse(connection.res, hint.type, payload, eventId);
      incRealtimeMetric("deliveries");
      noteRealtimeEvent("realtime_hint_delivered", {
        connectionId: connection.id,
        channel: hint.channel,
        restaurantId: hint.restaurantId,
        seq: hint.seq,
        type: hint.type,
        public: connection.claims.authMode === "customer_tracking",
      });
    } catch {
      this.close(connection.id);
    }
  }

  close(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.closed) return;
    connection.closed = true;
    if (connection.heartbeat) clearInterval(connection.heartbeat);
    for (const unsub of connection.unsubs) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    this.connections.delete(connectionId);
    incRealtimeMetric("connections", -1);
    noteRealtimeEvent("realtime_connection_closed", {
      connectionId,
      restaurantId: connection.claims.restaurantId,
    });
    try {
      connection.res.end();
    } catch {
      /* ignore */
    }
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const id of [...this.connections.keys()]) {
      this.close(id);
    }
  }
}
