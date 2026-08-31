/**
 * SALE-CUSTOMER-LINK-1 — resolveOptionalSaleCustomerId behavior (mocked repo).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../customerRepository", () => ({
  findCustomerById: vi.fn(),
}));

import { findCustomerById } from "../customerRepository";
import { resolveOptionalSaleCustomerId } from "../saleCustomerLink";

const findMock = vi.mocked(findCustomerById);

describe("resolveOptionalSaleCustomerId", () => {
  beforeEach(() => {
    findMock.mockReset();
  });

  it("A: null customerId resolves to null", async () => {
    await expect(resolveOptionalSaleCustomerId(1, null)).resolves.toBe(null);
    await expect(resolveOptionalSaleCustomerId(1, undefined)).resolves.toBe(
      null
    );
    expect(findMock).not.toHaveBeenCalled();
  });

  it("B: same-restaurant customer is allowed", async () => {
    findMock.mockResolvedValue({
      id: 9,
      restaurantId: 1,
      displayName: "خالد",
      customerType: "individual",
      phone: null,
      email: null,
      address: null,
      taxNumber: null,
      status: "active",
      createdAt: "",
      updatedAt: "",
    });
    await expect(resolveOptionalSaleCustomerId(1, 9)).resolves.toBe(9);
  });

  it("G: cross-restaurant / missing customer is rejected", async () => {
    findMock.mockResolvedValue(null);
    await expect(resolveOptionalSaleCustomerId(1, 99)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("H: taxNumber null does not affect assignment", async () => {
    findMock.mockResolvedValue({
      id: 3,
      restaurantId: 1,
      displayName: "سارة",
      customerType: "individual",
      phone: null,
      email: null,
      address: null,
      taxNumber: null,
      status: "active",
      createdAt: "",
      updatedAt: "",
    });
    await expect(resolveOptionalSaleCustomerId(1, 3)).resolves.toBe(3);
  });
});
