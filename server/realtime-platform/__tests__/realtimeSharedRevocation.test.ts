/**
 * REALTIME-MULTI-INSTANCE-FANOUT-1 — shared revocation across instances.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRealtimeTicketRevocations,
  ensureRealtimeTicketRevoked,
  mintRealtimeTicket,
  revokeRealtimeTicket,
} from "../tickets/RealtimeTicketService";
import { authorizeRealtimeCredential } from "../tickets/authorizeRealtimeCredential";
import {
  createInMemoryRealtimeRevocationStore,
  setRealtimeRevocationStoreForTests,
} from "../tickets/RealtimeRevocationStore";

describe("shared realtime ticket revocation", () => {
  beforeEach(() => {
    const store = createInMemoryRealtimeRevocationStore();
    setRealtimeRevocationStoreForTests(store);
    clearRealtimeTicketRevocations();
  });

  it("revoke is visible via shared store authorization", async () => {
    const minted = mintRealtimeTicket({
      restaurantId: 1,
      authMode: "staff_session",
      sub: "u:1",
      channels: ["orders"],
    });
    expect((await authorizeRealtimeCredential(minted.token)).ok).toBe(true);
    revokeRealtimeTicket(minted.claims.jti, minted.claims.exp);
    expect(await ensureRealtimeTicketRevoked(minted.claims.jti)).toBe(true);
    const after = await authorizeRealtimeCredential(minted.token);
    expect(after.ok).toBe(false);
  });
});
