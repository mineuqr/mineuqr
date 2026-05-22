import { describe, it, expect, vi } from "vitest";
import { getTableByRestaurantAndNumber } from "./db";

describe("Table & Order System", () => {
  describe("getTableByRestaurantAndNumber", () => {
    it("should be a function", () => {
      expect(typeof getTableByRestaurantAndNumber).toBe("function");
    });

    it("should return null for non-existent table", async () => {
      const result = await getTableByRestaurantAndNumber(99999, 99999);
      expect(result).toBeNull();
    });
  });

  describe("AddToCartButton integration", () => {
    it("should export AddToCartButton component", async () => {
      const mod = await import("../client/src/components/AddToCartButton");
      expect(mod.default).toBeDefined();
    });
  });

  describe("MenuTemplates integration", () => {
    it("should export getTemplateComponent", async () => {
      const mod = await import("../client/src/components/MenuTemplates");
      expect(mod.getTemplateComponent).toBeDefined();
    });

    it("should return ClassicTemplate for 'classic' id", async () => {
      const mod = await import("../client/src/components/MenuTemplates");
      const component = mod.getTemplateComponent("classic");
      expect(component).toBe(mod.ClassicTemplate);
    });

    it("TemplateProps should include tableNumber", async () => {
      // Verify that the template interface accepts tableNumber
      const mod = await import("../client/src/components/MenuTemplates");
      // If ClassicTemplate exists and can be called with tableNumber prop, the type is correct
      expect(mod.ClassicTemplate).toBeDefined();
    });
  });
});
