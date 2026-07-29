/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — Plan Creation Wizard.
 * COMMERCIAL-CATALOG-PRODUCTION-POLISH-1 — dual USD pricing, country selector, localized labels.
 * Orchestrates existing commercialCatalog mutations; never bypasses CC-16.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CATALOG_FEATURE_KEYS, CATALOG_LIMIT_KEYS } from "../catalogUiHelpers";
import { useCatalogI18n } from "../useCatalogI18n";
import { catalogExperienceObservability } from "./experienceObservability";
import { catalogProductivityStore } from "./productivityStore";
import type { CatalogManagementData } from "../useCatalogManagementData";
import {
  resolveSmartValidationActions,
  type ResolvedSmartValidationAction,
} from "./smartValidation";
import type { ExperienceNavigate } from "./experienceNav";
import { CatalogCountrySelect } from "../CatalogCountrySelect";
import {
  catalogFeatureNameKey,
  catalogLimitNameKey,
  resolveCatalogLabel,
  yearlySavingsPercent,
} from "../catalogCommercialDisplay";
import { COMMERCIAL_CANONICAL_CURRENCY } from "@shared/commercial-catalog";

const WIZARD_STEP_KEYS = [
  "wizard.steps.planInfo",
  "wizard.steps.planVersion",
  "wizard.steps.pricing",
  "wizard.steps.billingCycle",
  "wizard.steps.featureBundle",
  "wizard.steps.limitProfile",
  "wizard.steps.trialPolicy",
  "wizard.steps.regionalPolicy",
  "wizard.steps.promotionOptional",
  "wizard.steps.review",
  "wizard.steps.publish",
] as const;

const DRAFT_ID = "plan-wizard-default";

const DEFAULT_LIMITS: Record<string, string> = {
  restaurants: "1",
  items: "100",
  categories: "10",
  ordersPerMonth: "500",
  qrCodes: "10",
  storage: "1024",
  images: "50",
  staffAccounts: "5",
  branches: "1",
  devices: "3",
};

type WizardState = {
  step: number;
  planCode: string;
  planName: string;
  planDescription: string;
  versionCode: string;
  versionName: string;
  monthlyAmountUsd: string;
  yearlyAmountUsd: string;
  bundleCode: string;
  bundleName: string;
  features: Record<string, boolean>;
  limitCode: string;
  limitName: string;
  limits: Record<string, string>;
  unlimited: Record<string, boolean>;
  trialCode: string;
  trialName: string;
  trialDays: string;
  regionCode: string;
  regionName: string;
  countryCode: string;
  regionCurrency: string;
  regionalOverrideMonthly: string;
  promoCode: string;
  promoName: string;
  promoEffect: string;
  includePromo: boolean;
  migrationCode: string;
  migrationName: string;
  retirementCode: string;
  retirementName: string;
  createdPlanId?: string;
  createdVersionId?: string;
};

const DEFAULT: WizardState = {
  step: 0,
  planCode: "",
  planName: "",
  planDescription: "",
  versionCode: "v1",
  versionName: "Initial",
  monthlyAmountUsd: "19.00",
  yearlyAmountUsd: "190.00",
  bundleCode: "",
  bundleName: "",
  features: Object.fromEntries(CATALOG_FEATURE_KEYS.map((k) => [k, false])),
  limitCode: "",
  limitName: "",
  limits: { ...DEFAULT_LIMITS },
  unlimited: {},
  trialCode: "",
  trialName: "",
  trialDays: "14",
  regionCode: "",
  regionName: "",
  countryCode: "US",
  regionCurrency: "USD",
  regionalOverrideMonthly: "",
  promoCode: "",
  promoName: "",
  promoEffect: "",
  includePromo: false,
  migrationCode: "",
  migrationName: "",
  retirementCode: "",
  retirementName: "",
};

function hydrateWizardDraft(
  draft: Record<string, unknown> | undefined
): WizardState {
  if (!draft) return { ...DEFAULT };
  const legacy = draft as WizardState & { amount?: string };
  return {
    ...DEFAULT,
    ...(draft as WizardState),
    monthlyAmountUsd:
      legacy.monthlyAmountUsd ?? legacy.amount ?? DEFAULT.monthlyAmountUsd,
    yearlyAmountUsd: legacy.yearlyAmountUsd ?? DEFAULT.yearlyAmountUsd,
    limits: { ...DEFAULT_LIMITS, ...(legacy.limits ?? {}) },
  };
}

