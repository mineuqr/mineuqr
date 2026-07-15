/**
 * ORDERING-CLIENT-CHECKOUT-1 / KIOSK-IDENTITY-ADOPTION-1 —
 * checkout presentation / submission contracts (ADR-ARCH-018).
 *
 * Submission is either table dual-compat (QR) or identity-driven (station/…).
 * Channel-agnostic — no channel names in this contract.
 */

import type {
  OrderingFulfilmentAnchor,
  OrderingServiceMode,
} from "@shared/ordering-platform/orderingIdentityContract";

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
  /** Server-resolved Business Display Identity (e.g. "T #001" / "K #001"). */
  displayReference?: string;
  sessionToken?: string;
  tableNumber?: number;
  fulfilmentLabel?: string;
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

/**
 * Identity facts for identity place paths — platform vocabulary only.
 * placeAuth:
 *   public → order.placeWithIdentity
 *   staff → order.placeAsWaiter (dashboard)
 *   device → operationalDevice.runtime.placeWaiterOrder (hosted screen)
 */
export type CheckoutIdentitySubmit = Readonly<{
  serviceMode: OrderingServiceMode;
  fulfilmentAnchor: OrderingFulfilmentAnchor;
  /** Place auth path. Default: public. */
  placeAuth?: "public" | "staff" | "device";
}>;

type CheckoutSubmitBase = Readonly<{
  restaurantId: number;
  sessionToken?: string;
  /** Dining session / post-submission / channel gates composed by shell. */
  channelAllowsSubmit: boolean;
  onSuccess?: (
    result: CheckoutPlaceOrderResult,
    draft: CheckoutDraftSnapshot
  ) => void;
}>;

/** QR / table dual-compat path → order.create */
export type CheckoutTableSubmitRequest = CheckoutSubmitBase &
  Readonly<{
    tableId: number;
    tableNumber: number;
    identity?: undefined;
  }>;

/** Identity-driven path → order.placeWithIdentity */
export type CheckoutIdentitySubmitRequest = CheckoutSubmitBase &
  Readonly<{
    identity: CheckoutIdentitySubmit;
    tableId?: undefined;
    tableNumber?: undefined;
  }>;

export type CheckoutSubmitRequest =
  | CheckoutTableSubmitRequest
  | CheckoutIdentitySubmitRequest;

export type CheckoutSubmitOutcome =
  | { ok: true; result: CheckoutPlaceOrderResult }
  | { ok: false; error: CheckoutSubmitError };

export function isCheckoutIdentitySubmit(
  request: CheckoutSubmitRequest
): request is CheckoutIdentitySubmitRequest {
  return request.identity != null;
}
