/**
 * PRINTING-RENDERING-1B — platform-neutral ticket layout plan.
 */
import type { ReceiptLayoutProfile } from "../../receipts/layoutProfiles";
import type { TextDirection } from "../../receipts/receiptLocale";
import type { TicketDocument } from "../ticketTypes";
import type { TextAlignment, TextTypography } from "./typography";
import type { TicketRenderingPolicy } from "./renderingPolicy";

export type TicketLayoutLine = {
  text: string;
  alignment: TextAlignment;
  textDirection: TextDirection;
  typography: TextTypography;
  isSeparator?: boolean;
  indentColumns?: number;
};

export type TicketLayoutPlan = {
  document: TicketDocument;
  profile: ReceiptLayoutProfile;
  policy: TicketRenderingPolicy;
  lines: TicketLayoutLine[];
  feedLines: number;
  cut: boolean;
};
