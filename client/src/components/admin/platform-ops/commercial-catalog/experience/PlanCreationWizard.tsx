/**
 * COMMERCIAL-LIVE-PLANS-CAPABILITY-EDITOR-REPAIR-1 — live plan editor.
 * Edit → Validate → Atomic Save, including individual capability composition.
 */

import { useEffect, useMemo, useState } from "react";
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
import { CapabilityFilterPicker } from "./CapabilityFilterPicker";
import { normalizePlanFeatures } from "./capabilityExperienceModel";
import {
  LivePlanLimitsEditor,
  limitsFromProfileValues,
  type LivePlanLimitDraft,
} from "./LivePlanLimitsEditor";
import { validateLivePlanLimitValues } from "@shared/commercial-catalog";

function featuresFromBundle(
  bundle:
    | {
        features?: Array<{ featureKey: string; included?: boolean }>;
      }
    | undefined
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const row of bundle?.features ?? []) {
    next[row.featureKey] = Boolean(row.included);
  }
  return normalizePlanFeatures(next);
}

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
  const [trialId, setTrialId] = useState(selected?.trialPolicyId ?? "");
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<LivePlanLimitDraft[]>([]);
  const [limitError, setLimitError] = useState<string | null>(null);

  const selectedBundle = (props.data.bundlesQuery.data ?? []).find(
    (b) => b.id === selected?.featureBundleId
  );
  const selectedLimitProfile = (props.data.limitsQuery.data ?? []).find(
    (p) => p.id === selected?.limitProfileId
  );

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
    setTrialId(selected.trialPolicyId ?? "");
    setMonthlyAmountUsd(currentMonthly?.amount ?? "");
    setYearlyAmountUsd(currentYearly?.amount ?? "");
    setCapabilities(featuresFromBundle(selectedBundle));
    setLimits(limitsFromProfileValues(selectedLimitProfile?.values));
    setLimitError(null);
  }, [
    selected?.id,
    selectedBundle?.id,
    selectedLimitProfile?.id,
    currentMonthly?.amount,
    currentYearly?.amount,
  ]);

  const capabilityPayload = useMemo(
    () =>
      Object.entries(normalizePlanFeatures(capabilities)).map(
        ([featureKey, included]) => ({
          featureKey,
          included: Boolean(included),
        })
      ),
    [capabilities]
  );

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
    const checked = validateLivePlanLimitValues(limits);
    if (!checked.ok) {
      setLimitError(checked.issues.map((i) => i.message).join("; "));
      return;
    }
    setLimitError(null);
    await saveMut.mutateAsync({
      id: selected.id,
      name,
      description: description || null,
      featureBundleId: selected.featureBundleId ?? null,
      limitProfileId: selected.limitProfileId ?? null,
      trialPolicyId: trialId || null,
      prices: prices.length ? prices : undefined,
      capabilities: capabilityPayload,
      limits: checked.normalized,
    });
  }

  function revertUnsaved() {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description ?? "");
    setTrialId(selected.trialPolicyId ?? "");
    setMonthlyAmountUsd(currentMonthly?.amount ?? "");
    setYearlyAmountUsd(currentYearly?.amount ?? "");
    setCapabilities(featuresFromBundle(selectedBundle));
    setLimits(limitsFromProfileValues(selectedLimitProfile?.values));
    setLimitError(null);
  }

  return (
    <PlatformOpsSection
      title={cc("experience.wizard.title")}
      description={cc("experience.livePlans.editHint")}
    >
      <div className="space-y-4 max-w-4xl">
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
        <CatalogField label={cc("fields.features")}>
          <p className="text-sm text-muted-foreground mb-2">
            {cc("experience.livePlans.capabilitiesHint")}
          </p>
          <CapabilityFilterPicker
            value={capabilities}
            onChange={setCapabilities}
          />
        </CatalogField>
        <CatalogField label={cc("headers.limits")}>
          <p className="text-sm text-muted-foreground mb-2">
            {cc("experience.livePlans.limitsHint")}
          </p>
          <LivePlanLimitsEditor
            value={limits}
            onChange={setLimits}
            error={limitError}
          />
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
        <div className="flex flex-wrap gap-2">
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
            onClick={() => revertUnsaved()}
          >
            {cc("experience.livePlans.revertUnsaved")}
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
