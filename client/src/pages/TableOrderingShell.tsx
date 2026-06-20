import { useRoute } from "wouter";
import { CartProvider } from "@/contexts/CartContext";
import MenuView from "@/pages/MenuView";
import CheckoutPage from "@/pages/CheckoutPage";

/** CUSTOMER-CHECKOUT-UX-1B — shared cart scope for menu ↔ checkout navigation. */
export default function TableOrderingShell() {
  const [, checkoutParams] = useRoute("/menu/:slug/table/:tableNumber/checkout");
  const [, menuParams] = useRoute("/menu/:slug/table/:tableNumber");

  const slug = checkoutParams?.slug ?? menuParams?.slug ?? "";
  const tableNumberRaw = checkoutParams?.tableNumber ?? menuParams?.tableNumber ?? "";
  const tableNumber = tableNumberRaw ? parseInt(tableNumberRaw, 10) : 0;

  if (!slug || tableNumber <= 0) return null;

  return (
    <CartProvider cartScope={{ slug, tableNumber }}>
      {checkoutParams ? <CheckoutPage /> : <MenuView />}
    </CartProvider>
  );
}
