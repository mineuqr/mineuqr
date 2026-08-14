/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 */

export { isPlatformOwner, assertPlatformOwner, isOwnerOpenIdConfigured } from "./identity";
export { loadOwnerAccessMode, persistOwnerAccessMode, interpretOwnerAccessRecord } from "./service";
export { presentOwnerAccessMode } from "./presentation";
export { ownerAccessRouter } from "./router";
export {
  resolveFullPlatformEntitlements,
  resolvePlatformOwnerEntitlements,
} from "./entitlements";
export {
  setPlatformOwnerAccessMemoryOnlyForTests,
  clearPlatformOwnerAccessStoreForTests,
} from "./store";
export type { OwnerAccessModeState, PlatformOwnerAccessMode } from "./types";
