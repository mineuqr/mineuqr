import { describe, expect, it } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { canPrintJobTransition } from "./printJobTransitions";

describe("printJobTransitions THERMAL-PRINTING-13I.3C.1", () => {
  it("allows agent-runtime lifecycle queued → assigned → printing → printed", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.QUEUED, PRINT_JOB_STATUS.ASSIGNED)).toBe(
      true
    );
    expect(canPrintJobTransition(PRINT_JOB_STATUS.ASSIGNED, PRINT_JOB_STATUS.PRINTING)).toBe(
      true
    );
    expect(canPrintJobTransition(PRINT_JOB_STATUS.PRINTING, PRINT_JOB_STATUS.PRINTED)).toBe(
      true
    );
  });

  it("allows legacy worker lifecycle queued → claimed → printing", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.QUEUED, PRINT_JOB_STATUS.CLAIMED)).toBe(
      true
    );
    expect(canPrintJobTransition(PRINT_JOB_STATUS.CLAIMED, PRINT_JOB_STATUS.PRINTING)).toBe(
      true
    );
  });

  it("allows printing → failed", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.PRINTING, PRINT_JOB_STATUS.FAILED)).toBe(
      true
    );
  });

  it("rejects queued → printed (skipped transitions)", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.QUEUED, PRINT_JOB_STATUS.PRINTED)).toBe(
      false
    );
  });

  it("rejects assigned → printed (skipped printing)", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.ASSIGNED, PRINT_JOB_STATUS.PRINTED)).toBe(
      false
    );
  });

  it("rejects failed → printing", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.FAILED, PRINT_JOB_STATUS.PRINTING)).toBe(
      false
    );
  });

  it("rejects printed → printing", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.PRINTED, PRINT_JOB_STATUS.PRINTING)).toBe(
      false
    );
  });
});
