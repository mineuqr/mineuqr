/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — API contract aliases for presentation.
 * Presentation consumes RouterOutputs only — never Domain / Projection store.
 */

import type { RouterOutputs } from "@/lib/trpc";

export type OrderSettlementApiDto =
  RouterOutputs["orderSettlement"]["getByOrder"];

export type OrderSettlementApiList =
  RouterOutputs["orderSettlement"]["listByCheck"];

export type OrderSettlementSummaryApiDto =
  RouterOutputs["orderSettlement"]["getSummaryByCheck"];

export type OrderSettlementProjectionCatalogApiDto =
  RouterOutputs["orderSettlement"]["getProjectionMetadata"];
