import { describe, expect, it } from "vitest";
import { patchListActive, patchOrderDetail } from "../orderStatusActionCache";

describe("patchListActive", () => {
  const list = {
    items: [
      { orderId: 8, status: "pending" },
      { orderId: 9, status: "preparing" },
    ],
  } as Parameters<typeof patchListActive>[0];

  it("removes a served order from the active list", () => {
    const next = patchListActive(list, 8, "served");
    expect(next?.items.map((item) => item.orderId)).toEqual([9]);
  });

  it("patches a non-terminal status in place", () => {
    const next = patchListActive(list, 9, "ready");
    expect(next?.items.find((item) => item.orderId === 9)?.status).toBe("ready");
    expect(next?.items).toHaveLength(2);
  });

  it("patches getDetail status so served is not still actionable", () => {
    const detail = {
      order: { orderId: 8, status: "pending" },
    } as Parameters<typeof patchOrderDetail>[0];
    const next = patchOrderDetail(detail, "served");
    expect(next?.order.status).toBe("served");
  });
});
