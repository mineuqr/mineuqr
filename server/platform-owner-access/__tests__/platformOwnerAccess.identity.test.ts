/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — owner identity.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { ENV } from "../../_core/env";
import type { TrpcContext } from "../../_core/context";
import { assertPlatformOwner, isPlatformOwner } from "../identity";

const OWNER_OPEN_ID = "j4Ztx2Wi3et3TD5zYNG5fy";
const previous = ENV.ownerOpenId;

describe("isPlatformOwner", () => {
  beforeEach(() => {
    ENV.ownerOpenId = OWNER_OPEN_ID;
  });

  afterEach(() => {
    ENV.ownerOpenId = previous;
  });

  it("matches ENV.ownerOpenId only", () => {
    expect(isPlatformOwner({ openId: OWNER_OPEN_ID })).toBe(true);
    expect(isPlatformOwner({ openId: "someone-else" })).toBe(false);
  });

  it("fails closed when OWNER_OPEN_ID is missing", () => {
    ENV.ownerOpenId = "";
    expect(isPlatformOwner({ openId: OWNER_OPEN_ID })).toBe(false);
    expect(isPlatformOwner({ openId: "" })).toBe(false);
  });

  it("does not grant from userId or admin role", () => {
    expect(isPlatformOwner({ openId: "admin-not-owner" })).toBe(false);
  });

  it("assertPlatformOwner rejects unauthenticated and non-owner", () => {
    expect(() =>
      assertPlatformOwner({ user: null } as TrpcContext, "ownerAccess.setMode")
    ).toThrow(TRPCError);
    expect(() =>
      assertPlatformOwner(
        { user: { openId: "customer", id: 9, role: "admin" } } as TrpcContext,
        "ownerAccess.setMode"
      )
    ).toThrow(TRPCError);
  });

  it("assertPlatformOwner allows the configured owner", () => {
    expect(() =>
      assertPlatformOwner(
        { user: { openId: OWNER_OPEN_ID, id: 1, role: "admin" } } as TrpcContext,
        "ownerAccess.getMode"
      )
    ).not.toThrow();
  });
});
