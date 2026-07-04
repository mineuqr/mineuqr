import { describe, expect, it } from "vitest";
import {
  computeSlaSnapshot,
  SLA_CRITICAL_SECONDS,
  SLA_TARGET_PENDING_SECONDS,
  targetSecondsForStatus,
} from "../slaEngine";

describe("slaEngine", () => {
  it("uses certified targets per status", () => {
    expect(targetSecondsForStatus("pending")).toBe(SLA_TARGET_PENDING_SECONDS);
    expect(targetSecondsForStatus("preparing")).toBe(900);
    expect(targetSecondsForStatus("ready")).toBe(300);
  });

  it("marks late when column elapsed exceeds target", () => {
    const sla = computeSlaSnapshot("pending", SLA_TARGET_PENDING_SECONDS + 60, 400);
    expect(sla.status).toBe("late");
    expect(sla.lateSeconds).toBe(60);
  });

  it("marks critical at certified threshold", () => {
    const sla = computeSlaSnapshot("preparing", SLA_CRITICAL_SECONDS, SLA_CRITICAL_SECONDS);
    expect(sla.status).toBe("critical");
    expect(sla.urgencyTier).toBe("critical");
  });

  it("reports on-time within target", () => {
    const sla = computeSlaSnapshot("ready", 120, 500);
    expect(sla.status).toBe("on-time");
    expect(sla.lateSeconds).toBe(0);
  });
});
