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
import { operationalDeviceComposition } from "../operationalDeviceComposition";
import { summarizeDeviceHealth } from "../domain/deviceHealth";
import { resolveScreenConfigVersion } from "../domain/screenConfigVersion";

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

  redeemPairingCode: publicProcedure.input(redeemPairingCodeInput).mutation(async ({ input }) => {
    const result = await operationalDeviceComposition.pairingService.redeemPairingCode(
      input.pairingCode
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
    return {
      device: {
        deviceId: device.deviceId,
        role: device.role,
        displayName: device.displayName,
        restaurantId: device.restaurantId,
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
});
