import { describe, expect, it, beforeEach } from "vitest";
import {
  clearOperationalScreenCredentials,
  OPERATIONAL_SCREEN_CREDENTIAL_KEY,
  readOperationalScreenCredentials,
  writeOperationalScreenCredentials,
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

describe("credentialStore", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
    });
    clearOperationalScreenCredentials();
  });

  it("persists and reads credential tuple", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_test123",
      tokenId: "tok_test456",
      secret: "a".repeat(32),
    });
    const stored = readOperationalScreenCredentials();
    expect(stored?.deviceId).toBe("dev_test123");
    expect(stored?.tokenId).toBe("tok_test456");
    expect(stored?.protocolVersion).toBe(2);
    expect(window.localStorage.getItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY)).toBeTruthy();
  });

  it("clears credentials on revoke", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_x",
      tokenId: "tok_y",
      secret: "b".repeat(32),
    });
    clearOperationalScreenCredentials();
    expect(readOperationalScreenCredentials()).toBeNull();
  });

  it("returns referentially stable snapshots across repeated reads", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_stable",
      tokenId: "tok_stable",
      secret: "d".repeat(32),
    });
    const first = readOperationalScreenCredentials();
    const second = readOperationalScreenCredentials();
    expect(first).toBe(second);
  });
});
