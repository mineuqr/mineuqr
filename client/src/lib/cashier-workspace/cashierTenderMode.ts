/**
 * CASHIER-PAYMENT-FLOW-UX-CORRECTION-1
 * Cashier collection modes. Persist still uses SELECTABLE_PAYMENT_METHODS
 * (cash | card). Network maps to canonical card. Mixed is cash + card.
 */

export const CASHIER_TENDER_MODES = ["cash", "network", "mixed"] as const;

export type CashierTenderMode = (typeof CASHIER_TENDER_MODES)[number];
