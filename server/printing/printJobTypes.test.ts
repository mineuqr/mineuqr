import { describe, expect, it } from "vitest";
import {
  computePrintJobLeaseExpiresAt,
  PRINT_JOB_CLAIM_LEASE_MS,
} from "./printJobTypes";

describe("printJobTypes lease THERMAL-PRINTING-3C.1", () => {
  it("uses a five-minute lease duration", () => {
    expect(PRINT_JOB_CLAIM_LEASE_MS).toBe(5 * 60 * 1000);
  });

  it("computes lease expiry five minutes ahead", () => {
    const now = new Date("2026-06-20T10:00:00.000Z");
    expect(computePrintJobLeaseExpiresAt(now)).toBe("2026-06-20 10:05:00");
  });
});
