/**
 * WAITER-SESSION-BINDING-HARDENING-1 — revalidate waiter URL binding.
 * Reuses Session Platform public reads + QR revalidation listeners.
 * Does not create/adopt sessions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { attachDiningSessionRevalidationListeners } from "@/lib/diningSessionRevalidation";
import { trpc } from "@/lib/trpc";
import {
  validateWaiterSessionBinding,
  type WaiterBindingInvalidReason,
  type WaiterSessionBinding,
} from "./waiterSessionBinding";

export type WaiterSessionBindingGuardState = Readonly<{
  /** True while initial validation is in flight. */
  validating: boolean;
  /** True when binding is confirmed open + active for the table. */
  isValid: boolean;
  invalidReason: WaiterBindingInvalidReason | null;
  revalidate: () => void;
}>;

export function useWaiterSessionBindingGuard(input: {
  enabled: boolean;
  binding: WaiterSessionBinding | null;
}): WaiterSessionBindingGuardState {
  const { enabled, binding } = input;
  const utils = trpc.useUtils();
  const [validating, setValidating] = useState(enabled);
  const [isValid, setIsValid] = useState(!enabled);
  const [invalidReason, setInvalidReason] =
    useState<WaiterBindingInvalidReason | null>(null);

  const bindingKey = binding
    ? `${binding.slug}|${binding.tableNumber}|${binding.sessionId}|${binding.sessionToken}`
    : "";

  const runValidation = useCallback(async () => {
    if (!enabled || !binding) {
      setValidating(false);
      setIsValid(false);
      setInvalidReason(null);
      return;
    }

    setValidating(true);
    try {
      const [byToken, activeByTable] = await Promise.all([
        utils.session.getByToken.fetch({
          slug: binding.slug,
          sessionToken: binding.sessionToken,
        }),
        utils.session.getActiveByTable.fetch({
          slug: binding.slug,
          tableNumber: binding.tableNumber,
        }),
      ]);

      const result = validateWaiterSessionBinding({
        binding,
        byToken: byToken
          ? {
              sessionToken: byToken.sessionToken,
              status: byToken.status,
              tableNumber: byToken.tableNumber,
            }
          : null,
        activeByTable: activeByTable
          ? {
              sessionToken: activeByTable.sessionToken,
              status: activeByTable.status,
              tableNumber: activeByTable.tableNumber,
            }
          : null,
      });

      if (result.ok) {
        setIsValid(true);
        setInvalidReason(null);
      } else {
        setIsValid(false);
        setInvalidReason(result.reason);
      }
    } catch {
      setIsValid(false);
      setInvalidReason("not_found");
    } finally {
      setValidating(false);
    }
  }, [enabled, binding, utils.session.getByToken, utils.session.getActiveByTable]);

  const runValidationRef = useRef(runValidation);
  runValidationRef.current = runValidation;

  useEffect(() => {
    void runValidation();
  }, [runValidation, bindingKey]);

  useEffect(() => {
    if (!enabled || !binding) return;
    return attachDiningSessionRevalidationListeners(() => {
      void runValidationRef.current();
    });
  }, [enabled, bindingKey, binding]);

  return {
    validating,
    isValid,
    invalidReason,
    revalidate: () => {
      void runValidation();
    },
  };
}
