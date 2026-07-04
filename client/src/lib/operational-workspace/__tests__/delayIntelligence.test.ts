import { describe, expect, it } from "vitest";
import { explainDelay } from "../delayIntelligence";
import { computeSlaSnapshot } from "../slaEngine";

describe("delayIntelligence", () => {
  it("explains waiting for acceptance on pending orders", () => {
    const sla = computeSlaSnapshot("pending", 60, 60);
    const result = explainDelay({ status: "pending", sla, isAr: false });
    expect(result.reason).toBe("waiting-acceptance");
    expect(result.message).toContain("acceptance");
  });

  it("explains preparing SLA exceeded", () => {
    const sla = computeSlaSnapshot("preparing", 1200, 1200);
    const result = explainDelay({ status: "preparing", sla, isAr: false });
    expect(result.reason).toBe("preparing-sla-exceeded");
    expect(result.message).toContain("SLA");
  });

  it("explains ready but not served", () => {
    const sla = computeSlaSnapshot("ready", 600, 600);
    const result = explainDelay({ status: "ready", sla, isAr: false });
    expect(result.reason).toBe("ready-not-served");
  });

  it("explains printing failures", () => {
    const sla = computeSlaSnapshot("pending", 60, 60);
    const result = explainDelay({
      status: "pending",
      sla,
      printingFailed: true,
      isAr: false,
    });
    expect(result.reason).toBe("printing-failed");
  });
});
