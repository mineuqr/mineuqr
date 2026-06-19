import { describe, expect, it } from "vitest";
import { LONG_RUNNING_SESSION_THRESHOLD_MINUTES } from "./operationalConstants";

describe("operationalConstants OPS-DASHBOARD-2D.1", () => {
  it("defines long running session threshold at 120 minutes", () => {
    expect(LONG_RUNNING_SESSION_THRESHOLD_MINUTES).toBe(120);
  });
});
