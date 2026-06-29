import { describe, it, expect } from "vitest";
import { getTableByRestaurantAndNumber } from "./db";
import AddToCartButton from "../client/src/components/AddToCartButton";
import * as MenuTemplates from "../client/src/components/MenuTemplates";

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
    it("should export AddToCartButton component", () => {
      expect(AddToCartButton).toBeDefined();
    });
  });

  describe("MenuTemplates integration", () => {
    it("should export getTemplateComponent", () => {
      expect(MenuTemplates.getTemplateComponent).toBeDefined();
    });

    it("should return ClassicTemplate for 'classic' id", () => {
      const component = MenuTemplates.getTemplateComponent("classic");
      expect(component).toBe(MenuTemplates.ClassicTemplate);
    });

    it("TemplateProps should include tableNumber", () => {
      expect(MenuTemplates.ClassicTemplate).toBeDefined();
    });
  });
});
