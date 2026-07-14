/**
 * ORDERING-CLIENT-CART-1 — cart line model (presentation/client orchestration only).
 */
export type OrderingCartItem = {
  menuItemId: number;
  nameAr: string;
  nameEn?: string;
  price: string;
  quantity: number;
  notes?: string;
  imageUrl?: string;
};

/** @deprecated Prefer OrderingCartItem — retained for existing import sites. */
export type CartItem = OrderingCartItem;
