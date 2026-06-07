import { router, verifiedProcedure } from "../_core/trpc";
import { getCommercialEntitlements } from "./getCommercialEntitlements";

/**
 * Read-only commercial observation procedures (PG-1C.2E).
 * Does not replace legacy feature gates, billing, or authorization.
 */
export const commercialRouter = router({
  /** Diagnostic: canonical CommercialContext + resolver entitlements for the authenticated owner. */
  getEntitlements: verifiedProcedure.query(async ({ ctx }) => {
    return getCommercialEntitlements(ctx.user.id);
  }),
});
