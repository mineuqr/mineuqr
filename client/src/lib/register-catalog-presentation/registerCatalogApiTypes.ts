/**
 * REGISTER-CATALOG-MANAGEMENT-1 — typed surfaces over crmp.catalog.* only.
 */

import type { RouterOutputs } from "@/lib/trpc";

export type CatalogRegisterDto = RouterOutputs["crmp"]["catalog"]["get"];
export type CatalogCommandResultDto =
  RouterOutputs["crmp"]["catalog"]["create"];
export type CatalogRegisterListDto =
  RouterOutputs["crmp"]["catalog"]["list"];
