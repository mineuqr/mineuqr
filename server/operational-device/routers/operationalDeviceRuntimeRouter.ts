import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, deviceProcedure, router } from "../../_core/trpc";
import { kitchenReadService } from "../../kitchen/read/services/KitchenReadService";
import { printWorkspaceReadService } from "../../print-workspace/read/services/PrintWorkspaceReadService";
import {
  rolePermitsKitchenQueue,
  rolePermitsPrintMonitor,
} from "../domain/deviceRoles";
import { DEVICE_ORDER_ACTION_IDS } from "../domain/deviceOrderExecution";
import { executeDeviceOrderAction } from "../services/DeviceOrderExecutionService";
import {
  DEFAULT_CLIENT_CAPABILITIES,
  REALTIME_CHANNELS,
  type RealtimeChannel,
} from "@shared/realtime-platform";
import { mintRealtimeTicket } from "../../realtime-platform/tickets/RealtimeTicketService";
import { isRealtimePlatformEnabled } from "../../realtime-platform/composition";
import {
  attachWaiterTableForDevice,
  getWaiterTableWorkspaceForDevice,
  listWaiterFloorTablesForDevice,
  placeWaiterOrderForDevice,
} from "../services/WaiterDeviceOrderingService";
import { operationalDeviceComposition } from "../operationalDeviceComposition";
import { summarizeDeviceHealth } from "../domain/deviceHealth";
import { resolveScreenConfigVersion } from "../domain/screenConfigVersion";
import { enforcePairingRedeemRateLimit } from "../governance/pairingRateLimits";
import { getClientIp } from "../../_core/rateLimit";
import { getRestaurantById } from "../../db";
import { SESSION_TOKEN_PATTERN } from "../../diningSession/sessionPublicStatus";

const authenticateInput = z.object({
  deviceId: z.string().min(8).max(64),
  tokenId: z.string().min(8).max(64),
  secret: z.string().min(16).max(256),
});

const authenticateByActivationCodeInput = z.object({
  activationCode: z.string().min(8).max(16),
});

const redeemPairingCodeInput = z.object({
  pairingCode: z.string().min(6).max(16),
});

const heartbeatInput = z.object({
  reportedVersion: z.string().max(64).optional(),
});

const kitchenQueueInput = z.object({
  status: z.enum(["pending", "preparing", "ready", "all"]).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

const executeOrderActionInput = z.object({
  orderId: z.number().int().positive(),
  action: z.enum(DEVICE_ORDER_ACTION_IDS),
});

const attachWaiterTableInput = z.object({
  tableId: z.number().int().positive(),
  tableNumber: z.number().int().positive(),
});

const waiterTableWorkspaceInput = z.object({
  sessionId: z.number().int().positive(),
});

const placeWaiterOrderItemInput = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99),
  notes: z.string().max(500).nullish(),
  modifiers: z.array(z.string().max(120)).max(32).optional(),
});

const placeWaiterOrderInput = z.object({
  serviceMode: z.literal("table_service"),
  fulfilmentAnchor: z.object({
    anchorType: z.literal("table"),
    tableId: z.number().int().positive(),
    tableNumber: z.number().int().positive(),
    fulfilmentLabel: z.string().min(1).max(64).optional(),
  }),
  customerName: z.string().nullish(),
  customerPhone: z.string().nullish(),
  notes: z.string().nullish(),
  items: z.array(placeWaiterOrderItemInput).min(1),
  sessionToken: z
    .string()
    .min(16)
    .max(64)
    .regex(SESSION_TOKEN_PATTERN)
    .optional(),
});

/**
 * Device runtime endpoints — device token auth only. No dashboard/user procedures.
 */
