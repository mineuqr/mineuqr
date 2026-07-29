/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — Plan Creation Wizard.
 * Orchestrates existing commercialCatalog mutations; never bypasses CC-16.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { CatalogManagementData } from "../useCatalogManagementData";
import { catalogExperienceObservability } from "./experienceObservability";
import { catalogProductivityStore } from "./productivityStore";
import { toSmartValidationActions } from "./smartValidation";
import type { ExperienceNavigate } from "./experienceNav";

const STEPS = [
  "Plan information",
  "Plan Version",
  "Pricing",
  "Billing Cycle",
  "Feature Bundle",
  "Limit Profile",
  "Trial Policy",
  "Regional Policy",
  "Promotion (optional)",
  "Review",
  "Publish",
] as const;

const DRAFT_ID = "plan-wizard-default";

type WizardState = {
  step: number;
  planCode: string;
  planName: string;
  planDescription: string;
  versionCode: string;
  versionName: string;
  amount: string;
  currency: string;
  cycleCode: string;
  cycleName: string;
  intervalCount: string;
  intervalUnit: "month" | "year" | "week" | "day";
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
  amount: "99.00",
  currency: "SAR",
  cycleCode: "monthly",
  cycleName: "Monthly",
  intervalCount: "1",
  intervalUnit: "month",
  bundleCode: "",
  bundleName: "",
  features: Object.fromEntries(CATALOG_FEATURE_KEYS.map((k) => [k, false])),
  limitCode: "",
  limitName: "",
  limits: { restaurants: "1", items: "100", categories: "10" },
  unlimited: {},
  trialCode: "",
  trialName: "",
  trialDays: "14",
  regionCode: "",
  regionName: "",
  countryCode: "SA",
  regionCurrency: "SAR",
  promoCode: "",
  promoName: "",
  promoEffect: "",
  includePromo: false,
  migrationCode: "",
  migrationName: "",
  retirementCode: "",
  retirementName: "",
};

