import { afterEach, describe, expect, it, vi } from "vitest";
import { clearNotificationMediaSession } from "./notificationMediaSession";

describe("notificationMediaSession NOTIFICATION-AUDIO-CLEANUP-1", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clearNotificationMediaSession resets playback state and metadata", () => {
    const setActionHandler = vi.fn();
    let playbackState = "playing";
    let metadata: { title: string } | null = { title: "MineuQR" };

    vi.stubGlobal("navigator", {
      mediaSession: {
        get playbackState() {
          return playbackState;
        },
        set playbackState(value: MediaSessionPlaybackState) {
          playbackState = value;
        },
        get metadata() {
          return metadata;
        },
        set metadata(value: { title: string } | null) {
          metadata = value;
        },
        setActionHandler,
      },
    });

    clearNotificationMediaSession("test");

    expect(playbackState).toBe("none");
    expect(metadata).toBeNull();
    expect(setActionHandler).toHaveBeenCalled();
  });

  it("clearNotificationMediaSession is a no-op when unsupported", () => {
    vi.stubGlobal("navigator", {});
    expect(() => clearNotificationMediaSession("unsupported")).not.toThrow();
  });
});
