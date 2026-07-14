/**
 * ORDERING-CLIENT-CART-1 — compatibility façade.
 * Prefer `@/lib/ordering-client` (`useOrderingCart` / `OrderingCartProvider`).
 */
export type { CartItem, OrderingCartItem } from "@/lib/ordering-client/cart/cartTypes";
export {
  OrderingCartProvider as CartProvider,
  useOrderingCart as useCart,
} from "@/lib/ordering-client/cart/OrderingCartProvider";
