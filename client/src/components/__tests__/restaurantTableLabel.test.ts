import { describe, expect, it } from "vitest";
import { restaurantTableLabel } from "../CartDrawer";

describe("restaurantTableLabel", () => {
  it("narrows restaurant tableLabel to CartDrawer catalog values", () => {
    expect(restaurantTableLabel("rooms")).toBe("rooms");
    expect(restaurantTableLabel("tables")).toBe("tables");
    expect(restaurantTableLabel("unexpected")).toBe("tables");
    expect(restaurantTableLabel(null)).toBe("tables");
  });
});
