import { describe, expect, it } from "vitest";
import {
  canCancelPrintJob,
  canMarkPrinted,
  canRetryPrint,
  derivePrintJobTimeline,
  hasActivePrintJob,
  formatPrintOrderCommandError,
  operatorPrintErrorMessage,
  printJobLiveStatusLabel,
  printJobStatusLabel,
  selectPrimaryPrintJob,
} from "../printJobViewModels";

const sampleJob = {
  id: 1,
  status: "printing",
  source: "operator",
  attemptCount: 1,
  lastError: null,
  printerName: "Kitchen",
  createdAt: "2026-06-30T10:00:00.000Z",
  dispatchedAt: "2026-06-30T10:00:01.000Z",
  printingAt: "2026-06-30T10:00:02.000Z",
  completedAt: null,
  attempts: [],
};

describe("print job view models", () => {
  it("selects the active job when one exists", () => {
    const jobs = [
      { ...sampleJob, id: 1, status: "printed", createdAt: "2026-06-30T11:00:00.000Z" },
      { ...sampleJob, id: 2, status: "printing", createdAt: "2026-06-30T12:00:00.000Z" },
    ];
    expect(selectPrimaryPrintJob(jobs)?.id).toBe(2);
    expect(hasActivePrintJob(jobs)).toBe(true);
  });

  it("labels live printing status for operators", () => {
    expect(printJobLiveStatusLabel({ ...sampleJob, status: "dispatched" }, "en")).toContain(
      "Sending to printer"
    );
    expect(printJobStatusLabel("printed", "en")).toBe("Printed");
  });

  it("sanitizes technical error messages", () => {
    expect(operatorPrintErrorMessage("Gateway executionId missing", "en")).toContain(
      "MineuQR Connector"
    );
    expect(operatorPrintErrorMessage("paper out", "en")).toContain("Paper");
    expect(formatPrintOrderCommandError(new Error("paper out"), "en")).toContain("Paper");
    expect(formatPrintOrderCommandError("offline", "en")).not.toMatch(
      /cancel|accept|settlement/i
    );
  });

  it("derives timeline for failed jobs", () => {
    const steps = derivePrintJobTimeline({ ...sampleJob, status: "failed" }, "en");
    expect(steps.at(-1)?.state).toBe("failed");
  });

  it("exposes operator actions by job state", () => {
    expect(canCancelPrintJob({ ...sampleJob, status: "printing" })).toBe(true);
    expect(canMarkPrinted({ ...sampleJob, status: "printing" })).toBe(true);
    expect(canRetryPrint({ ...sampleJob, status: "failed" })).toBe(true);
    expect(canCancelPrintJob({ ...sampleJob, status: "printed" })).toBe(false);
  });
});
