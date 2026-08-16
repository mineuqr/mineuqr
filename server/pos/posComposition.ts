import { identityPlaceOrderService } from "../order/placeOrderComposition";
import { InMemoryPosCheckIntakeIdempotencyStore } from "./infrastructure/InMemoryPosCheckIntakeIdempotencyStore";
import { InMemoryPosSettlementInitiateIdempotencyStore } from "./infrastructure/InMemoryPosSettlementInitiateIdempotencyStore";
import type { PosCheckIntakeIdempotencyStore } from "./infrastructure/PosCheckIntakeIdempotencyStore";
import type { PosPermissionGrantStore } from "./infrastructure/PosPermissionGrantStore";
import type { PosSaleIdempotencyStore } from "./infrastructure/PosSaleIdempotencyStore";
import type { PosSettlementInitiateIdempotencyStore } from "./infrastructure/PosSettlementInitiateIdempotencyStore";
import type { PosTerminalStore } from "./infrastructure/PosTerminalStore";
import {
  selectPosPermissionGrantStore,
  selectPosSaleIdempotencyStore,
  selectPosTerminalStore,
} from "./infrastructure/posStoreSelection";
import { PosAccessService } from "./services/PosAccessService";
import { PosCashierCrmpOperationsService } from "./services/PosCashierCrmpOperationsService";
import { PosCheckIntakeService } from "./services/PosCheckIntakeService";
import { PosEntitlementService } from "./services/PosEntitlementService";
import { PosSaleService } from "./services/PosSaleService";
import { PosSettlementInitiateService } from "./services/PosSettlementInitiateService";
import { PosRegisterShiftContextService } from "./services/PosRegisterShiftContextService";
import { PosTerminalService } from "./services/PosTerminalService";

/**
 * POS-PERSISTENCE-WIRING-1
 * Production / development: Drizzle stores against 0091–0093.
 * Vitest (NODE_ENV=test): InMemory stores.
 * Check/Settlement idempotency remain InMemory — no SQL tables exist.
 */
export {
  selectPosPermissionGrantStore,
  selectPosSaleIdempotencyStore,
  selectPosTerminalStore,
} from "./infrastructure/posStoreSelection";

const defaultStore = selectPosTerminalStore();
const defaultGrants = selectPosPermissionGrantStore();
const defaultSaleIdempotency = selectPosSaleIdempotencyStore();
const defaultCheckIntakeIdempotency = new InMemoryPosCheckIntakeIdempotencyStore();
const defaultSettlementInitiateIdempotency =
  new InMemoryPosSettlementInitiateIdempotencyStore();
let storeOverride: PosTerminalStore | null = null;
let grantOverride: PosPermissionGrantStore | null = null;
let saleIdempotencyOverride: PosSaleIdempotencyStore | null = null;
let checkIntakeIdempotencyOverride: PosCheckIntakeIdempotencyStore | null = null;
let settlementInitiateIdempotencyOverride: PosSettlementInitiateIdempotencyStore | null =
  null;

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

export function setPosCheckIntakeIdempotencyStoreForTests(
  store: PosCheckIntakeIdempotencyStore | null
): void {
  checkIntakeIdempotencyOverride = store;
}

function getPosCheckIntakeIdempotencyStore(): PosCheckIntakeIdempotencyStore {
  return checkIntakeIdempotencyOverride ?? defaultCheckIntakeIdempotency;
}

export function getPosCheckIntakeService(): PosCheckIntakeService {
  return new PosCheckIntakeService(
    getPosGrantStore(),
    getPosAccessService(),
    getPosCheckIntakeIdempotencyStore()
  );
}

export function setPosSettlementInitiateIdempotencyStoreForTests(
  store: PosSettlementInitiateIdempotencyStore | null
): void {
  settlementInitiateIdempotencyOverride = store;
}

function getPosSettlementInitiateIdempotencyStore(): PosSettlementInitiateIdempotencyStore {
  return settlementInitiateIdempotencyOverride ?? defaultSettlementInitiateIdempotency;
}

export function getPosRegisterShiftContextService(): PosRegisterShiftContextService {
  return PosRegisterShiftContextService.withTerminalStore(getStore());
}

export function getPosCashierCrmpOperationsService(): PosCashierCrmpOperationsService {
  return new PosCashierCrmpOperationsService(
    getPosGrantStore(),
    getPosAccessService(),
    getStore()
  );
}

export function getPosSettlementInitiateService(): PosSettlementInitiateService {
  return new PosSettlementInitiateService(
    getPosGrantStore(),
    getPosAccessService(),
    getPosSettlementInitiateIdempotencyStore(),
    getPosRegisterShiftContextService()
  );
}
