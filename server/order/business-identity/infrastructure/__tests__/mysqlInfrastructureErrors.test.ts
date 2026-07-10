import { describe, expect, it } from "vitest";
import {
  classifyBusinessIdentityInfrastructureError,
  isRetryableBusinessIdentityInfrastructureError,
} from "../mysqlInfrastructureErrors";

describe("mysqlInfrastructureErrors", () => {
  it("classifies deadlock errno 1213", () => {
    expect(classifyBusinessIdentityInfrastructureError({ errno: 1213 })).toBe("deadlock");
    expect(isRetryableBusinessIdentityInfrastructureError({ errno: 1213 })).toBe(true);
  });

  it("classifies lock wait timeout errno 1205", () => {
    expect(classifyBusinessIdentityInfrastructureError({ errno: 1205 })).toBe(
      "lock_wait_timeout"
    );
    expect(isRetryableBusinessIdentityInfrastructureError({ errno: 1205 })).toBe(true);
  });

  it("classifies unique violation errno 1062", () => {
    expect(classifyBusinessIdentityInfrastructureError({ errno: 1062 })).toBe("unique_violation");
    expect(isRetryableBusinessIdentityInfrastructureError({ errno: 1062 })).toBe(true);
  });

  it("classifies nested cause errors", () => {
    expect(
      classifyBusinessIdentityInfrastructureError({
        cause: { errno: 1213 },
      })
    ).toBe("deadlock");
  });

  it("classifies connection errors", () => {
    expect(classifyBusinessIdentityInfrastructureError({ code: "ECONNRESET" })).toBe("connection");
    expect(isRetryableBusinessIdentityInfrastructureError({ code: "ECONNRESET" })).toBe(true);
  });

  it("does not retry business errors", () => {
    expect(classifyBusinessIdentityInfrastructureError(new Error("Order not found"))).toBe("other");
    expect(isRetryableBusinessIdentityInfrastructureError(new Error("Order not found"))).toBe(
      false
    );
  });
});
