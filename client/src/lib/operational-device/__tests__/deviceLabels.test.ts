import { describe, expect, it } from "vitest";
import { formatDeviceAuthHeader } from "../deviceLabels";

describe("deviceLabels", () => {
  it("formats device authorization header", () => {
    expect(
      formatDeviceAuthHeader({
        deviceId: "dev_abc",
        tokenId: "tok_xyz",
        secret: "secret-value",
      })
    ).toBe("Device dev_abc:tok_xyz:secret-value");
  });
});
