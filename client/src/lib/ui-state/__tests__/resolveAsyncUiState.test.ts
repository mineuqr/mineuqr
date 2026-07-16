import { describe, expect, it } from "vitest";
import { resolveAsyncUiState } from "../resolveAsyncUiState";

describe("resolveAsyncUiState lifecycle order", () => {
  it("returns loading while auth is pending", () => {
    expect(
      resolveAsyncUiState({
        authPending: true,
        isAuthenticated: false,
        queryPending: false,
        isError: true,
        error: new Error("ignored while auth pending"),
        isEmpty: true,
        isSuccess: false,
      })
    ).toBe("loading");
  });

  it("returns unauthorized before empty when logged out", () => {
    expect(
      resolveAsyncUiState({
        authPending: false,
        isAuthenticated: false,
        queryPending: false,
        isError: false,
        error: null,
        isEmpty: true,
        isSuccess: true,
      })
    ).toBe("unauthorized");
  });

  it("returns error before empty when query fails", () => {
    expect(
      resolveAsyncUiState({
        authPending: false,
        isAuthenticated: true,
        queryPending: false,
        isError: true,
        error: new Error("Failed query: Unknown column"),
        isEmpty: true,
        isSuccess: false,
      })
    ).toBe("error");
  });

  it("never treats missing data as empty while pending", () => {
    expect(
      resolveAsyncUiState({
        authPending: false,
        isAuthenticated: true,
        queryPending: true,
        isError: false,
        error: null,
        isEmpty: false,
        isSuccess: false,
      })
    ).toBe("loading");
  });

  it("returns empty only after successful settlement", () => {
    expect(
      resolveAsyncUiState({
        authPending: false,
        isAuthenticated: true,
        queryPending: false,
        isError: false,
        error: null,
        isEmpty: true,
        isSuccess: true,
      })
    ).toBe("empty");
  });

  it("returns success when data is present", () => {
    expect(
      resolveAsyncUiState({
        authPending: false,
        isAuthenticated: true,
        queryPending: false,
        isError: false,
        error: null,
        isEmpty: false,
        isSuccess: true,
      })
    ).toBe("success");
  });
});