export function PlanCreationWizard(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc, t } = useCatalogI18n();
  const [state, setState] = useState<WizardState>(() =>
    hydrateWizardDraft(catalogProductivityStore.get().wizardDrafts[DRAFT_ID])
  );
  const [busy, setBusy] = useState(false);
  const [publishIssues, setPublishIssues] = useState<
    ResolvedSmartValidationAction[]
  >([]);

  const createPlan = trpc.commercialCatalog.createPlan.useMutation();
  const createVersion = trpc.commercialCatalog.createVersion.useMutation();
  const createCycle = trpc.commercialCatalog.createBillingCycle.useMutation();
  const createBundle = trpc.commercialCatalog.createFeatureBundle.useMutation();
  const createLimits = trpc.commercialCatalog.createLimitProfile.useMutation();
  const createTrial = trpc.commercialCatalog.createTrialPolicy.useMutation();
  const createRegion = trpc.commercialCatalog.createRegion.useMutation();
  const createPromo = trpc.commercialCatalog.createPromotion.useMutation();
  const createMigration =
    trpc.commercialCatalog.createMigrationPolicy.useMutation();
  const createRetirement =
    trpc.commercialCatalog.createRetirementPolicy.useMutation();
  const createPrice = trpc.commercialCatalog.createPrice.useMutation();
  const publish = trpc.commercialCatalog.publishVersion.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    catalogExperienceObservability.recordWizardStart();
  }, []);

  useEffect(() => {
    catalogProductivityStore.saveWizardDraft(DRAFT_ID, state);
  }, [state]);

  const patch = (p: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...p }));

  const progress = useMemo(
    () => Math.round(((state.step + 1) / WIZARD_STEP_KEYS.length) * 100),
    [state.step]
  );

  const savingsPercent = useMemo(
    () =>
      yearlySavingsPercent(
        Number.parseFloat(state.monthlyAmountUsd),
        Number.parseFloat(state.yearlyAmountUsd)
      ),
    [state.monthlyAmountUsd, state.yearlyAmountUsd]
  );

  async function findOrCreateCycle(
    intervalUnit: "month" | "year",
    suffix: string,
    name: string
  ) {
    const existing = (props.data.cyclesQuery.data ?? []).find(
      (c) => c.intervalUnit === intervalUnit && c.intervalCount === 1
    );
    if (existing) return existing;
    return createCycle.mutateAsync({
      code: `${state.planCode}-${suffix}`,
      name,
      intervalCount: 1,
      intervalUnit,
    });
  }

  async function runCreatePipeline(publishAtEnd: boolean) {
    setBusy(true);
    const started = Date.now();
    try {
      const plan =
        state.createdPlanId != null
          ? { id: state.createdPlanId }
          : await createPlan.mutateAsync({
              code: state.planCode,
              name: state.planName,
              description: state.planDescription || null,
            });

      const monthlyCycle = await findOrCreateCycle(
        "month",
        "monthly",
        cc("intervalUnits.month")
      );
      const yearlyCycle = await findOrCreateCycle(
        "year",
        "yearly",
        cc("intervalUnits.year")
      );

      const bundle = await createBundle.mutateAsync({
        code: state.bundleCode || `${state.planCode}-bundle`,
        name: state.bundleName || `${state.planName} Bundle`,
        features: CATALOG_FEATURE_KEYS.map((featureKey) => ({
          featureKey,
          included: Boolean(state.features[featureKey]),
        })),
      });

      const limits = await createLimits.mutateAsync({
        code: state.limitCode || `${state.planCode}-limits`,
        name: state.limitName || `${state.planName} Limits`,
        values: CATALOG_LIMIT_KEYS.map((limitKey) => ({
          limitKey,
          value: state.unlimited[limitKey]
            ? null
            : Number(state.limits[limitKey] ?? 0),
        })),
      });

      const trial = await createTrial.mutateAsync({
        code: state.trialCode || `${state.planCode}-trial`,
        name: state.trialName || `${state.planName} Trial`,
        durationDays: Number(state.trialDays) || 14,
      });

      const region = await createRegion.mutateAsync({
        code: state.regionCode || `${state.planCode}-region`,
        name: state.regionName || state.countryCode,
        countryCode: state.countryCode,
        currency: state.regionCurrency,
      });

      if (state.includePromo && state.promoCode) {
        await createPromo.mutateAsync({
          code: state.promoCode,
          name: state.promoName || state.promoCode,
          effectSummary: state.promoEffect || cc("manage.promotionDefault"),
        });
      }

      const migration = await createMigration.mutateAsync({
        code: state.migrationCode || `${state.planCode}-mig`,
        name: state.migrationName || `${state.planName} Migration`,
      });
      const retirement = await createRetirement.mutateAsync({
        code: state.retirementCode || `${state.planCode}-ret`,
        name: state.retirementName || `${state.planName} Retirement`,
      });

      const version =
        state.createdVersionId != null
          ? { id: state.createdVersionId }
          : await createVersion.mutateAsync({
              planId: plan.id,
              versionCode: state.versionCode,
              versionName: state.versionName,
              featureBundleId: bundle.id,
              limitProfileId: limits.id,
              trialPolicyId: trial.id,
              migrationPolicyId: migration.id,
              retirementPolicyId: retirement.id,
              compatibility: {
                upgradeTargets: [],
                downgradeTargets: [],
                migrationRequirements: [],
                breakingCommercialChanges: [],
              },
            });

      await createPrice.mutateAsync({
        planVersionId: version.id,
        billingCycleId: monthlyCycle.id,
        currency: COMMERCIAL_CANONICAL_CURRENCY,
        amount: state.monthlyAmountUsd,
        regionId: null,
      });

      await createPrice.mutateAsync({
        planVersionId: version.id,
        billingCycleId: yearlyCycle.id,
        currency: COMMERCIAL_CANONICAL_CURRENCY,
        amount: state.yearlyAmountUsd,
        regionId: null,
      });

      if (state.regionalOverrideMonthly.trim()) {
        await createPrice.mutateAsync({
          planVersionId: version.id,
          billingCycleId: monthlyCycle.id,
          currency: state.regionCurrency,
          amount: state.regionalOverrideMonthly.trim(),
          regionId: region.id,
        });
      }

      patch({ createdPlanId: plan.id, createdVersionId: version.id });
      await props.data.invalidateAll();

      if (publishAtEnd) {
        const validation = await utils.commercialCatalog.validatePublication.fetch({
          versionId: version.id,
        });
        if (!validation.ok) {
          catalogExperienceObservability.recordValidationFailure();
          setPublishIssues(
            resolveSmartValidationActions(validation.issues, t)
          );
          toast.error(cc("toasts.validationBlockedPublish"));
          patch({ step: 10 });
          return;
        }
        catalogExperienceObservability.recordPublication(true);
        await publish.mutateAsync({ versionId: version.id });
        catalogExperienceObservability.recordPublishDuration(Date.now() - started);
        catalogExperienceObservability.recordWizardComplete();
        catalogProductivityStore.clearWizardDraft(DRAFT_ID);
        toast.success(cc("toasts.planPublished"));
        await props.data.invalidateAll();
      } else {
        toast.success(cc("toasts.draftGraphCreated"));
        catalogExperienceObservability.recordWizardComplete();
      }
    } catch (e) {
      catalogExperienceObservability.recordPublication(false);
      toast.error(e instanceof Error ? e.message : cc("toasts.wizardFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlatformOpsSection
      title={cc("wizard.title")}
      description={cc("wizard.body")}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <PlatformOpsStatusBadge
          status="healthy"
          label={`${cc("wizard.stepLabel")} ${state.step + 1}/${WIZARD_STEP_KEYS.length}: ${cc(WIZARD_STEP_KEYS[state.step])}`}
        />
        <span className="text-sm text-muted-foreground">
          {cc("wizard.autosaved").replace("{percent}", String(progress))}
        </span>
      </div>
      <div
        className="mb-4 h-2 w-full rounded bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-2 rounded bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {state.step === 0 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label={cc("fields.planCode")}>
            <Input
              value={state.planCode}
              onChange={(e) => patch({ planCode: e.target.value })}
            />
          </CatalogField>
          <CatalogField label={cc("fields.planName")}>
            <Input
              value={state.planName}
              onChange={(e) => patch({ planName: e.target.value })}
            />
          </CatalogField>
          <CatalogField label={cc("fields.description")}>
            <Textarea
              value={state.planDescription}
              onChange={(e) => patch({ planDescription: e.target.value })}
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 1 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label={cc("fields.versionCode")}>
            <Input
              value={state.versionCode}
              onChange={(e) => patch({ versionCode: e.target.value })}
            />
          </CatalogField>
          <CatalogField label={cc("fields.versionName")}>
            <Input
              value={state.versionName}
              onChange={(e) => patch({ versionName: e.target.value })}
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 2 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label={cc("polish.monthlyUsd")}>
            <Input
              value={state.monthlyAmountUsd}
              onChange={(e) => patch({ monthlyAmountUsd: e.target.value })}
            />
          </CatalogField>
          <CatalogField label={cc("polish.yearlyUsd")}>
            <Input
              value={state.yearlyAmountUsd}
              onChange={(e) => patch({ yearlyAmountUsd: e.target.value })}
            />
          </CatalogField>
          <CatalogField label={cc("manage.currencyUsdOnly")}>
            <Input value={COMMERCIAL_CANONICAL_CURRENCY} readOnly disabled />
          </CatalogField>
          {savingsPercent != null ? (
            <p className="text-sm text-muted-foreground">
              {cc("polish.savings").replace("{percent}", String(savingsPercent))}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.step === 3 ? (
        <div className="max-w-lg space-y-3">
          <PlatformOpsAlert
            severity="info"
            title={cc("polish.billingBoth")}
            detail={`${state.monthlyAmountUsd} ${COMMERCIAL_CANONICAL_CURRENCY} / ${cc("intervalUnits.month")} · ${state.yearlyAmountUsd} ${COMMERCIAL_CANONICAL_CURRENCY} / ${cc("intervalUnits.year")}`}
          />
        </div>
      ) : null}

      {state.step === 4 ? (
        <div className="grid gap-3">
          <CatalogField label={cc("fields.bundleCode")}>
            <Input
              value={state.bundleCode}
              onChange={(e) => patch({ bundleCode: e.target.value })}
              placeholder={cc("placeholders.bundleCodeDefault").replace(
                "{code}",
                state.planCode
              )}
            />
          </CatalogField>
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded border p-2">
            {CATALOG_FEATURE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(state.features[key])}
                  onCheckedChange={(c) =>
                    patch({
                      features: { ...state.features, [key]: Boolean(c) },
                    })
                  }
                />
                {t(catalogFeatureNameKey(key))}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {state.step === 5 ? (
        <div className="grid gap-3 max-w-lg">
          {CATALOG_LIMIT_KEYS.map((key) => (
            <CatalogField
              key={key}
              label={resolveCatalogLabel(
                t,
                catalogLimitNameKey(key),
                cc("common.emDash")
              )}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  disabled={Boolean(state.unlimited[key])}
                  value={state.limits[key] ?? ""}
                  onChange={(e) =>
                    patch({
                      limits: { ...state.limits, [key]: e.target.value },
                    })
                  }
                />
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={Boolean(state.unlimited[key])}
                    onCheckedChange={(c) =>
                      patch({
                        unlimited: {
                          ...state.unlimited,
                          [key]: Boolean(c),
                        },
                      })
                    }
                  />
                  {cc("common.infinity")}
                </label>
              </div>
            </CatalogField>
          ))}
        </div>
      ) : null}

      {state.step === 6 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label={cc("fields.trialDays")}>
            <Input
              type="number"
              value={state.trialDays}
              onChange={(e) => patch({ trialDays: e.target.value })}
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 7 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label={cc("fields.country")}>
            <CatalogCountrySelect
              value={state.countryCode}
              onChange={({ countryCode, currency, countryName }) =>
                patch({
                  countryCode,
                  regionCurrency: currency,
                  regionName: countryName,
                })
              }
            />
          </CatalogField>
          <CatalogField label={cc("polish.currencyAuto")}>
            <Input value={state.regionCurrency} readOnly disabled />
          </CatalogField>
          <CatalogField label={cc("polish.regionalOverrideOptional")}>
            <Input
              value={state.regionalOverrideMonthly}
              onChange={(e) =>
                patch({ regionalOverrideMonthly: e.target.value })
              }
              placeholder={cc("common.emDash")}
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 8 ? (
        <div className="grid gap-3 max-w-lg">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={state.includePromo}
              onCheckedChange={(c) => patch({ includePromo: Boolean(c) })}
            />
            {cc("wizard.includePromotion")}
          </label>
          {state.includePromo ? (
            <>
              <CatalogField label={cc("fields.promoCode")}>
                <Input
                  value={state.promoCode}
                  onChange={(e) => patch({ promoCode: e.target.value })}
                />
              </CatalogField>
              <CatalogField label={cc("fields.effect")}>
                <Input
                  value={state.promoEffect}
                  onChange={(e) => patch({ promoEffect: e.target.value })}
                />
              </CatalogField>
            </>
          ) : null}
        </div>
      ) : null}

      {state.step === 9 ? (
        <div className="space-y-3 text-sm">
          <p className="font-medium">{cc("polish.summaryTitle")}</p>
          <p className="text-muted-foreground">{cc("polish.summaryReady")}</p>
          <p className="text-base font-semibold">{state.planName}</p>
          <div>
            <p className="text-muted-foreground">{cc("polish.summaryBilling")}</p>
            <p>
              {cc("polish.summaryCanonical")}: {state.monthlyAmountUsd}{" "}
              {COMMERCIAL_CANONICAL_CURRENCY} / {cc("intervalUnits.month")}
            </p>
            <p>
              {cc("polish.summaryCanonical")}: {state.yearlyAmountUsd}{" "}
              {COMMERCIAL_CANONICAL_CURRENCY} / {cc("intervalUnits.year")}
            </p>
            {savingsPercent != null ? (
              <p>{cc("polish.savings").replace("{percent}", String(savingsPercent))}</p>
            ) : null}
          </div>
          <div>
            <p className="text-muted-foreground">{cc("polish.summaryRegion")}</p>
            <p>
              {state.regionName || state.countryCode || cc("common.emDash")}
              {state.regionCurrency
                ? ` · ${state.regionCurrency}`
                : null}
            </p>
            {state.regionalOverrideMonthly.trim() ? (
              <p>
                {cc("polish.summaryLocal")}: {state.regionalOverrideMonthly}{" "}
                {state.regionCurrency} / {cc("intervalUnits.month")}
              </p>
            ) : null}
          </div>
          <p>
            {cc("wizard.reviewFeatures")}{" "}
            {cc("wizard.reviewFeaturesSelected").replace(
              "{count}",
              String(Object.values(state.features).filter(Boolean).length)
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {cc("polish.noTechnicalIds")}
          </p>
          <PlatformOpsAlert
            severity="info"
            title={cc("wizard.draftSaveTitle")}
            detail={cc("wizard.draftSaveDetail")}
          />
        </div>
      ) : null}

      {state.step === 10 ? (
        <div className="space-y-3">
          <PlatformOpsAlert
            severity="warning"
            title={cc("validation.publishRequiresCc16")}
            detail={cc("validation.publishRequiresCc16Detail")}
          />
          {publishIssues.length > 0 ? (
            <ul className="space-y-2">
              {publishIssues.map((a) => (
                <li
                  key={a.code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                >
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.description}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => props.onNavigate(a.navigateTo)}
                  >
                    {a.ctaLabel}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={state.step === 0 || busy}
          onClick={() => patch({ step: Math.max(0, state.step - 1) })}
        >
          {cc("wizard.back")}
        </Button>
        {state.step < 9 ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              patch({
                step: Math.min(WIZARD_STEP_KEYS.length - 1, state.step + 1),
              })
            }
          >
            {cc("wizard.next")}
          </Button>
        ) : null}
        {state.step === 9 ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void runCreatePipeline(false)}
            >
              {cc("actions.saveDraftGraph")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => patch({ step: 10 })}
            >
              {cc("actions.continueToPublish")}
            </Button>
          </>
        ) : null}
        {state.step === 10 ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void runCreatePipeline(true)}
          >
            {busy ? cc("actions.working") : cc("actions.validateAndPublish")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            catalogExperienceObservability.recordWizardAbandon();
            catalogProductivityStore.clearWizardDraft(DRAFT_ID);
            setState({ ...DEFAULT });
            toast.message(cc("toasts.wizardReset"));
          }}
        >
          {cc("wizard.reset")}
        </Button>
      </div>
    </PlatformOpsSection>
  );
}
