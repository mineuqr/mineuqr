import { describe, expect, it } from "vitest";
import { settlementSourceChannelFromOrderingChannel } from "../settlementSourceChannel";

describe("settlementSourceChannelFromOrderingChannel", () => {
  it("maps live Place channels to Settlement source categories", () => {
    expect(settlementSourceChannelFromOrderingChannel("cashier_pos")).toBe(
      "counter"
    );
    expect(settlementSourceChannelFromOrderingChannel("qr")).toBe("table_order");
    expect(settlementSourceChannelFromOrderingChannel("table_session")).toBe(
      "table_order"
    );
    expect(settlementSourceChannelFromOrderingChannel("waiter_tablet")).toBe(
      "waiter_order"
    );
    expect(settlementSourceChannelFromOrderingChannel("kiosk")).toBe(
      "self_order"
    );
  });

  it("does not invent a channel from empty or unknown stamps", () => {
    expect(settlementSourceChannelFromOrderingChannel(null)).toBeNull();
    expect(settlementSourceChannelFromOrderingChannel("")).toBeNull();
    expect(settlementSourceChannelFromOrderingChannel("marketplace")).toBeNull();
  });
});
