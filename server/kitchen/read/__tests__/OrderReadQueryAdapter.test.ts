import { describe, expect, it, vi, beforeEach } from "vitest";
import { KITCHEN_READ_DATABASE_UNAVAILABLE } from "../domain/kitchenReadErrorCodes";

vi.mock("../../../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../../db";
import { DrizzleOrderReadQueryAdapter } from "../infrastructure/OrderReadQueryAdapter";

describe("OrderReadQueryAdapter database availability", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("throws database_unavailable instead of returning empty pipeline", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const adapter = new DrizzleOrderReadQueryAdapter();

    await expect(adapter.listPipelineOrders(1)).rejects.toThrow(KITCHEN_READ_DATABASE_UNAVAILABLE);
  });
});
