import { identityPlaceOrderService } from "../order/placeOrderComposition";
import { InMemoryPosPermissionGrantStore } from "./infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "./infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "./infrastructure/InMemoryPosTerminalStore";
import type { PosPermissionGrantStore } from "./infrastructure/PosPermissionGrantStore";
import type { PosSaleIdempotencyStore } from "./infrastructure/PosSaleIdempotencyStore";
import type { PosTerminalStore } from "./infrastructure/PosTerminalStore";
import { PosAccessService } from "./services/PosAccessService";
import { PosEntitlementService } from "./services/PosEntitlementService";
import { PosSaleService } from "./services/PosSaleService";
import { PosTerminalService } from "./services/PosTerminalService";

const defaultStore = new InMemoryPosTerminalStore();
const defaultGrants = new InMemoryPosPermissionGrantStore();
const defaultSaleIdempotency = new InMemoryPosSaleIdempotencyStore();
let storeOverride: PosTerminalStore | null = null;
let grantOverride: PosPermissionGrantStore | null = null;
let saleIdempotencyOverride: PosSaleIdempotencyStore | null = null;

export function setPosStoreForTests(store: PosTerminalStore | null): void {
  storeOverride = store;
}

export function setPosGrantStoreForTests(
  grants: PosPermissionGrantStore | null
): void {
  grantOverride = grants;
}

function getStore(): PosTerminalStore {
  return storeOverride ?? defaultStore;
}

export function getPosGrantStore(): PosPermissionGrantStore {
  return grantOverride ?? defaultGrants;
}

export function getPosTerminalService(): PosTerminalService {
  const store = getStore();
  return new PosTerminalService(store, new PosEntitlementService(store));
}

export function getPosEntitlementService(): PosEntitlementService {
  return new PosEntitlementService(getStore());
}

export function getPosAccessService(): PosAccessService {
  const store = getStore();
  return new PosAccessService(
    store,
    getPosGrantStore(),
    new PosEntitlementService(store)
  );
}

export function setPosSaleIdempotencyStoreForTests(
  store: PosSaleIdempotencyStore | null
): void {
  saleIdempotencyOverride = store;
}

function getPosSaleIdempotencyStore(): PosSaleIdempotencyStore {
  return saleIdempotencyOverride ?? defaultSaleIdempotency;
}

export function getPosSaleService(): PosSaleService {
  return new PosSaleService(
    getPosGrantStore(),
    getPosAccessService(),
    identityPlaceOrderService,
    getPosSaleIdempotencyStore()
  );
}
