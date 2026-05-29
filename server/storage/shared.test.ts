import { describe, expect, it } from "vitest";
import { buildPublicUrl, normalizeKey } from "./shared";

describe("storage/shared", () => {
  it("normalizeKey strips leading slashes", () => {
    expect(normalizeKey("/logos/1/a.jpg")).toBe("logos/1/a.jpg");
  });

  it("buildPublicUrl encodes path segments", () => {
    expect(buildPublicUrl("https://assets.mineuqr.com", "logos/1/a b.jpg")).toBe(
      "https://assets.mineuqr.com/logos/1/a%20b.jpg"
    );
  });
});
