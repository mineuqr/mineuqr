import { OrderTrackingExpired } from "@/components/customer/OrderTrackingExpired";
import { getOrderTrackingExpiredLines } from "@/lib/orderTrackingExpiredCopy";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

describe("OrderTrackingExpired TRACKING-EXPIRY-1", () => {
  it("renders Arabic expired copy", () => {
    const html = renderToStaticMarkup(<OrderTrackingExpired language="ar" />);
    for (const line of getOrderTrackingExpiredLines("ar")) {
      expect(html).toContain(line);
    }
    expect(html).not.toContain("Order Number");
  });
});
