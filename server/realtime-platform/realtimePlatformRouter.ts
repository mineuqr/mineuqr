/**
 * REALTIME-PLATFORM-FOUNDATION-1 / REALTIME-CUSTOMER-TRACKING-ADOPTION-1
 * tRPC surface — mint/refresh/revoke tickets + capability introspection.
 * Customer mint is public (tracking token + slug); staff mint remains protected.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import {
  DEFAULT_CLIENT_CAPABILITIES,
  REALTIME_CHANNELS,
  REALTIME_PROTOCOL_VERSION,
  REALTIME_SURFACE_CAPABILITY_REGISTRY,
  REALTIME_CHANNEL_REGISTRY,
  type RealtimeChannel,
} from "@shared/realtime-platform";
import { getOrderByTrackingToken } from "../db";
import { hashTrackingToken } from "./privacy/publicCustomerHint";

const realtimeChannelEnum = z.enum(
  REALTIME_CHANNELS as unknown as [RealtimeChannel, ...RealtimeChannel[]]
);
import {
  mintRealtimeTicket,
  revokeRealtimeTicket,
  verifyRealtimeTicket,
} from "./tickets/RealtimeTicketService";
import {
  issueOpaqueCustomerTicket,
  isOpaqueCustomerTicketsEnabled,
  isOpaqueRealtimeTicket,
  renewOpaqueCustomerTicket,
  revokeOpaqueRealtimeTicket,
} from "./tickets/RealtimeOpaqueTicketRegistry";
import { isRealtimePlatformEnabled, getRealtimeSseGateway } from "./composition";
import { getRealtimeMetrics } from "./observability/realtimeMetrics";
import { buildRealtimeObservabilityDashboard } from "./observability/realtimeDashboard";
import { REALTIME_METRICS_CATALOG } from "./observability/realtimeMetricsCatalog";
import { evaluateRealtimeHealth } from "./observability/realtimeHealth";
import { evaluateRealtimeAlerts } from "./observability/realtimeAlerts";
import {
  getChannelObservabilitySnapshots,
  getObservabilityAuthStats,
  getObservabilityLatencyStats,
} from "./observability/realtimeObservabilityStore";
import { getOpaqueTicketRegistrySize } from "./tickets/RealtimeOpaqueTicketRegistry";

const clientCapabilitiesSchema = z
  .object({
    protocolVersion: z.number().int().min(1).max(32).optional(),
    heartbeat: z.boolean().optional(),
    broadcastBridge: z.boolean().optional(),
    reconnect: z.boolean().optional(),
    pollFallback: z.boolean().optional(),
    compression: z.boolean().optional(),
    lastEventIdResume: z.boolean().optional(),
  })
  .optional();

export const realtimePlatformRouter = router({
  status: protectedProcedure.query(() => ({
    program: "REALTIME-PLATFORM-FOUNDATION-1" as const,
    enabled: isRealtimePlatformEnabled(),
    protocolVersion: REALTIME_PROTOCOL_VERSION,
    channels: REALTIME_CHANNELS,
    metrics: getRealtimeMetrics(),
  })),

  /**
   * REALTIME-PLATFORM-OBSERVABILITY-1 — unified operational dashboard aggregate.
   * Visibility only; no business payloads.
   */
  observabilityDashboard: protectedProcedure.query(() =>
    buildRealtimeObservabilityDashboard()
  ),

  observabilityHealth: protectedProcedure.query(() => {
    const metrics = getRealtimeMetrics();
    const auth = getObservabilityAuthStats();
    const latency = getObservabilityLatencyStats();
    const channels = getChannelObservabilitySnapshots();
    const authTotal = auth.success + auth.denied;
    return evaluateRealtimeHealth({
      platformEnabled: isRealtimePlatformEnabled(),
      activeConnections: getRealtimeSseGateway().connectionCount,
      authFailureRate: authTotal > 0 ? auth.denied / authTotal : 0,
      channelAuthFailures: metrics.channelAuthFailures,
      publishToDeliverP95Ms: latency.publishToDeliver.p95,
      fallbackActivations: metrics.fallbackActivations,
      registrySize: getOpaqueTicketRegistrySize(),
      recentAuthDenied: auth.denied,
      publisherPublishes: metrics.publishes,
      channelSubscriberGaps: channels.map((c) => ({
        channel: c.channel,
        subscribers: c.subscribers,
        publishes: c.publishes,
      })),
    });
  }),

  observabilityAlerts: protectedProcedure.query(() => {
    const metrics = getRealtimeMetrics();
    const auth = getObservabilityAuthStats();
    const latency = getObservabilityLatencyStats();
    return evaluateRealtimeAlerts({
      activeConnections: getRealtimeSseGateway().connectionCount,
      reconnects: metrics.reconnects,
      publishToDeliverP95Ms: latency.publishToDeliver.p95,
      authFailures: metrics.authFailures,
      authDenied: auth.denied,
      channelAuthFailures: metrics.channelAuthFailures,
      registryLookups: metrics.registryLookups,
      registryLookupFailuresApprox: auth.denied,
      deliveries: metrics.deliveries,
      dropped: metrics.dropped,
      fallbackActivations: metrics.fallbackActivations,
      platformEnabled: isRealtimePlatformEnabled(),
      // Runtime failure signal only — do not equate configuration disable with gateway crash.
      gatewayUnavailable: false,
    });
  }),

  observabilityCatalog: protectedProcedure.query(() => ({
    program: "REALTIME-PLATFORM-OBSERVABILITY-1" as const,
    metrics: REALTIME_METRICS_CATALOG,
  })),

  listChannels: protectedProcedure.query(() =>
    Object.values(REALTIME_CHANNEL_REGISTRY)
  ),

  listSurfaceCapabilities: protectedProcedure.query(() =>
    REALTIME_SURFACE_CAPABILITY_REGISTRY
  ),

  mintTicket: protectedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        channels: z.array(realtimeChannelEnum).min(1).max(16),
        clientCapabilities: clientCapabilitiesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isRealtimePlatformEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Realtime platform disabled",
        });
      }
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "realtime.mintTicket"
      );

      try {
        return mintRealtimeTicket({
          restaurantId: input.restaurantId,
          authMode: "staff_session",
          sub: `user:${ctx.user!.id}`,
          channels: input.channels,
          clientCapabilities: {
            ...DEFAULT_CLIENT_CAPABILITIES,
            ...input.clientCapabilities,
          },
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Ticket mint failed",
        });
      }
    }),

  refreshTicket: protectedProcedure
    .input(
      z.object({
        token: z.string().min(16),
        clientCapabilities: clientCapabilitiesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isRealtimePlatformEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Realtime platform disabled",
        });
      }
      const verified = verifyRealtimeTicket(input.token);
      if (!verified.ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Ticket ${verified.code}`,
        });
      }
      if (verified.claims.authMode !== "staff_session") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ticket auth mode mismatch",
        });
      }
      if (verified.claims.sub !== `user:${ctx.user!.id}`) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ticket subject mismatch",
        });
      }
      await assertRestaurantAccess(
        ctx,
        verified.claims.restaurantId,
        "realtime.refreshTicket"
      );

      revokeRealtimeTicket(verified.claims.jti);
      return mintRealtimeTicket({
        restaurantId: verified.claims.restaurantId,
        authMode: "staff_session",
        sub: verified.claims.sub,
        channels: verified.claims.channels,
        clientCapabilities: {
          ...DEFAULT_CLIENT_CAPABILITIES,
          ...input.clientCapabilities,
        },
        deviceId: verified.claims.deviceId,
        orderId: verified.claims.orderId,
      });
    }),

  revokeTicket: protectedProcedure
    .input(z.object({ token: z.string().min(16) }))
    .mutation(({ ctx, input }) => {
      const verified = verifyRealtimeTicket(input.token);
      if (!verified.ok) return { success: true as const };
      if (verified.claims.sub !== `user:${ctx.user!.id}`) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ticket subject mismatch",
        });
      }
      revokeRealtimeTicket(verified.claims.jti);
      return { success: true as const };
    }),

  /**
   * REALTIME-CUSTOMER-TRACKING-ADOPTION-1 / REALTIME-PUBLIC-TICKET-HARDENING-1
   * Public mint — tracking token + slug only.
   * Default: opaque `rt_live_…` ticket (no JWT claims on the wire).
   * Rollback: REALTIME_OPAQUE_CUSTOMER_TICKETS=false → legacy signed ticket
   * (still omits claims from API JSON).
   */
  mintCustomerTicket: publicProcedure
    .input(
      z.object({
        trackingToken: z
          .string()
          .min(16)
          .max(64)
          .regex(/^[A-Za-z0-9_-]+$/),
        slug: z.string().min(1).max(128),
        clientCapabilities: clientCapabilitiesSchema,
      })
    )
    .mutation(async ({ input }) => {
      if (!isRealtimePlatformEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Realtime platform disabled",
        });
      }

      const row = await getOrderByTrackingToken(
        input.trackingToken,
        input.slug
      );
      if (!row) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Tracking credentials invalid",
        });
      }

      const trackingRef = hashTrackingToken(input.trackingToken);
      const caps = {
        ...DEFAULT_CLIENT_CAPABILITIES,
        ...input.clientCapabilities,
      };

      try {
        if (isOpaqueCustomerTicketsEnabled()) {
          const minted = issueOpaqueCustomerTicket({
            restaurantId: row.restaurantId,
            orderId: row.orderId,
            trackingTokenHash: trackingRef,
            clientCapabilities: caps,
          });
          return {
            token: minted.token,
            expiresAt: minted.expiresAt,
            ssePath: minted.ssePath,
            channels: minted.channels,
            protocolVersion: minted.protocolVersion,
            negotiated: {
              heartbeat: minted.negotiated.heartbeat,
              reconnect: minted.negotiated.reconnect,
              pollFallback: minted.negotiated.pollFallback,
              broadcastBridge: minted.negotiated.broadcastBridge,
              lastEventIdResume: minted.negotiated.lastEventIdResume,
              ticketTtlSeconds: minted.negotiated.ticketTtlSeconds,
              protocolVersion: minted.negotiated.protocolVersion,
            },
          };
        }

        // Rollback path — signed ticket; API still omits business claims JSON.
        const minted = mintRealtimeTicket({
          restaurantId: row.restaurantId,
          authMode: "customer_tracking",
          sub: `th:${trackingRef}`,
          channels: ["customer"],
          orderId: row.orderId,
          trackingRef,
          clientCapabilities: caps,
        });

        return {
          token: minted.token,
          expiresAt: minted.expiresAt,
          ssePath: minted.ssePath,
          channels: minted.claims.channels,
          protocolVersion: minted.claims.protocolVersion,
          negotiated: {
            heartbeat: minted.negotiated.heartbeat,
            reconnect: minted.negotiated.reconnect,
            pollFallback: minted.negotiated.pollFallback,
            broadcastBridge: minted.negotiated.broadcastBridge,
            lastEventIdResume: minted.negotiated.lastEventIdResume,
            ticketTtlSeconds: minted.negotiated.ticketTtlSeconds,
            protocolVersion: minted.negotiated.protocolVersion,
          },
        };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Ticket mint failed",
        });
      }
    }),

  /**
   * REALTIME-PUBLIC-TICKET-HARDENING-1
   * Rotate a still-valid opaque customer ticket without re-sending tracking token.
   * Expired tickets must remint via mintCustomerTicket.
   */
  renewCustomerTicket: publicProcedure
    .input(
      z.object({
        token: z.string().min(16),
        clientCapabilities: clientCapabilitiesSchema,
      })
    )
    .mutation(({ input }) => {
      if (!isRealtimePlatformEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Realtime platform disabled",
        });
      }
      if (!isOpaqueRealtimeTicket(input.token)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Opaque ticket required",
        });
      }
      const renewed = renewOpaqueCustomerTicket(
        input.token,
        input.clientCapabilities
      );
      if (!renewed) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Ticket expired or invalid",
        });
      }
      return {
        token: renewed.token,
        expiresAt: renewed.expiresAt,
        ssePath: renewed.ssePath,
        channels: renewed.channels,
        protocolVersion: renewed.protocolVersion,
        negotiated: {
          heartbeat: renewed.negotiated.heartbeat,
          reconnect: renewed.negotiated.reconnect,
          pollFallback: renewed.negotiated.pollFallback,
          broadcastBridge: renewed.negotiated.broadcastBridge,
          lastEventIdResume: renewed.negotiated.lastEventIdResume,
          ticketTtlSeconds: renewed.negotiated.ticketTtlSeconds,
          protocolVersion: renewed.negotiated.protocolVersion,
        },
      };
    }),

  /** Public revoke for opaque customer tickets (best-effort; idempotent). */
  revokeCustomerTicket: publicProcedure
    .input(z.object({ token: z.string().min(16) }))
    .mutation(({ input }) => {
      if (isOpaqueRealtimeTicket(input.token)) {
        revokeOpaqueRealtimeTicket(input.token, "client_revoke");
      }
      return { success: true as const };
    }),
});
