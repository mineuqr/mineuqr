import { TRPCError } from "@trpc/server";

/** AUTHORITY-CLEANUP-1 / AUTH-1E — restaurant-scoped admin subscription APIs retired. */
export function assertRestaurantScopedSubscriptionRetired(procedure: string): never {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      `AUTHORITY-CLEANUP-1: ${procedure} is retired. Use owner-level APIs: ` +
      `createUserSubscriptionByAdmin, updateUserSubscriptionByAdmin, deleteUserSubscriptionByAdmin.`,
  });
}
