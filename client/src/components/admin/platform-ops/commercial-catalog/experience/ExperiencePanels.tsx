/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — live plan admin experience.
 */

import { useMemo, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useCatalogI18n } from "../useCatalogI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlatformOpsEmptyState,
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
} from "@/design-system/platform-ops-ui";
import type { CatalogManagementData } from "../useCatalogManagementData";
import { catalogExperienceObservability } from "./experienceObservability";
import { catalogProductivityStore } from "./productivityStore";
import { resolveSmartValidationActions } from "./smartValidation";
import type { ExperienceNavigate } from "./experienceNav";
import { CatalogField } from "../CatalogFormDialog";

export function ExperienceDashboard(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const health = props.data.healthQuery.data;
  const plans = props.data.plansQuery.data ?? [];
  return (
    <PlatformOpsSection
      title={cc("experience.dashboard.title")}
      description={cc("experience.dashboard.body")}
    >
      <PlatformOpsMetricGrid>
        <PlatformOpsMetricCard
          label={cc("metricPlans")}
          value={String(plans.length)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("manage.hiddenPlans")}
          value={String(health?.hiddenPlans ?? plans.filter((p) => p.isHidden).length)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("headers.prices")}
          value={String(health?.prices ?? props.data.pricesQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
      </PlatformOpsMetricGrid>
    </PlatformOpsSection>
  );
}

export function GlobalCatalogSearch(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc } = useCatalogI18n();
  const [q, setQ] = useState("");
  const plans = props.data.plansQuery.data ?? [];
  const hits = plans.filter((p) =>
    `${p.code} ${p.name}`.toLowerCase().includes(q.trim().toLowerCase())
  );
  return (
    <PlatformOpsSection title={cc("experience.search.title")}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 space-y-2">
        {hits.map((p) => (
          <button
            key={p.id}
            type="button"
            className="block w-full rounded border px-3 py-2 text-start text-sm"
            onClick={() => props.onNavigate("plans")}
          >
            {p.name} <span className="font-mono text-xs">({p.code})</span>
          </button>
        ))}
      </div>
    </PlatformOpsSection>
  );
}

export function VersionComparePanel(_props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  return (
    <PlatformOpsSection title={cc("experience.compare.title")}>
      <p className="text-sm text-muted-foreground">
        {cc("experience.livePlans.noVersionCompare")}
      </p>
    </PlatformOpsSection>
  );
}

export function PricingPreviewPanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const plans = props.data.plansQuery.data ?? [];
  const prices = props.data.pricesQuery.data ?? [];
  return (
    <PlatformOpsSection title={cc("experience.preview.title")}>
      {plans.length === 0 ? (
        <PlatformOpsEmptyState title={cc("manage.noPlans")} />
      ) : (
        <ul className="space-y-2 text-sm">
          {plans.map((p) => {
            const amount = prices.find((x) => x.planId === p.id)?.amount ?? "—";
            return (
              <li key={p.id}>
                {p.name} ({p.code}): {amount}
              </li>
            );
          })}
        </ul>
      )}
    </PlatformOpsSection>
  );
}

export function CustomerPreviewPanel(props: { data: CatalogManagementData }) {
  return <PricingPreviewPanel data={props.data} />;
}

export function DependencyGraphPanel(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc } = useCatalogI18n();
  const plans = props.data.plansQuery.data ?? [];
  return (
    <PlatformOpsSection title={cc("experience.graph.title")}>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {plans.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => props.onNavigate("plans")}>
              {p.name}
            </button>
          </li>
        ))}
      </ul>
    </PlatformOpsSection>
  );
}

export function CommercialTimelinePanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const plans = props.data.plansQuery.data ?? [];
  return (
    <PlatformOpsSection title={cc("experience.timeline.title")}>
      <ul className="space-y-2 text-sm">
        {plans.map((p) => (
          <li key={p.id}>
            {p.name} · {p.updatedAt}
          </li>
        ))}
      </ul>
    </PlatformOpsSection>
  );
}

export function BulkOperationsPanel(_props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  return (
    <PlatformOpsSection title={cc("experience.bulk.title")}>
      <p className="text-sm text-muted-foreground">
        {cc("experience.livePlans.editIndividually")}
      </p>
    </PlatformOpsSection>
  );
}

export function DeepClonePanel(_props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  return (
    <PlatformOpsSection title={cc("experience.clone.title")}>
      <p className="text-sm text-muted-foreground">
        {cc("experience.livePlans.noVersionClone")}
      </p>
    </PlatformOpsSection>
  );
}

export function PublicationDiffPanel(_props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  return (
    <PlatformOpsSection title={cc("experience.diff.title")}>
      <p className="text-sm text-muted-foreground">
        {cc("experience.livePlans.noPublicationDiff")}
      </p>
    </PlatformOpsSection>
  );
}

export function SmartValidationEnhancer(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc, t } = useCatalogI18n();
  const [planId, setPlanId] = useState("");
  const validation = trpc.commercialCatalog.validatePlanSave.useQuery(
    { planId },
    { enabled: Boolean(planId) }
  );
  const actions = useMemo(
    () =>
      resolveSmartValidationActions(validation.data?.issues ?? [], (key) =>
        t(`admin.platformOps.commercialCatalog.${key}`)
      ),
    [validation.data, t]
  );
  return (
    <PlatformOpsSection title={cc("experience.validation.title")}>
      <CatalogField label={cc("fields.plan")}>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder={cc("placeholders.selectPlan")} />
          </SelectTrigger>
          <SelectContent>
            {(props.data.plansQuery.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogField>
      {validation.data ? (
        <div className="mt-3 space-y-2">
          <PlatformOpsStatusBadge
            status={validation.data.ok ? "healthy" : "degraded"}
            label={
              validation.data.ok
                ? cc("manage.readyToSave")
                : cc("manage.notReady")
            }
          />
          {actions.map((a) => (
            <Button
              key={a.code}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => props.onNavigate(a.navigateTo)}
            >
              {a.title}
            </Button>
          ))}
        </div>
      ) : null}
    </PlatformOpsSection>
  );
}

export function useCatalogExperienceShortcuts(handlers: {
  onSearch: () => void;
  onWizard: () => void;
  onDashboard: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          handlers.onSearch();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}

export function ProductivityRail(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const recent = catalogProductivityStore.get().recentEntityIds;
  const metrics = catalogExperienceObservability.snapshot();
  return (
    <aside className="space-y-3 rounded-lg border p-3 text-sm">
      <p className="font-medium">{cc("experience.rail.title")}</p>
      <p className="text-muted-foreground">
        {cc("metricPlans")}: {props.data.plansQuery.data?.length ?? 0}
      </p>
      <p className="text-muted-foreground">
        {cc("experience.rail.recent")}: {recent.length}
      </p>
      <p className="text-xs text-muted-foreground">
        {metrics.wizardCompletions} {cc("experience.rail.wizardCompletions")}
      </p>
    </aside>
  );
}
