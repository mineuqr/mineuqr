/**
 * PRINTING-RENDERING-1B — rendering policies (independent from renderer).
 *
 * Policies control optional content visibility. The renderer never infers business rules.
 */
import { TICKET_DOCUMENT_KIND, type TicketDocument, type TicketDocumentKind } from "../ticketTypes";

export const TICKET_RENDERING_POLICY_ID = {
  KITCHEN: "kitchen",
  CUSTOMER_RECEIPT: "customer-receipt",
  PACKING: "packing",
  DIAGNOSTIC: "diagnostic",
} as const;

export type TicketRenderingPolicyId =
  (typeof TICKET_RENDERING_POLICY_ID)[keyof typeof TICKET_RENDERING_POLICY_ID];

export type TicketRenderingPolicy = {
  id: TicketRenderingPolicyId;
  showPrices: boolean;
  showTotals: boolean;
  showStation: boolean;
  showServiceType: boolean;
  showTable: boolean;
  showSession: boolean;
  showTime: boolean;
  /** When false, order number appears only in identity (not duplicated in metadata). */
  showOrderNumberMetadata: boolean;
  wrapItemNames: boolean;
  identityUsesOrderPrefix: boolean;
};

export const KITCHEN_RENDERING_POLICY: TicketRenderingPolicy = {
  id: TICKET_RENDERING_POLICY_ID.KITCHEN,
  showPrices: false,
  showTotals: false,
  showStation: false,
  showServiceType: false,
  showTable: true,
  showSession: true,
  showTime: true,
  showOrderNumberMetadata: false,
  wrapItemNames: true,
  identityUsesOrderPrefix: true,
};

export const CUSTOMER_RECEIPT_RENDERING_POLICY: TicketRenderingPolicy = {
  id: TICKET_RENDERING_POLICY_ID.CUSTOMER_RECEIPT,
  showPrices: true,
  showTotals: true,
  showStation: false,
  showServiceType: true,
  showTable: true,
  showSession: true,
  showTime: true,
  showOrderNumberMetadata: false,
  wrapItemNames: true,
  identityUsesOrderPrefix: true,
};

export const PACKING_RENDERING_POLICY: TicketRenderingPolicy = {
  id: TICKET_RENDERING_POLICY_ID.PACKING,
  showPrices: false,
  showTotals: false,
  showStation: false,
  showServiceType: false,
  showTable: true,
  showSession: false,
  showTime: true,
  showOrderNumberMetadata: false,
  wrapItemNames: true,
  identityUsesOrderPrefix: true,
};

export const DIAGNOSTIC_RENDERING_POLICY: TicketRenderingPolicy = {
  id: TICKET_RENDERING_POLICY_ID.DIAGNOSTIC,
  showPrices: false,
  showTotals: false,
  showStation: false,
  showServiceType: false,
  showTable: false,
  showSession: false,
  showTime: false,
  showOrderNumberMetadata: true,
  wrapItemNames: false,
  identityUsesOrderPrefix: false,
};

const POLICY_BY_ID: Record<TicketRenderingPolicyId, TicketRenderingPolicy> = {
  [TICKET_RENDERING_POLICY_ID.KITCHEN]: KITCHEN_RENDERING_POLICY,
  [TICKET_RENDERING_POLICY_ID.CUSTOMER_RECEIPT]: CUSTOMER_RECEIPT_RENDERING_POLICY,
  [TICKET_RENDERING_POLICY_ID.PACKING]: PACKING_RENDERING_POLICY,
  [TICKET_RENDERING_POLICY_ID.DIAGNOSTIC]: DIAGNOSTIC_RENDERING_POLICY,
};

const POLICY_BY_DOCUMENT_KIND: Record<TicketDocumentKind, TicketRenderingPolicyId> = {
  [TICKET_DOCUMENT_KIND.KITCHEN_ORDER]: TICKET_RENDERING_POLICY_ID.KITCHEN,
  [TICKET_DOCUMENT_KIND.DIAGNOSTIC]: TICKET_RENDERING_POLICY_ID.DIAGNOSTIC,
  [TICKET_DOCUMENT_KIND.CUSTOMER_RECEIPT]: TICKET_RENDERING_POLICY_ID.CUSTOMER_RECEIPT,
};

export function resolveTicketRenderingPolicy(input: {
  document: TicketDocument;
  policyId?: TicketRenderingPolicyId;
}): TicketRenderingPolicy {
  if (input.policyId) {
    return POLICY_BY_ID[input.policyId];
  }
  const resolvedId = POLICY_BY_DOCUMENT_KIND[input.document.kind] ?? TICKET_RENDERING_POLICY_ID.KITCHEN;
  return POLICY_BY_ID[resolvedId];
}
