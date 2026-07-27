/**
 * ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 — classification regression tests.
 */
import { describe, expect, it } from "vitest";
import { classifyHistoricalOrderingChannel } from "../ordering-channel-historical-backfill/historicalChannelClassifier";

describe("ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 classifier", () => {
  it("already stamped → CERTAIN but not eligible (idempotent no-op)", () => {
    const r = classifyHistoricalOrderingChannel({
      orderingChannel: "qr",
      identityScope: "TABLE",
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
      sessionId: 1,
    });
    expect(r.confidence).toBe("CERTAIN");
    expect(r.eligibleForBackfill).toBe(false);
    expect(r.proposedChannel).toBe("qr");
  });

  it("TABLE / session table orders → UNKNOWN (qr vs table_session)", () => {
    const r = classifyHistoricalOrderingChannel({
      orderingChannel: null,
      identityScope: "TABLE",
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
      sessionId: 1,
    });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.eligibleForBackfill).toBe(false);
    expect(r.proposedChannel).toBeNull();
  });

  it("KIOSK station counter → LIKELY, not eligible", () => {
    const r = classifyHistoricalOrderingChannel({
      orderingChannel: null,
      identityScope: "KIOSK",
      fulfilmentAnchorType: "station",
      serviceMode: "counter",
      sessionId: null,
    });
    expect(r.confidence).toBe("LIKELY");
    expect(r.eligibleForBackfill).toBe(false);
  });

  it("WAITER table → LIKELY, not eligible", () => {
    const r = classifyHistoricalOrderingChannel({
      orderingChannel: null,
      identityScope: "WAITER",
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
      sessionId: 1,
    });
    expect(r.confidence).toBe("LIKELY");
    expect(r.eligibleForBackfill).toBe(false);
  });

  it("never proposes channel from empty evidence", () => {
    const r = classifyHistoricalOrderingChannel({
      orderingChannel: null,
      identityScope: null,
      fulfilmentAnchorType: null,
      serviceMode: null,
      sessionId: null,
    });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.eligibleForBackfill).toBe(false);
    expect(r.proposedChannel).toBeNull();
  });
});
