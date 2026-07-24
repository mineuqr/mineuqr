/**
 * REGISTER-OPERATIONS-UI-1 — typed surfaces over crmp.register.* only.
 */

import type { RouterOutputs } from "@/lib/trpc";

export type RegisterDto = RouterOutputs["crmp"]["register"]["get"];
export type RegisterCommandResultDto =
  RouterOutputs["crmp"]["register"]["open"];
export type CurrentRegisterViewDto =
  RouterOutputs["crmp"]["register"]["getCurrent"];
export type FinancialShiftRefDto = NonNullable<
  RouterOutputs["crmp"]["register"]["getCurrentFinancialShift"]
>;
export type RegisterHistoryDto = RouterOutputs["crmp"]["register"]["getHistory"];
