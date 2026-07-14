/** PR-CUX-1A — session snapshot for order confirmation page (no public read API yet). */

export type OrderConfirmationSnapshot = {
  orderId: number;
  orderNumber: string;
  /** Server-resolved Business Display Identity (e.g. "T #001" / "K #001"). */
  displayReference?: string;
  trackingToken: string;
  tableNumber: number;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  status: "pending";
  currencySymbol: string;
  restaurantName: string;
  tableLabel: "tables" | "rooms";
  customerName?: string;
  customerPhone?: string;
  orderNotes?: string;
  items: Array<{
    nameAr: string;
    nameEn?: string;
    price: string;
    quantity: number;
  }>;
};

const PREFIX = "mineuqr:order-confirmation:";
const IDENTITY_PREFIX = "mineuqr:order-confirmation-identity:";

/** Minimal handoff for kiosk confirmation (token stays internal for lookup only). */
export type ConfirmationDisplayIdentity = {
  displayReference: string;
  orderNumber?: string;
};

export function saveOrderConfirmationSnapshot(snapshot: OrderConfirmationSnapshot): void {
  try {
    sessionStorage.setItem(`${PREFIX}${snapshot.trackingToken}`, JSON.stringify(snapshot));
    if (snapshot.displayReference) {
      saveConfirmationDisplayIdentity(snapshot.trackingToken, {
        displayReference: snapshot.displayReference,
        orderNumber: snapshot.orderNumber,
      });
    }
  } catch {
    /* quota / private mode — page may lack detail on refresh */
  }
}

export function loadOrderConfirmationSnapshot(
  trackingToken: string
): OrderConfirmationSnapshot | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${trackingToken}`);
    if (!raw) return null;
    return JSON.parse(raw) as OrderConfirmationSnapshot;
  } catch {
    return null;
  }
}

export function saveConfirmationDisplayIdentity(
  trackingToken: string,
  identity: ConfirmationDisplayIdentity
): void {
  try {
    sessionStorage.setItem(
      `${IDENTITY_PREFIX}${trackingToken}`,
      JSON.stringify(identity)
    );
  } catch {
    /* ignore */
  }
}

export function loadConfirmationDisplayIdentity(
  trackingToken: string
): ConfirmationDisplayIdentity | null {
  try {
    const raw = sessionStorage.getItem(`${IDENTITY_PREFIX}${trackingToken}`);
    if (!raw) return null;
    return JSON.parse(raw) as ConfirmationDisplayIdentity;
  } catch {
    return null;
  }
}
