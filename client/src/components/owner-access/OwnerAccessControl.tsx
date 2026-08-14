/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Owner-only access-mode control. Hidden from customers and non-owner admins.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOwnerAccessMode } from "@/hooks/useOwnerAccessMode";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ownerAccessStatusLabel } from "./ownerAccessPresentation";

export function OwnerAccessControl() {
  const { t } = useLanguage();
  const { isOwner, isUnavailable, isLoading, data, invalidate } = useOwnerAccessMode();
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const setSimulation = trpc.ownerAccess.setSimulation.useMutation({
    onSuccess: () => {
      void invalidate();
    },
  });
  const returnToFull = trpc.ownerAccess.returnToFullPlatform.useMutation({
    onSuccess: () => {
      void invalidate();
    },
  });

  if (isLoading || (!isOwner && !isUnavailable)) {
    return null;
  }

  if (isUnavailable || !data) {
    return (
      <div
        className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        data-testid="owner-access-unavailable"
      >
        <p className="font-semibold">{t("ownerAccess.title")}</p>
        <p className="mt-1 opacity-80">{t("ownerAccess.unavailable")}</p>
      </div>
    );
  }

  const status = ownerAccessStatusLabel(data);
  const busy = setSimulation.isPending || returnToFull.isPending;
  const livePlans = data.livePlans ?? [];
  const defaultPlan = selectedPlan || livePlans[0]?.code || "";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        status.tone === "simulating"
          ? "border-amber-500/40 bg-amber-500/10"
          : status.tone === "unavailable"
            ? "border-red-500/30 bg-red-500/10"
            : "border-primary/30 bg-primary/5"
      )}
      data-testid="owner-access-control"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="ui-chrome text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ownerAccess.title")}
          </p>
          <p className="font-semibold">
            {status.key === "ownerAccess.simulating"
              ? t("ownerAccess.simulating").replace(
                  "{plan}",
                  data.simulatedPlanName ?? data.simulatedPlanCode ?? ""
                )
              : t(status.key)}
          </p>
          {data.mode === "SIMULATED_PLAN" ? (
            <p className="text-xs font-medium text-amber-300">
              {t("ownerAccess.simulationNoCharge")}
            </p>
          ) : null}
          {data.simulationUnavailable ? (
            <p className="text-xs text-red-300">{t("ownerAccess.simulationUnavailable")}</p>
          ) : null}
        </div>

        {data.mode === "SIMULATED_PLAN" || data.simulationUnavailable ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => returnToFull.mutate()}
          >
            {t("ownerAccess.returnToFullPlatform")}
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={defaultPlan}
              onChange={(event) => setSelectedPlan(event.target.value)}
              aria-label={t("ownerAccess.simulateAPlan")}
            >
              {livePlans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={busy || !defaultPlan}
              onClick={() => setSimulation.mutate({ planCode: defaultPlan })}
            >
              {t("ownerAccess.simulateAPlan")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
