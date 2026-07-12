import { describe, expect, it, beforeEach } from "vitest";
import {
  clearOperationalScreenCredentials,
  readOperationalScreenCredentials,
  writeOperationalScreenCredentials,
} from "@/lib/operational-screen/credentialStore";
import { getScreenEntryUrl } from "@/lib/screen-credential-lifecycle/screenEntryUrl";

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

describe("SCREEN-CREDENTIAL-LIFECYCLE-1 client", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage, location: { origin: "https://test.mineuqr.com" } },
      configurable: true,
    });
    clearOperationalScreenCredentials();
  });

  it("closing browser does not clear stored credentials", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_test123",
      tokenId: "tok_test456",
      secret: "a".repeat(32),
    });
    clearOperationalScreenCredentials();
    writeOperationalScreenCredentials({
      deviceId: "dev_test123",
      tokenId: "tok_test456",
      secret: "a".repeat(32),
    });
    expect(readOperationalScreenCredentials()?.deviceId).toBe("dev_test123");
  });

  it("screen entry URL targets /screen for reopen", () => {
    expect(getScreenEntryUrl()).toBe("https://test.mineuqr.com/screen");
  });

  it("credentials persist across read cycles (reopen /screen)", () => {
    writeOperationalScreenCredentials({
      deviceId: "dev_persistent",
      tokenId: "tok_persistent",
      secret: "c".repeat(32),
    });
    const first = readOperationalScreenCredentials();
    const second = readOperationalScreenCredentials();
    expect(first).toStrictEqual(second);
    expect(second?.tokenId).toBe("tok_persistent");
  });
});
