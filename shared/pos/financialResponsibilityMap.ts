/**
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1
 * Responsibility owners. Not a second ledger. Check/ST/OS/SR stay supporting.
 */
export const FINANCIAL_RESPONSIBILITY_MAP = {
  whatWasSold: "Order items / Invoice Intent preparation / CF composition",
  whatWasPaid: "Collection Fact.amount (0 = complimentary collected)",
  whenPaid: "Collection Fact.committedAt",
  cashier: "Collection Fact.actorId + Confirm terminal",
  register: "CRMP Settlement Context (attribution, not SSOT)",
  financialShift: "CRMP Settlement Context (attribution, not SSOT)",
  operator: "Collection Fact.actorId",
  channel: "Collection Fact.orderingChannel (Order stamp)",
  order: "Collection Fact.orderId",
  session: "Order.sessionId (operational grouping)",
  tender: "Collection Fact.tenders (cash|card|other); complimentary uses other/0.00",
  amount: "Collection Fact.amount",
  discount: "Collection Fact.discountAmount (waived value when complimentary)",
  vat: "Collection Fact.taxAmount + taxBreakdown",
  complimentary: "isComplimentaryCollectionFact(CF)",
  refunded:
    "Original Cashier sale identity is Collection Fact; refund documents remain Check-owned compensating SR",
  financialStatus: "production CF present = PAID; absent = not financially finalized",
} as const;

export const ATTRIBUTION_RESPONSIBILITY_MAP = {
  restaurant: "Collection Fact.restaurantId / Order.restaurantId",
  register: "CRMP / Register Ops projection; SR may copy after F&F",
  financialShift: "CRMP / Register Ops projection; SR may copy after F&F",
  cashierOperator: "Collection Fact.actorType + actorId",
  order: "Collection Fact.orderId",
  session: "Order.sessionId",
  channel: "Collection Fact.orderingChannel",
  waiterTable: "Session / Order tableNumber (operational)",
  srRole: "Supporting attribution/document after Cashier F&F; not financial SSOT",
  cfRole: "Financial root + actor/terminal/businessDay snapshot",
} as const;

export const REFUND_RESPONSIBILITY_MAP = {
  currentFinancialIdentity:
    "CF-backed: production Collection Fact (collectionFactId / paymentIntentId / orderId). Legacy: checkId + prior Settlement Record",
  currentEngine: "applyRefundOnCheck (Check-owned persist; original amount from CF when production CF exists)",
  targetFinancialIdentity:
    "original Collection Fact (collectionFactId / paymentIntentId / orderId)",
  remainingLegacy:
    "Refund persistence, chain, and RF- documents remain Check/SR; non-CF sales keep the SR original-amount path",
} as const;

export const CHECK_ST_OS_SR_CLASSIFICATION = {
  check: {
    financial: false,
    target: "bill/document + post-Cashier compatibility",
    independentSettlement: false,
  },
  st: {
    financial: false,
    target: "tender document / compatibility",
  },
  os: {
    financial: false,
    target: "order settlement operational publication",
  },
  sr: {
    financial: false,
    target: "attribution/reporting projection + refund compensating document",
  },
} as const;

export function refundAnchorFromCollectionFact(fact: {
  collectionFactId: string;
  orderId: number;
  paymentIntentId: string;
}): {
  collectionFactId: string;
  orderId: number;
  paymentIntentId: string;
} {
  return {
    collectionFactId: fact.collectionFactId,
    orderId: fact.orderId,
    paymentIntentId: fact.paymentIntentId,
  };
}
