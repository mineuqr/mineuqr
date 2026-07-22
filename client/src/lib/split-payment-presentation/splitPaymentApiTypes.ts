/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — API contract aliases for presentation.
 * Presentation consumes RouterOutputs only — never Domain / Projection store.
 */

import type { RouterOutputs } from "@/lib/trpc";

export type SplitPaymentApiDto =
  RouterOutputs["splitPayment"]["getByPayment"];

export type SplitPaymentApiList =
  RouterOutputs["splitPayment"]["listByCheck"];

export type SplitPaymentOutstandingApiDto =
  RouterOutputs["splitPayment"]["getOutstanding"];

export type SplitPaymentSummaryApiDto =
  RouterOutputs["splitPayment"]["getSummaryByCheck"];

export type SplitPaymentTimelineApiDto =
  RouterOutputs["splitPayment"]["getTimeline"];

export type SplitPaymentAttemptApiDto =
  RouterOutputs["splitPayment"]["getByAttempt"];

export type SplitPaymentAttemptApiList =
  RouterOutputs["splitPayment"]["getAttempts"];

export type SplitPaymentProjectionCatalogApiDto =
  RouterOutputs["splitPayment"]["getProjectionMetadata"];
