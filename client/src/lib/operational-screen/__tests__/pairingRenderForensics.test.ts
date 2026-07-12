/**
 * SCREEN-PAIRING-RENDER-FORENSICS-1 — evidence test (not a fix).
 * Reproduces unstable useSyncExternalStore snapshot behavior introduced in SCREEN-PAIRING-CODE-1.
 */
import { describe, expect, it } from "vitest";
import { readOperationalScreenCredentials, OPERATIONAL_SCREEN_CREDENTIAL_KEY } from "../credentialStore";

describe("SCREEN-PAIRING-RENDER-FORENSICS-1 evidence", () => {
  it("readOperationalScreenCredentials returns unstable object references when credentials exist", () => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
      },
      configurable: true,
    });

    storage.set(
      OPERATIONAL_SCREEN_CREDENTIAL_KEY,
      JSON.stringify({
        deviceId: "dev_test123456",
        tokenId: "tok_test123456",
        secret: "a".repeat(32),
        pairedAt: "2026-07-12T00:00:00.000Z",
        protocolVersion: 2,
      })
    );

    const first = readOperationalScreenCredentials();
    const second = readOperationalScreenCredentials();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("readOperationalScreenCredentials returns stable null when no credentials exist", () => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
      },
      configurable: true,
    });

    expect(readOperationalScreenCredentials()).toBeNull();
    expect(readOperationalScreenCredentials()).toBeNull();
  });
});
