/** PR-CUX-1A — session snapshot for order confirmation page (no public read API yet). */

export type OrderConfirmationSnapshot = {
  orderId: number;
  orderNumber: string;
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

export function saveOrderConfirmationSnapshot(snapshot: OrderConfirmationSnapshot): void {
  try {
    sessionStorage.setItem(`${PREFIX}${snapshot.trackingToken}`, JSON.stringify(snapshot));
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
