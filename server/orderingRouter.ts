import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import {
  getQrOrderingRuntimeBySlug,
  QrOrderingRuntimeLoadError,
} from "./ordering-platform/getQrOrderingRuntime";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — additive Ordering Platform runtime router.
 * Non-breaking: new namespace; existing procedures unchanged.
 */
export const orderingRouter = router({
  /**
   * Public QR runtime snapshot for a restaurant slug.
   * Returns immutable OrderingRuntimeContext + display-only restaurant presentation.
   */
  getRuntimeBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await getQrOrderingRuntimeBySlug(input.slug);
      } catch (error) {
        if (error instanceof QrOrderingRuntimeLoadError && error.code === "RESTAURANT_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
        }
        throw error;
      }
    }),
});
