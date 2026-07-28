/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * tRPC surface — mint/refresh/revoke tickets + capability introspection.
 * No feature subscriptions here.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import {
  DEFAULT_CLIENT_CAPABILITIES,
  REALTIME_CHANNELS,
  REALTIME_PROTOCOL_VERSION,
  REALTIME_SURFACE_CAPABILITY_REGISTRY,
  REALTIME_CHANNEL_REGISTRY,
  type RealtimeChannel,
} from "@shared/realtime-platform";

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
});
