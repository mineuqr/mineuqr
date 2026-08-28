import { describe, expect, it } from "vitest";
import { retainOrderCreateSubmissionId } from "../checkout/checkoutSubmission";

describe("Table/QR order.create submissionId lifecycle", () => {
  it("reuses the in-flight submissionId for retries and double submit", () => {
    const first = retainOrderCreateSubmissionId(null);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(retainOrderCreateSubmissionId(first)).toBe(first);
  });
});
