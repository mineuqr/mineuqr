import { describe, expect, it, vi, beforeEach } from "vitest";
import { isPlatformAccountOpenId as matchOpenId } from "@shared/platformAccount";

const { PLATFORM_OPEN_ID } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "owner_open_id_test",
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: PLATFORM_OPEN_ID },
}));

vi.mock("./db", () => ({
  getUserById: vi.fn(),
}));

import { getUserById } from "./db";
import {
  getPlatformOwnerOpenId,
  isPlatformAccountOpenId,
  isPlatformAccountUser,
  isPlatformAccountUserId,
} from "./platformAccount";

describe("platformAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes ENV.ownerOpenId as platform owner openId", () => {
    expect(getPlatformOwnerOpenId()).toBe(PLATFORM_OPEN_ID);
  });

  it("matches openId via shared pure helper", () => {
    expect(matchOpenId(PLATFORM_OPEN_ID, PLATFORM_OPEN_ID)).toBe(true);
    expect(isPlatformAccountOpenId(PLATFORM_OPEN_ID)).toBe(true);
    expect(isPlatformAccountOpenId("other")).toBe(false);
  });

  it("resolves platform user by id through getUserById", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      openId: PLATFORM_OPEN_ID,
    });
    expect(await isPlatformAccountUserId(1)).toBe(true);
    expect(isPlatformAccountUser({ openId: PLATFORM_OPEN_ID })).toBe(true);
  });
});
