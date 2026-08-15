import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCommercialEntitlements } from "./useCommercialEntitlements";
import {
  FROZEN_RENEWAL_PATH,
  isFrozenCommercialAccount,
} from "@/lib/commercial/commercialAccountState";

/** Presentation redirect. Server mutations still enforce FROZEN independently. */
export function useFrozenCommercialRouteGuard() {
  const [, setLocation] = useLocation();
  const { meta, isReady } = useCommercialEntitlements();

  useEffect(() => {
    if (!isReady) return;
    if (isFrozenCommercialAccount(meta)) {
      setLocation(FROZEN_RENEWAL_PATH, { replace: true });
    }
  }, [isReady, meta, setLocation]);

  return {
    isFrozen: isReady && isFrozenCommercialAccount(meta),
    isReady,
  };
}
