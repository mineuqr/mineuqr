import { describe, expect, it } from "vitest";
import { buildReadyPushCopy, buildReadyPushUrl } from "./copy";

describe("customerPush copy", () => {
  it("builds Arabic-first READY copy", () => {
    const copy = buildReadyPushCopy("ORD-0042", "ar");
    expect(copy.title).toBe("طلبك جاهز");
    expect(copy.body).toBe("ORD-0042");
    expect(copy.language).toBe("ar");
  });

  it("builds tracking URL", () => {
    expect(buildReadyPushUrl("cafe", "tok123")).toBe("/menu/cafe/order/tok123");
  });
});
