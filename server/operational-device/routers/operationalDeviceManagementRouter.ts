import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { summarizeDeviceHealth } from "../domain/deviceHealth";
import { operationalDeviceComposition } from "../operationalDeviceComposition";

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
    return {
      device: result.device,
      token: {
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        issuedAt: result.token.issuedAt,
      },
      qrPayload: result.qrPayload,
    };
  }),

  disable: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.disable");
    const ok = await operationalDeviceComposition.registryService.disableDevice(
      input.deviceId,
      input.restaurantId
    );
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
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
    return {
      token: {
        tokenId: token.tokenId,
        secret: token.secret,
        issuedAt: token.issuedAt,
      },
      qrPayload: operationalDeviceComposition.registryService.buildQrPayload(device, token.secret),
    };
  }),

  revokeToken: verifiedProcedure.input(deviceInput).mutation(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.management.revokeToken");
    const ok = await operationalDeviceComposition.registryService.revokeToken(
      input.deviceId,
      input.restaurantId
    );
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "No active token" });
    return { success: true as const };
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
