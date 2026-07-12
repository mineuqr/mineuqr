import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { summarizeDeviceHealth, deriveDevicePresence } from "../domain/deviceHealth";
import { operationalDeviceComposition } from "../operationalDeviceComposition";
import {
  logOperationalScreenCreated,
  logPairingCodeIssued,
  logPairingCredentialRegenerated,
  logPairingRevoked,
  logPairingScreenDeleted,
} from "../governance/pairingAudit";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const deviceRoleSchema = z.enum([
  "kitchen_display",
  "expo_display",
  "pickup_display",
  "customer_display",
  "print_monitor",
  "self_ordering_kiosk",
]);

const createDeviceInput = restaurantInput.extend({
  displayName: z.string().min(2).max(128),
  role: deviceRoleSchema,
  branchId: z.coerce.number().int().positive().nullable().optional(),
});

const deviceInput = restaurantInput.extend({
  deviceId: z.string().min(8).max(64),
});

async function presentIssuanceResponse(
  device: Awaited<ReturnType<typeof operationalDeviceComposition.registryService.createDevice>>["device"],
  token: Awaited<ReturnType<typeof operationalDeviceComposition.registryService.createDevice>>["token"]
) {
  const recovery = await operationalDeviceComposition.recoveryService.presentIssuanceRecovery(
    device,
    token
  );
  return {
    device,
    token: recovery.token,
    pairingCode: token.pairingCode,
    recoveryQrSvg: recovery.recoveryQrSvg,
  };
}

/** Operator device management — verified user session, not device tokens. */
export const operationalDeviceManagementRouter = router({
  list: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.list");
    return operationalDeviceComposition.registryService.listDevices(input.restaurantId);
  }),

  get: verifiedProcedure.input(deviceInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.get");
    const device = await operationalDeviceComposition.registryService.getDevice(
      input.deviceId,
      input.restaurantId
    );
    if (!device) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
    }
    return device;
  }),

  create: verifiedProcedure.input(createDeviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.create");
    const result = await operationalDeviceComposition.registryService.createDevice({
      restaurantId: input.restaurantId,
      branchId: input.branchId ?? null,
      role: input.role,
      displayName: input.displayName,
    });
    logOperationalScreenCreated({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: result.device.deviceId,
      tokenId: result.token.tokenId,
    });
    logPairingCodeIssued({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: result.device.deviceId,
      tokenId: result.token.tokenId,
    });
    return presentIssuanceResponse(result.device, result.token);
  }),

  disable: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.disable");
    const ok = await operationalDeviceComposition.registryService.disableDevice(
      input.deviceId,
      input.restaurantId
    );
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
    logPairingRevoked({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
    });
    return { success: true as const };
  }),

  enable: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.enable");
    const ok = await operationalDeviceComposition.registryService.enableDevice(
      input.deviceId,
      input.restaurantId
    );
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
    return { success: true as const };
  }),

  rotateToken: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.rotateToken");
    const token = await operationalDeviceComposition.registryService.rotateToken(
      input.deviceId,
      input.restaurantId
    );
    if (!token) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Device not found or disabled" });
    }
    const device = await operationalDeviceComposition.store.getDevice(input.deviceId);
    if (!device) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
    }
    logPairingCredentialRegenerated({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      tokenId: token.tokenId,
    });
    logPairingCodeIssued({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      tokenId: token.tokenId,
    });
    return presentIssuanceResponse(device, token);
  }),

  regenerateCredential: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(
      ctx,
      input.restaurantId,
      "operationalDevice.management.regenerateCredential"
    );
    const token = await operationalDeviceComposition.registryService.regenerateCredential(
      input.deviceId,
      input.restaurantId
    );
    if (!token) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Device not found or disabled" });
    }
    const device = await operationalDeviceComposition.store.getDevice(input.deviceId);
    if (!device) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
    }
    logPairingCredentialRegenerated({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      tokenId: token.tokenId,
    });
    logPairingCodeIssued({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      tokenId: token.tokenId,
    });
    return presentIssuanceResponse(device, token);
  }),

  getScreenCredential: verifiedProcedure.input(deviceInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(
      ctx,
      input.restaurantId,
      "operationalDevice.management.getScreenCredential"
    );
    const result = await operationalDeviceComposition.recoveryService.getScreenRecovery(
      input.deviceId,
      input.restaurantId
    );
    if (result == null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Screen not found" });
    }
    if ("retrievable" in result && result.retrievable === false) {
      return result;
    }
    const activeToken = await operationalDeviceComposition.store.findActiveTokenForDevice(
      input.deviceId
    );
    return {
      retrievable: true as const,
      ...result,
      pairing: {
        hasUnredeemedPairingCode: activeToken?.activationCodeHash != null,
      },
    };
  }),

  deleteScreen: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.deleteScreen");
    const ok = await operationalDeviceComposition.registryService.deleteDevice(
      input.deviceId,
      input.restaurantId
    );
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Screen not found" });
    logPairingScreenDeleted({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
    });
    return { success: true as const };
  }),

  revokeToken: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.revokeToken");
    const ok = await operationalDeviceComposition.registryService.revokeToken(
      input.deviceId,
      input.restaurantId
    );
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "No active token" });
    logPairingRevoked({
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
    });
    return { success: true as const };
  }),

  updateScreenSettings: verifiedProcedure
    .input(
      deviceInput.extend({
        displayName: z.string().min(2).max(128).optional(),
        screenConfig: z
          .object({
            language: z.enum(["ar", "en"]).optional(),
            displayDirection: z.enum(["rtl", "ltr"]).optional(),
            displayDensity: z.enum(["large", "comfortable", "compact"]).optional(),
            visibleCategoryIds: z.array(z.coerce.number().int().positive()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "operationalDevice.management.updateScreenSettings"
      );
      const updated = await operationalDeviceComposition.registryService.updateScreenSettings(
        input.deviceId,
        input.restaurantId,
        {
          displayName: input.displayName,
          screenConfig: input.screenConfig,
        }
      );
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Screen not found" });
      }
      const activeToken = await operationalDeviceComposition.store.findActiveTokenForDevice(
        input.deviceId
      );
      return {
        ...updated,
        presence: deriveDevicePresence(updated.lastSeenAt),
        hasActiveToken: activeToken != null,
      };
    }),

  getHealthSummary: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(
      ctx,
      input.restaurantId,
      "operationalDevice.management.getHealthSummary"
    );
    const devices = await operationalDeviceComposition.registryService.listDevices(input.restaurantId);
    return {
      total: devices.length,
      online: devices.filter((d) => d.presence === "online").length,
      offline: devices.filter((d) => d.presence === "offline").length,
      disabled: devices.filter((d) => d.status === "disabled").length,
      devices: devices.map((device) => ({
        deviceId: device.deviceId,
        displayName: device.displayName,
        role: device.role,
        health: summarizeDeviceHealth({
          status: device.status,
          lastSeenAt: device.lastSeenAt,
          reportedVersion: device.reportedVersion,
          hasActiveToken: device.hasActiveToken,
        }),
      })),
    };
  }),
});
