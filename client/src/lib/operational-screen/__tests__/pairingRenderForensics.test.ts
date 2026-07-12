/**
 * SCREEN-PAIRING-RENDER-FORENSICS-1 / SCREEN-PAIRING-STORE-STABILITY-1 —
 * regression guard for useSyncExternalStore snapshot stability.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearOperationalScreenCredentials,
  readOperationalScreenCredentials,
  writeOperationalScreenCredentials,
  OPERATIONAL_SCREEN_CREDENTIAL_KEY,
  OPERATIONAL_SCREEN_CREDENTIALS_CHANGED,
} from "../credentialStore";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function installWindow(storage: Storage) {
  const listeners = new Map<string, Set<() => void>>();
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      addEventListener(type: string, handler: () => void) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(handler);
      },
      removeEventListener(type: string, handler: () => void) {
        listeners.get(type)?.delete(handler);
      },
      dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((handler) => handler());
        return true;
      },
    },
    configurable: true,
  });
}

describe("SCREEN-PAIRING-STORE-STABILITY-1", () => {
  beforeEach(() => {
    installWindow(createMemoryStorage());
    clearOperationalScreenCredentials();
  });

  it("returns the same snapshot reference when storage is unchanged", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_test123456",
      tokenId: "tok_test123456",
      secret: "a".repeat(32),
    });

    const first = readOperationalScreenCredentials();
    const second = readOperationalScreenCredentials();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).toBe(second);
  });

  it("returns stable null when no credentials exist", () => {
    expect(readOperationalScreenCredentials()).toBeNull();
    expect(readOperationalScreenCredentials()).toBeNull();
  });

  it("returns a new snapshot reference only when credential content changes", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_a",
      tokenId: "tok_a",
      secret: "a".repeat(32),
    });
    const before = readOperationalScreenCredentials();

    writeOperationalScreenCredentials({
      deviceId: "dev_b",
      tokenId: "tok_b",
      secret: "b".repeat(32),
    });
    const after = readOperationalScreenCredentials();

    expect(before).not.toBe(after);
    expect(after?.deviceId).toBe("dev_b");
  });

  it("does not notify when writing identical credential content", () => {
    const events: string[] = [];
    window.addEventListener(OPERATIONAL_SCREEN_CREDENTIALS_CHANGED, () => {
      events.push("changed");
    });

    const first = writeOperationalScreenCredentials({
      deviceId: "dev_same",
      tokenId: "tok_same",
      secret: "c".repeat(32),
    });
    events.length = 0;

    writeOperationalScreenCredentials({
      deviceId: first.deviceId,
      tokenId: first.tokenId,
      secret: first.secret,
      pairedAt: first.pairedAt,
    });
    expect(events).toHaveLength(0);
  });
});
