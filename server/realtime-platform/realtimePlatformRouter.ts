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
import { isRealtimePlatformEnabled } from "./composition";
import { getRealtimeMetrics } from "./observability/realtimeMetrics";

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
   * REALTIME-CUSTOMER-TRACKING-ADOPTION-1
   * Public mint — tracking token + slug only. Never returns restaurantId/orderId claims.
   * Channel locked to `customer`. Independent of staff/device auth.
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
        // Uniform denial — no enumeration of valid tokens vs wrong slug.
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Tracking credentials invalid",
        });
      }

      const trackingRef = hashTrackingToken(input.trackingToken);

      try {
        const minted = mintRealtimeTicket({
          restaurantId: row.restaurantId,
          authMode: "customer_tracking",
          sub: `th:${trackingRef}`,
          channels: ["customer"],
          orderId: row.orderId,
          trackingRef,
          clientCapabilities: {
            ...DEFAULT_CLIENT_CAPABILITIES,
            ...input.clientCapabilities,
          },
        });

        // Public response — no restaurantId, orderId, jti, or raw claims dump.
        return {
          token: minted.token,
          expiresAt: minted.expiresAt,
          ssePath: minted.ssePath,
          trackingRef,
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
});
