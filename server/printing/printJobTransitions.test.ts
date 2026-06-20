import { describe, expect, it } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { canPrintJobTransition } from "./printJobTransitions";

describe("printJobTransitions THERMAL-PRINTING-3C.2", () => {
  it("allows claimed → printing → printed", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.CLAIMED, PRINT_JOB_STATUS.PRINTING)).toBe(
      true
    );
    expect(canPrintJobTransition(PRINT_JOB_STATUS.PRINTING, PRINT_JOB_STATUS.PRINTED)).toBe(
      true
    );
  });

  it("allows printing → failed", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.PRINTING, PRINT_JOB_STATUS.FAILED)).toBe(
      true
    );
  });

  it("rejects queued → printed", () => {
    expect(canPrintJobTransition(PRINT_JOB_STATUS.QUEUED, PRINT_JOB_STATUS.PRINTED)).toBe(
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
