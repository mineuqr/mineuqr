import { describe, expect, it } from "vitest";
import { AUDIO_ASSETS } from "./audioAssets";

describe("audioAssets NOTIFICATION-AUDIO-1", () => {
  it("defines owner and customer ready asset paths", () => {
    expect(AUDIO_ASSETS.OWNER_ALERT).toBe(
      "/audio/mixkit-airport-announcement-ding-1569.wav"
    );
    expect(AUDIO_ASSETS.CUSTOMER_READY).toBe(
      "/audio/mixkit-clock-countdown-bleeps-916.wav"
    );
  });
});
