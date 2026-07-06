import { describe, expect, it } from "vitest";
import {
  classifyKitchenQueueFailure,
  kitchenQueueOperatorMessage,
  kitchenStaleDataMessage,
} from "../kitchenQueueFailure";

describe("kitchenQueueFailure", () => {
  it("classifies database_unavailable", () => {
    expect(classifyKitchenQueueFailure(new Error("database_unavailable"))).toBe(
      "database_unavailable"
    );
  });

  it("classifies generic fetch failures", () => {
    expect(classifyKitchenQueueFailure(new Error("Internal Server Error"))).toBe("fetch_failed");
  });

  it("returns null when no error", () => {
    expect(classifyKitchenQueueFailure(null)).toBeNull();
  });

  it("provides operator-safe database message", () => {
    const message = kitchenQueueOperatorMessage("database_unavailable", "en");
    expect(message).toContain("temporarily unavailable");
    expect(message).not.toContain("database_unavailable");
  });

  it("provides stale data banner message", () => {
    expect(kitchenStaleDataMessage("en")).toContain("last known data");
  });
});
