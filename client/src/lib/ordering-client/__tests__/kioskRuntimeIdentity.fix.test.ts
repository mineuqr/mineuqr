/**
 * SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 — deviceSessionId continuity + cart scope.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildKioskDeviceSessionStorageKey,
  clearKioskDeviceSessionId,
  createKioskCartScopeAdapter,
  loadOrCreateKioskDeviceSessionId,
  rotateKioskDeviceSessionId,
  saveCartByScopeKey,
  loadCartByScopeKey,
} from "../index";

describe("SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 deviceSession continuity", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memory.set(k, v);
        },
        removeItem: (k: string) => {
          memory.delete(k);
        },
      },
    });
  });

  const identity = {
    slug: "cafe",
    stationId: "front",
    kioskId: "dev-1",
  };

  it("loadOrCreate returns stable deviceSessionId across remount simulations", () => {
    const first = loadOrCreateKioskDeviceSessionId(identity);
    const second = loadOrCreateKioskDeviceSessionId(identity);
    const third = loadOrCreateKioskDeviceSessionId(identity);
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(buildKioskDeviceSessionStorageKey(identity)).toBe(
      "mineuqr:kiosk:deviceSession:cafe:front:dev-1"
    );
  });

  it("cart scope key stays identical when deviceSessionId is reused after remount", () => {
    const deviceSessionId = loadOrCreateKioskDeviceSessionId(identity);
    const scopeA = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId,
    }).resolveScopeKey();

    saveCartByScopeKey(scopeA, [
      {
        menuItemId: 1,
        nameAr: "قهوة",
        nameEn: "Coffee",
        price: "8.00",
        quantity: 1,
      },
    ]);

    // Simulate KioskShell remount → loadOrCreate (not rotate)
    const remountedId = loadOrCreateKioskDeviceSessionId(identity);
    expect(remountedId).toBe(deviceSessionId);

    const scopeB = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId: remountedId,
    }).resolveScopeKey();
    expect(scopeB).toBe(scopeA);
    expect(loadCartByScopeKey(scopeB)).toHaveLength(1);
    expect(loadCartByScopeKey(scopeB)[0]?.menuItemId).toBe(1);
  });

  it("multi-item cart survives identity continuity (menu → cart → checkout keys)", () => {
    const deviceSessionId = loadOrCreateKioskDeviceSessionId(identity);
    const key = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId,
    }).resolveScopeKey();

    saveCartByScopeKey(key, [
      {
        menuItemId: 1,
        nameAr: "أ",
        nameEn: "A",
        price: "5.00",
        quantity: 2,
        notes: "no sugar",
      },
      {
        menuItemId: 2,
        nameAr: "ب",
        nameEn: "B",
        price: "12.00",
        quantity: 1,
        modifiers: ["large"],
      },
    ]);

    // forward nav remounts
    const afterCartNav = loadOrCreateKioskDeviceSessionId(identity);
    const afterCheckoutNav = loadOrCreateKioskDeviceSessionId(identity);
    expect(afterCartNav).toBe(deviceSessionId);
    expect(afterCheckoutNav).toBe(deviceSessionId);

    const hydrated = loadCartByScopeKey(
      createKioskCartScopeAdapter({
        ...identity,
        deviceSessionId: afterCheckoutNav,
      }).resolveScopeKey()
    );
    expect(hydrated).toHaveLength(2);
    expect(hydrated.find((i) => i.menuItemId === 1)?.notes).toBe("no sugar");
    expect(hydrated.find((i) => i.menuItemId === 2)?.modifiers).toEqual([
      "large",
    ]);
  });

  it("back/forward navigation simulation keeps same storage key", () => {
    const id = loadOrCreateKioskDeviceSessionId(identity);
    const key = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId: id,
    }).resolveScopeKey();
    saveCartByScopeKey(key, [
      {
        menuItemId: 9,
        nameAr: "ج",
        nameEn: "C",
        price: "1.00",
        quantity: 1,
      },
    ]);

    for (let i = 0; i < 5; i++) {
      const remount = loadOrCreateKioskDeviceSessionId(identity);
      expect(remount).toBe(id);
      expect(
        createKioskCartScopeAdapter({
          ...identity,
          deviceSessionId: remount,
        }).resolveScopeKey()
      ).toBe(key);
      expect(loadCartByScopeKey(key)).toHaveLength(1);
    }
  });

  it("browser refresh simulation (reload sessionStorage) keeps cart", () => {
    const id = loadOrCreateKioskDeviceSessionId(identity);
    const key = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId: id,
    }).resolveScopeKey();
    saveCartByScopeKey(key, [
      {
        menuItemId: 3,
        nameAr: "د",
        nameEn: "D",
        price: "4.00",
        quantity: 3,
      },
    ]);

    // "Refresh" only clears React state — sessionStorage Map persists
    const afterRefresh = loadOrCreateKioskDeviceSessionId(identity);
    expect(afterRefresh).toBe(id);
    expect(loadCartByScopeKey(key)[0]?.quantity).toBe(3);
  });

  it("deep link into cart/checkout with existing journey reuses identity", () => {
    const journeyId = loadOrCreateKioskDeviceSessionId(identity);
    const key = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId: journeyId,
    }).resolveScopeKey();
    saveCartByScopeKey(key, [
      {
        menuItemId: 7,
        nameAr: "ه",
        nameEn: "E",
        price: "9.00",
        quantity: 1,
      },
    ]);

    // Deep link: new shell mount calls loadOrCreate — same journey
    const deepLinkId = loadOrCreateKioskDeviceSessionId(identity);
    expect(deepLinkId).toBe(journeyId);
    expect(
      loadCartByScopeKey(
        createKioskCartScopeAdapter({
          ...identity,
          deviceSessionId: deepLinkId,
        }).resolveScopeKey()
      )
    ).toHaveLength(1);
  });

  it("rotate starts a new journey (idle Start / reset) with empty cart key", () => {
    const before = loadOrCreateKioskDeviceSessionId(identity);
    const keyBefore = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId: before,
    }).resolveScopeKey();
    saveCartByScopeKey(keyBefore, [
      {
        menuItemId: 1,
        nameAr: "أ",
        nameEn: "A",
        price: "1.00",
        quantity: 1,
      },
    ]);

    const after = rotateKioskDeviceSessionId(identity);
    expect(after).not.toBe(before);
    expect(loadOrCreateKioskDeviceSessionId(identity)).toBe(after);

    const keyAfter = createKioskCartScopeAdapter({
      ...identity,
      deviceSessionId: after,
    }).resolveScopeKey();
    expect(keyAfter).not.toBe(keyBefore);
    expect(loadCartByScopeKey(keyAfter)).toEqual([]);
    // Prior journey cart remains under old key (isolation — not dual-read)
    expect(loadCartByScopeKey(keyBefore)).toHaveLength(1);
  });

  it("clear removes persisted journey identity", () => {
    const id = loadOrCreateKioskDeviceSessionId(identity);
    clearKioskDeviceSessionId(identity);
    const next = loadOrCreateKioskDeviceSessionId(identity);
    expect(next).not.toBe(id);
  });

  it("isolates device sessions across stations / kiosks", () => {
    const a = loadOrCreateKioskDeviceSessionId({
      slug: "cafe",
      stationId: "front",
      kioskId: "dev-1",
    });
    const b = loadOrCreateKioskDeviceSessionId({
      slug: "cafe",
      stationId: "back",
      kioskId: "dev-1",
    });
    expect(a).not.toBe(b);
  });
});
