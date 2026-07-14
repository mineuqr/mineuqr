/**
 * ORDERING-CLIENT-CHECKOUT-1 — checkout presentation / submission contracts (ADR-ARCH-018).
 */

export type CheckoutSubmissionStatus =
  | "idle"
  | "pending"
  | "success"
  | "failure";

export type CheckoutOrderSummaryLine = Readonly<{
  menuItemId: number;
  nameAr: string;
  nameEn?: string;
  price: string;
  quantity: number;
  notes?: string;
  lineTotal: number;
}>;

export type CheckoutSubmitErrorCode =
  | "NOT_READY"
  | "ORDER_NOTE_INVALID"
  | "ITEM_NOTE_INVALID"
  | "MISSING_TRACKING_TOKEN"
  | "SESSION_ENDED"
  | "SUBMIT_FAILED";

export type CheckoutSubmitError = Readonly<{
  code: CheckoutSubmitErrorCode;
  message: string;
}>;

export type CheckoutPlaceOrderResult = Readonly<{
  orderId?: number;
  orderNumber?: string;
  trackingToken: string;
  sessionToken?: string;
  tableNumber?: number;
  totalAmount?: string;
  itemCount?: number;
  createdAt?: string;
}>;

/** Snapshot of form + lines at submit time — for channel tracking side effects. */
export type CheckoutDraftSnapshot = Readonly<{
  customerName: string;
  customerPhone: string;
  orderNotes: string;
  items: ReadonlyArray<{
    menuItemId: number;
    nameAr: string;
    nameEn?: string;
    price: string;
    quantity: number;
    notes: string | null;
  }>;
  totalAmount: number;
}>;

export type CheckoutSubmitRequest = Readonly<{
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  sessionToken?: string;
  /** Dining session / post-submission / channel gates composed by shell. */
  channelAllowsSubmit: boolean;
  onSuccess?: (
    result: CheckoutPlaceOrderResult,
    draft: CheckoutDraftSnapshot
  ) => void;
}>;

export type CheckoutSubmitOutcome =
  | { ok: true; result: CheckoutPlaceOrderResult }
  | { ok: false; error: CheckoutSubmitError };
