import { describe, expect, it } from "vitest";
import { hashPushEndpoint } from "./endpointHash";

describe("customerPush endpointHash", () => {
  it("returns stable sha256 hex", () => {
    const a = hashPushEndpoint("https://push.example/abc");
    const b = hashPushEndpoint("https://push.example/abc");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