export const operationalDeviceRuntimeRouter = router({
  authenticate: publicProcedure.input(authenticateInput).mutation(async ({ input }) => {
    const result = await operationalDeviceComposition.authService.authenticate(input);
    if (!result.ok) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: result.code });
    }
    return {
      session: result.session,
    };
  }),

  authenticateByActivationCode: publicProcedure
    .input(authenticateByActivationCodeInput)
    .mutation(async ({ input }) => {
      const result = await operationalDeviceComposition.authService.authenticateByActivationCode(
        input.activationCode
      );
      if (!result.ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: result.code });
      }
      return {
        session: result.session,
        bootstrapCredentials: result.bootstrapCredentials ?? null,
      };
    }),

  redeemPairingCode: publicProcedure.input(redeemPairingCodeInput).mutation(async ({ input, ctx }) => {
    enforcePairingRedeemRateLimit(ctx);

    const result = await operationalDeviceComposition.pairingService.redeemPairingCode(
      input.pairingCode,
      {
        audit: {
          correlationId: ctx.correlationId,
          ip: getClientIp(ctx.req),
          procedure: "operationalDevice.runtime.redeemPairingCode",
        },
      }
    );
    if (!result.ok) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: result.code });
    }
    return {
      bootstrapCredentials: result.bootstrapCredentials,
    };
  }),

  heartbeat: deviceProcedure.input(heartbeatInput).mutation(async ({ input, ctx }) => {
    const health = await operationalDeviceComposition.heartbeatService.recordHeartbeat({
      deviceId: ctx.deviceSession!.deviceId,
      reportedVersion: input.reportedVersion,
    });
    return { health };
  }),

  getStatus: deviceProcedure.query(async ({ ctx }) => {
    const device = await operationalDeviceComposition.store.getDevice(ctx.deviceSession!.deviceId);
    if (!device) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
    }
    const activeToken = await operationalDeviceComposition.store.findActiveTokenForDevice(
      device.deviceId
    );
    // KIOSK-SCREEN-ACTIVATION-1 — slug required to host KioskShell from Screen Runtime.
    const restaurant = await getRestaurantById(device.restaurantId);
    return {
      device: {
        deviceId: device.deviceId,
        role: device.role,
        displayName: device.displayName,
        restaurantId: device.restaurantId,
        restaurantSlug: restaurant?.slug ?? null,
        branchId: device.branchId,
        status: device.status,
      },
      screenConfig: device.screenConfig,
      configVersion: resolveScreenConfigVersion(device),
      health: summarizeDeviceHealth({
        status: device.status,
        lastSeenAt: device.lastSeenAt,
        reportedVersion: device.reportedVersion,
        hasActiveToken: activeToken != null,
      }),
    };
  }),

  getKitchenQueue: deviceProcedure.input(kitchenQueueInput).query(async ({ input, ctx }) => {
    const session = ctx.deviceSession!;
    if (!rolePermitsKitchenQueue(session.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Role cannot access kitchen queue" });
    }
    return kitchenReadService.getQueue({
      restaurantId: session.restaurantId,
      status: input.status ?? "all",
      limit: input.limit,
    });
  }),

  /**
   * REALTIME-KITCHEN-ADOPTION-1 / REALTIME-EXPO-ADOPTION-1
   * Device-scoped realtime ticket — kitchen_display→kitchen or expo_display→expo.
   */
  mintRealtimeTicket: deviceProcedure
    .input(
      z.object({
        channels: z
          .array(
            z.enum(
              REALTIME_CHANNELS as unknown as [RealtimeChannel, ...RealtimeChannel[]]
            )
          )
          .min(1)
          .max(4),
        clientCapabilities: z
          .object({
            protocolVersion: z.number().int().min(1).max(32).optional(),
            heartbeat: z.boolean().optional(),
            broadcastBridge: z.boolean().optional(),
            reconnect: z.boolean().optional(),
            pollFallback: z.boolean().optional(),
            compression: z.boolean().optional(),
            lastEventIdResume: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!isRealtimePlatformEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Realtime platform disabled",
        });
      }
      const session = ctx.deviceSession!;
      if (!rolePermitsKitchenQueue(session.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Role cannot access kitchen queue",
        });
      }

      let allowedChannel: "kitchen" | "expo";
      if (session.role === "kitchen_display") {
        allowedChannel = "kitchen";
      } else if (session.role === "expo_display") {
        allowedChannel = "expo";
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Realtime device adoption is kitchen_display or expo_display only",
        });
      }

      if (input.channels.some((c) => c !== allowedChannel)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Device realtime may only request ${allowedChannel} channel`,
        });
      }
      try {
        return mintRealtimeTicket({
          restaurantId: session.restaurantId,
          authMode: "device_session",
          sub: `device:${session.deviceId}`,
          channels: [allowedChannel],
          deviceId: session.deviceId,
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

  getPrintMonitorSummary: deviceProcedure.query(async ({ ctx }) => {
    const session = ctx.deviceSession!;
    if (!rolePermitsPrintMonitor(session.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Role cannot access print monitor" });
    }
    const list = await printWorkspaceReadService.listOrders({
      restaurantId: session.restaurantId,
      view: "awaiting",
      limit: 50,
    });
    return {
      awaitingCount: list.items.filter((item) => item.isActive).length,
      items: list.items.slice(0, 20),
    };
  }),

  executeOrderAction: deviceProcedure
    .input(executeOrderActionInput)
    .mutation(async ({ input, ctx }) => {
      return executeDeviceOrderAction({
        session: ctx.deviceSession!,
        orderId: input.orderId,
        action: input.action,
        correlationId: ctx.correlationId,
      });
    }),

  /**
   * WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 — device-authenticated waiter floor list.
   * Restaurant scope comes from device session (not dashboard user).
   */
  listWaiterFloorTables: deviceProcedure.query(async ({ ctx }) => {
    return listWaiterFloorTablesForDevice(ctx.deviceSession!);
  }),

  attachWaiterTable: deviceProcedure
    .input(attachWaiterTableInput)
    .mutation(async ({ input, ctx }) => {
      return attachWaiterTableForDevice(ctx.deviceSession!, input);
    }),

  /** WAITER-TABLE-WORKSPACE-1 — session workspace from Order Read projections. */
  getWaiterTableWorkspace: deviceProcedure
    .input(waiterTableWorkspaceInput)
    .query(async ({ input, ctx }) => {
      return getWaiterTableWorkspaceForDevice(ctx.deviceSession!, input);
    }),

  placeWaiterOrder: deviceProcedure
    .input(placeWaiterOrderInput)
    .mutation(async ({ input, ctx }) => {
      return placeWaiterOrderForDevice(ctx.deviceSession!, input);
    }),
});
