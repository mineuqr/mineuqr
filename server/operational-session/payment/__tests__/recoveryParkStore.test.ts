import { describe, expect, it } from "vitest";
import {
  InMemoryRecoveryParkStore,
  recoveryParkEventId,
  RECOVERY_PARK_CONSUMER_CHECK,
  RECOVERY_PARK_CONSUMER_DRAWER,
} from "../recoveryParkStore";

describe("recoveryParkStore", () => {
  it("parks the same Drawer CF twice as one logical durable state", async () => {
    const store = new InMemoryRecoveryParkStore();
    await store.markDrawer("cf-1");
    await store.markDrawer("cf-1");
    expect(await store.hasDrawer("cf-1")).toBe(true);
    expect(await store.hasDrawer("cf-2")).toBe(false);
  });

  it("uses a 36-character event id so consumer_processed can store the token", () => {
    const id = recoveryParkEventId("cf-very-long-collection-fact-id-that-exceeds-36");
    expect(id).toHaveLength(36);
    expect(RECOVERY_PARK_CONSUMER_DRAWER.length).toBeLessThanOrEqual(64);
    expect(RECOVERY_PARK_CONSUMER_CHECK.length).toBeLessThanOrEqual(64);
  });
});
