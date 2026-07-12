import { useSyncExternalStore } from "react";
import {
  OPERATIONAL_SCREEN_CREDENTIALS_CHANGED,
  readOperationalScreenCredentials,
  type OperationalScreenCredentials,
} from "./credentialStore";

function subscribeCredentials(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => onStoreChange();
  window.addEventListener(OPERATIONAL_SCREEN_CREDENTIALS_CHANGED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(OPERATIONAL_SCREEN_CREDENTIALS_CHANGED, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useOperationalScreenCredentials(): OperationalScreenCredentials | null {
  return useSyncExternalStore(subscribeCredentials, readOperationalScreenCredentials, () => null);
}
