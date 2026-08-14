/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — live plan editor.
 * Edit → Validate → Atomic Save.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  PlatformOpsAlert,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
} from "@/design-system/platform-ops-ui";
import {
  CatalogField,
  Input,
  Textarea,
} from "../CatalogFormDialog";
import { useCatalogI18n } from "../useCatalogI18n";
import type { CatalogManagementData } from "../useCatalogManagementData";
import type { ExperienceNavigate } from "./experienceNav";
import { COMMERCIAL_CANONICAL_CURRENCY } from "@shared/commercial-catalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PlanCreationWizard(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc } = useCatalogI18n();
  const plans = props.data.plansQuery.data ?? [];
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const selected = plans.find((p) => p.id === planId) ?? plans[0];
  const [name, setName] = useState(selected?.name ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [bundleId, setBundleId] = useState(selected?.featureBundleId ?? "");
  const [limitId, setLimitId] = useState(selected?.limitProfileId ?? "");
  const [trialId, setTrialId] = useState(selected?.trialPolicyId ?? "");

  const validation = trpc.commercialCatalog.validatePlanSave.useQuery(
    { planId: selected?.id ?? "" },
    { enabled: Boolean(selected?.id) }
  );
  const saveMut = trpc.commercialCatalog.saveLivePlan.useMutation({
    onSuccess: async () => {
      toast.success(cc("toasts.planUpdated"));
      await props.data.invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const monthlyCycle = props.data.cyclesQuery.data?.find((c) => c.code === "monthly");
  const yearlyCycle = props.data.cyclesQuery.data?.find((c) => c.code === "yearly");
  const currentMonthly = props.data.pricesQuery.data?.find(
    (p) =>
      p.planId === selected?.id &&
      p.billingCycleId === monthlyCycle?.id &&
      !p.regionId
  );
  const currentYearly = props.data.pricesQuery.data?.find(
    (p) =>
      p.planId === selected?.id &&
      p.billingCycleId === yearlyCycle?.id &&
      !p.regionId
  );
  const [monthlyAmountUsd, setMonthlyAmountUsd] = useState(currentMonthly?.amount ?? "");
  const [yearlyAmountUsd, setYearlyAmountUsd] = useState(currentYearly?.amount ?? "");

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description ?? "");
    setBundleId(selected.featureBundleId ?? "");
    setLimitId(selected.limitProfileId ?? "");
    setTrialId(selected.trialPolicyId ?? "");
    setMonthlyAmountUsd(currentMonthly?.amount ?? "");
    setYearlyAmountUsd(currentYearly?.amount ?? "");
  }, [selected?.id, currentMonthly?.amount, currentYearly?.amount]);

  async function save() {
    if (!selected) return;
    const regional = (props.data.pricesQuery.data ?? []).filter(
      (p) => p.planId === selected.id && p.regionId
    );
    const prices = [
      ...(monthlyCycle && monthlyAmountUsd
        ? [
            {
              billingCycleId: monthlyCycle.id,
              currency: COMMERCIAL_CANONICAL_CURRENCY,
              amount: monthlyAmountUsd,
              regionId: null,
            },
          ]
        : []),
      ...(yearlyCycle && yearlyAmountUsd
        ? [
            {
              billingCycleId: yearlyCycle.id,
              currency: COMMERCIAL_CANONICAL_CURRENCY,
              amount: yearlyAmountUsd,
              regionId: null,
            },
          ]
        : []),
      ...regional.map((p) => ({
        billingCycleId: p.billingCycleId,
        currency: p.currency,
        amount: p.amount,
        regionId: p.regionId,
      })),
    ];
    await saveMut.mutateAsync({
      id: selected.id,
      name,
      description: description || null,
      featureBundleId: bundleId || null,
      limitProfileId: limitId || null,
      trialPolicyId: trialId || null,
      prices: prices.length ? prices : undefined,
    });
  }

  return (
    <PlatformOpsSection
      title={cc("experience.wizard.title")}
      description={cc("experience.livePlans.editHint")}
    >
      <div className="space-y-4 max-w-xl">
        <CatalogField label={cc("fields.plan")}>
          <Select
            value={selected?.id ?? ""}
            onValueChange={(id) => {
              setPlanId(id);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.description")}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CatalogField>
        <CatalogField label={cc("fields.featureBundle")}>
          <Select value={bundleId} onValueChange={setBundleId}>
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.selectBundle")} />
            </SelectTrigger>
            <SelectContent>
              {(props.data.bundlesQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.limitProfile")}>
          <Select value={limitId} onValueChange={setLimitId}>
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.selectLimits")} />
            </SelectTrigger>
            <SelectContent>
              {(props.data.limitsQuery.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.trialPolicy")}>
          <Select value={trialId || "__none"} onValueChange={(v) => setTrialId(v === "__none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder={cc("common.none")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(props.data.trialsQuery.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("polish.monthlyUsd")}>
          <Input
            value={monthlyAmountUsd}
            onChange={(e) => setMonthlyAmountUsd(e.target.value)}
          />
        </CatalogField>
        <CatalogField label={cc("polish.yearlyUsd")}>
          <Input
            value={yearlyAmountUsd}
            onChange={(e) => setYearlyAmountUsd(e.target.value)}
          />
        </CatalogField>
        {validation.data ? (
          <PlatformOpsStatusBadge
            status={validation.data.ok ? "healthy" : "degraded"}
            label={
              validation.data.ok ? cc("manage.readyToSave") : cc("manage.notReady")
            }
          />
        ) : null}
        {!validation.data?.ok && validation.data?.issues.length ? (
          <PlatformOpsAlert
            severity="warning"
            title={cc("manage.notReady")}
            detail={validation.data.issues.map((i) => i.message).join("; ")}
          />
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saveMut.isPending || !selected}
          >
            {cc("actions.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onNavigate("plans")}
          >
            {cc("actions.back")}
          </Button>
        </div>
      </div>
    </PlatformOpsSection>
  );
}