export function PlanCreationWizard(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const [state, setState] = useState<WizardState>(() => {
    const draft = catalogProductivityStore.get().wizardDrafts[DRAFT_ID];
    return draft ? { ...DEFAULT, ...(draft as WizardState) } : { ...DEFAULT };
  });
  const [busy, setBusy] = useState(false);
  const [publishIssues, setPublishIssues] = useState<
    ReturnType<typeof toSmartValidationActions>
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
    () => Math.round(((state.step + 1) / STEPS.length) * 100),
    [state.step]
  );

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

      const cycle = await createCycle.mutateAsync({
        code: `${state.cycleCode}-${Date.now().toString(36).slice(-4)}`,
        name: state.cycleName,
        intervalCount: Number(state.intervalCount) || 1,
        intervalUnit: state.intervalUnit,
      });

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
          effectSummary: state.promoEffect || "Promotion",
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
        billingCycleId: cycle.id,
        currency: state.currency,
        amount: state.amount,
        regionId: region.id,
      });

      patch({ createdPlanId: plan.id, createdVersionId: version.id });
      await props.data.invalidateAll();

      if (publishAtEnd) {
        const validation = await utils.commercialCatalog.validatePublication.fetch({
          versionId: version.id,
        });
        if (!validation.ok) {
          catalogExperienceObservability.recordValidationFailure();
          setPublishIssues(toSmartValidationActions(validation.issues));
          toast.error("Validation blocked publish — fix issues below");
          patch({ step: 10 });
          return;
        }
        catalogExperienceObservability.recordPublication(true);
        await publish.mutateAsync({ versionId: version.id });
        catalogExperienceObservability.recordPublishDuration(Date.now() - started);
        catalogExperienceObservability.recordWizardComplete();
        catalogProductivityStore.clearWizardDraft(DRAFT_ID);
        toast.success("Plan published");
        await props.data.invalidateAll();
      } else {
        toast.success("Draft catalog graph created");
        catalogExperienceObservability.recordWizardComplete();
      }
    } catch (e) {
      catalogExperienceObservability.recordPublication(false);
      toast.error(e instanceof Error ? e.message : "Wizard failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlatformOpsSection
      title="Plan Creation Wizard"
      description="Guided draft → review → CC-16 publish. Autosaves locally. Always runs validation before publish."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <PlatformOpsStatusBadge
          status="healthy"
          label={`Step ${state.step + 1}/${STEPS.length}: ${STEPS[state.step]}`}
        />
        <span className="text-sm text-muted-foreground">{progress}% · autosaved</span>
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
          <CatalogField label="Plan code">
            <Input
              value={state.planCode}
              onChange={(e) => patch({ planCode: e.target.value })}
            />
          </CatalogField>
          <CatalogField label="Plan name">
            <Input
              value={state.planName}
              onChange={(e) => patch({ planName: e.target.value })}
            />
          </CatalogField>
          <CatalogField label="Description">
            <Textarea
              value={state.planDescription}
              onChange={(e) => patch({ planDescription: e.target.value })}
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 1 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label="Version code">
            <Input
              value={state.versionCode}
              onChange={(e) => patch({ versionCode: e.target.value })}
            />
          </CatalogField>
          <CatalogField label="Version name">
            <Input
              value={state.versionName}
              onChange={(e) => patch({ versionName: e.target.value })}
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 2 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label="Amount">
            <Input
              value={state.amount}
              onChange={(e) => patch({ amount: e.target.value })}
            />
          </CatalogField>
          <CatalogField label="Currency">
            <Input
              value={state.currency}
              onChange={(e) =>
                patch({ currency: e.target.value.toUpperCase() })
              }
            />
          </CatalogField>
        </div>
      ) : null}

      {state.step === 3 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label="Cycle code">
            <Input
              value={state.cycleCode}
              onChange={(e) => patch({ cycleCode: e.target.value })}
            />
          </CatalogField>
          <CatalogField label="Cycle name">
            <Input
              value={state.cycleName}
              onChange={(e) => patch({ cycleName: e.target.value })}
            />
          </CatalogField>
          <CatalogField label="Interval unit">
            <Select
              value={state.intervalUnit}
              onValueChange={(v) =>
                patch({
                  intervalUnit: v as WizardState["intervalUnit"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </CatalogField>
        </div>
      ) : null}

      {state.step === 4 ? (
        <div className="grid gap-3">
          <CatalogField label="Bundle code">
            <Input
              value={state.bundleCode}
              onChange={(e) => patch({ bundleCode: e.target.value })}
              placeholder={`${state.planCode}-bundle`}
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
                {key}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {state.step === 5 ? (
        <div className="grid gap-3 max-w-lg">
          {CATALOG_LIMIT_KEYS.map((key) => (
            <CatalogField key={key} label={key}>
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
                  ∞
                </label>
              </div>
            </CatalogField>
          ))}
        </div>
      ) : null}

      {state.step === 6 ? (
        <div className="grid gap-3 max-w-lg">
          <CatalogField label="Trial days">
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
          <CatalogField label="Country">
            <Input
              value={state.countryCode}
              onChange={(e) =>
                patch({ countryCode: e.target.value.toUpperCase() })
              }
            />
          </CatalogField>
          <CatalogField label="Currency">
            <Input
              value={state.regionCurrency}
              onChange={(e) =>
                patch({ regionCurrency: e.target.value.toUpperCase() })
              }
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
            Include promotion (optional)
          </label>
          {state.includePromo ? (
            <>
              <CatalogField label="Promo code">
                <Input
                  value={state.promoCode}
                  onChange={(e) => patch({ promoCode: e.target.value })}
                />
              </CatalogField>
              <CatalogField label="Effect">
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
        <div className="space-y-2 text-sm">
          <p>
            <strong>Plan:</strong> {state.planName} ({state.planCode})
          </p>
          <p>
            <strong>Version:</strong> {state.versionName} ({state.versionCode})
          </p>
          <p>
            <strong>Price:</strong> {state.amount} {state.currency} /{" "}
            {state.cycleName}
          </p>
          <p>
            <strong>Features:</strong>{" "}
            {Object.values(state.features).filter(Boolean).length} selected
          </p>
          <p>
            <strong>Region:</strong> {state.countryCode} / {state.regionCurrency}
          </p>
          <PlatformOpsAlert
            severity="info"
            title="Draft save available"
            detail="Create draft graph without publishing, or continue to Publish step."
          />
        </div>
      ) : null}

      {state.step === 10 ? (
        <div className="space-y-3">
          <PlatformOpsAlert
            severity="warning"
            title="Publish requires CC-16"
            detail="Wizard will validate before publish. Failures navigate to the missing module."
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
          Back
        </Button>
        {state.step < 9 ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              patch({ step: Math.min(STEPS.length - 1, state.step + 1) })
            }
          >
            Next
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
              Save Draft Graph
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => patch({ step: 10 })}
            >
              Continue to Publish
            </Button>
          </>
        ) : null}
        {state.step === 10 ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void runCreatePipeline(true)}
          >
            {busy ? "Working…" : "Validate & Publish"}
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
            toast.message("Wizard reset");
          }}
        >
          Reset
        </Button>
      </div>
    </PlatformOpsSection>
  );
}
