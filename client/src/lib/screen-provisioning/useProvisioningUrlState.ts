import { useMemo } from "react";
import { useSearch } from "wouter";
import { readProvisioningUrlState } from "./provisioningUrl";

/** Live provisioning URL state — re-reads on every query-string change. */
export function useProvisioningUrlState() {
  const search = useSearch();
  return useMemo(() => readProvisioningUrlState(), [search]);
}
