import { useRoute } from "wouter";
import MenuView from "@/pages/MenuView";
import CheckoutPage from "@/pages/CheckoutPage";
import { QrOrderingClientHost } from "@/lib/ordering-client";

/**
 * ORDERING-CLIENT-RUNTIME-1 — QR table shell.
 * Owns QR bootstrap (slug/table from route) only; hosts Ordering Client Platform.
 */
export default function TableOrderingShell() {
  const [, checkoutParams] = useRoute("/menu/:slug/table/:tableNumber/checkout");
  const [, menuParams] = useRoute("/menu/:slug/table/:tableNumber");

  const slug = checkoutParams?.slug ?? menuParams?.slug ?? "";
  const tableNumberRaw = checkoutParams?.tableNumber ?? menuParams?.tableNumber ?? "";
  const tableNumber = tableNumberRaw ? parseInt(tableNumberRaw, 10) : 0;

  if (!slug || tableNumber <= 0) return null;

  return (
    <QrOrderingClientHost
      slug={slug}
      tableNumber={tableNumber}
      isCheckout={Boolean(checkoutParams)}
    >
      {checkoutParams ? <CheckoutPage /> : <MenuView />}
    </QrOrderingClientHost>
  );
}
