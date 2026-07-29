/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — experience panels (compare, preview, graph, etc.).
 */

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCatalogI18n } from "../useCatalogI18n";
import { AdminLocalizedPricePreview } from "@/components/commercial/AdminLocalizedPricePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  PlatformOpsEmptyState,
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PlatformOpsTable,
  PlatformOpsTableBody,
  PlatformOpsTableCell,
  PlatformOpsTableHead,
  PlatformOpsTableHeader,
  PlatformOpsTableRow,
} from "@/design-system/platform-ops-ui";
import { SemanticConfirmDialog } from "@/design-system/semantic-confirm-dialog";
import type { CatalogManagementData } from "../useCatalogManagementData";
import { catalogExperienceObservability } from "./experienceObservability";
import { catalogProductivityStore } from "./productivityStore";
import {
  resolveSmartValidationActions,
  uniqueSlug,
} from "./smartValidation";
import {
  diffFeatureSets,
  diffLimitMaps,
  diffScalar,
  summarizeDiffs,
  type FieldDiff,
} from "./versionCompare";
import {
  analyzeNodeImpact,
  buildVersionDependencyGraph,
} from "./dependencyGraph";
import type { ExperienceNavigate } from "./experienceNav";
import { catalogManagementUiObservability } from "../catalogManagementObservability";
import {
  catalogFeatureNameKey,
  catalogLimitNameKey,
  resolveCatalogLabel,
} from "../catalogCommercialDisplay";

function diffKindLabel(cc: (key: string) => string, kind: FieldDiff["kind"]) {
  const map: Record<FieldDiff["kind"], string> = {
    added: "states.diffAdded",
    removed: "states.diffRemoved",
    modified: "states.diffModified",
    unchanged: "states.diffUnchanged",
  };
  return cc(map[kind]);
}

function DiffList({ diffs }: { diffs: FieldDiff[] }) {
  const { cc } = useCatalogI18n();
  const meaningful = diffs.filter((d) => d.kind !== "unchanged");
  if (meaningful.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {cc("experience.compare.noDifferences")}
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {meaningful.map((d) => (
        <li key={d.field} className="flex flex-wrap gap-2">
          <PlatformOpsStatusBadge
            status={
              d.kind === "added"
                ? "healthy"
                : d.kind === "removed"
                  ? "unavailable"
                  : "warning"
            }
            label={diffKindLabel(cc, d.kind)}
          />
          <span className="font-mono text-xs">{d.field}</span>
          <span className="text-muted-foreground">
            {d.left} → {d.right}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ExperienceDashboard(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const health = props.data.healthQuery.data;
  const metrics = catalogExperienceObservability.snapshot();
  const mgmt = catalogManagementUiObservability.snapshot();
  const versions = props.data.versionsQuery.data ?? [];
  const recentPublished = versions
    .filter((v) => v.state === "published")
    .slice(0, 5);
  const drafts = versions.filter((v) => v.state === "draft").length;

  return (
    <PlatformOpsSection
      title={cc("experience.dashboard.title")}
      description={cc("experience.dashboard.body")}
    >
      <PlatformOpsMetricGrid>
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.catalogHealth")}
          value={health?.status ?? cc("common.unknown")}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.published")}
          value={String(health?.versions.published ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.draftGrowth")}
          value={String(drafts)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.validationErrors")}
          value={String(health?.validationErrors ?? 0)}
          tone={(health?.validationErrors ?? 0) > 0 ? "amber" : "info"}
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.wizardCompletion")}
          value={`${Math.round(metrics.wizardCompletionRate * 100)}%`}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.publishSuccess")}
          value={`${Math.round(metrics.publicationSuccessRate * 100)}%`}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.avgPublishMs")}
          value={String(Math.round(metrics.averagePublishDurationMs))}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.regionalCoverage")}
          value={String(props.data.regionsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.bundleUsage")}
          value={String(props.data.bundlesQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.pricingRows")}
          value={String(props.data.pricesQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.cloneComparePreview")}
          value={`${metrics.cloneCount}/${metrics.compareCount}/${metrics.previewCount}`}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("experience.dashboard.crudSuccess")}
          value={`${Math.round(mgmt.crudSuccessRate * 100)}%`}
          tone="info"
          domain="information"
        />
      </PlatformOpsMetricGrid>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">
            {cc("experience.dashboard.recentPublications")}
          </h3>
          {recentPublished.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {cc("experience.dashboard.noneYet")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {recentPublished.map((v) => (
                <li key={v.id}>
                  {v.versionName}{" "}
                  <span className="text-muted-foreground">{v.publishedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium">
            {cc("experience.dashboard.pinnedPlans")}
          </h3>
          <ul className="space-y-1 text-sm">
            {catalogProductivityStore.get().pinnedPlans.length === 0 ? (
              <li className="text-muted-foreground">
                {cc("experience.dashboard.pinFromManage")}
              </li>
            ) : (
              catalogProductivityStore.get().pinnedPlans.map((id) => {
                const plan = (props.data.plansQuery.data ?? []).find(
                  (p) => p.id === id
                );
                return (
                  <li key={id}>{plan?.name ?? id.slice(0, 8)}</li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </PlatformOpsSection>
  );
}

export function GlobalCatalogSearch(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc } = useCatalogI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [savedName, setSavedName] = useState("");
  const [, bump] = useState(0);

  useEffect(() => {
    if (query.trim()) catalogExperienceObservability.recordSearch();
  }, [query]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Array<{
      kind: string;
      id: string;
      title: string;
      subtitle: string;
      section: Parameters<ExperienceNavigate>[0];
    }> = [];
    for (const p of props.data.plansQuery.data ?? []) {
      if (!q || `${p.code} ${p.name}`.toLowerCase().includes(q)) {
        rows.push({
          kind: cc("experience.search.kindPlan"),
          id: p.id,
          title: p.name,
          subtitle: p.code,
          section: "plans",
        });
      }
    }
    for (const v of props.data.versionsQuery.data ?? []) {
      if (status !== "all" && v.state !== status) continue;
      if (
        !q ||
        `${v.versionCode} ${v.versionName} ${v.state}`.toLowerCase().includes(q)
      ) {
        rows.push({
          kind: cc("experience.search.kindVersion"),
          id: v.id,
          title: v.versionName,
          subtitle: `${v.versionCode} · ${v.state}`,
          section: "plan_versions",
        });
      }
    }
    for (const b of props.data.bundlesQuery.data ?? []) {
      if (!q || `${b.code} ${b.name}`.toLowerCase().includes(q)) {
        rows.push({
          kind: cc("experience.search.kindBundle"),
          id: b.id,
          title: b.name,
          subtitle: b.code,
          section: "feature_bundles",
        });
      }
    }
    for (const p of props.data.promotionsQuery.data ?? []) {
      if (!q || `${p.code} ${p.name}`.toLowerCase().includes(q)) {
        rows.push({
          kind: cc("experience.search.kindPromotion"),
          id: p.id,
          title: p.name,
          subtitle: p.code,
          section: "promotions",
        });
      }
    }
    for (const p of props.data.pricesQuery.data ?? []) {
      if (!q || `${p.amount} ${p.currency}`.toLowerCase().includes(q)) {
        rows.push({
          kind: cc("experience.search.kindPrice"),
          id: p.id,
          title: `${p.amount} ${p.currency}`,
          subtitle: p.planVersionId.slice(0, 8),
          section: "pricing",
        });
      }
    }
    return rows.slice(0, 80);
  }, [props.data, query, status, cc]);

  // Lightweight virtualization: window first N with scroll container
  const [windowStart, setWindowStart] = useState(0);
  const pageSize = 20;
  const visible = hits.slice(windowStart, windowStart + pageSize);

  return (
    <PlatformOpsSection
      title={cc("experience.search.title")}
      description={cc("experience.search.body")}
    >
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-md"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setWindowStart(0);
          }}
          placeholder={cc("placeholders.searchCatalog")}
          aria-label={cc("a11y.globalSearch")}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={cc("placeholders.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{cc("states.allStates")}</SelectItem>
            <SelectItem value="draft">{cc("states.draft")}</SelectItem>
            <SelectItem value="published">{cc("states.published")}</SelectItem>
            <SelectItem value="deprecated">{cc("states.deprecated")}</SelectItem>
            <SelectItem value="retired">{cc("states.retired")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="w-40"
          placeholder={cc("placeholders.filterName")}
          value={savedName}
          onChange={(e) => setSavedName(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (!savedName.trim()) return;
            catalogProductivityStore.saveFilter(savedName, query, status);
            setSavedName("");
            bump((n) => n + 1);
            toast.success(cc("toasts.filterSaved"));
          }}
        >
          {cc("actions.saveFilter")}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {catalogProductivityStore.get().savedFilters.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setQuery(f.query);
              setStatus(f.status ?? "all");
            }}
          >
            {f.name}
          </Button>
        ))}
      </div>
      <div
        className="mt-4 max-h-96 overflow-auto rounded border"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
            setWindowStart((s) =>
              Math.min(s + pageSize, Math.max(0, hits.length - pageSize))
            );
          }
        }}
      >
        {visible.length === 0 ? (
          <PlatformOpsEmptyState
            title={cc("experience.search.noMatches")}
            description={cc("experience.search.noMatchesBody")}
          />
        ) : (
          <PlatformOpsTable>
            <PlatformOpsTableHeader>
              <PlatformOpsTableRow>
                <PlatformOpsTableHead>{cc("headers.kind")}</PlatformOpsTableHead>
                <PlatformOpsTableHead>{cc("headers.title")}</PlatformOpsTableHead>
                <PlatformOpsTableHead>{cc("headers.detail")}</PlatformOpsTableHead>
                <PlatformOpsTableHead>{cc("headers.open")}</PlatformOpsTableHead>
              </PlatformOpsTableRow>
            </PlatformOpsTableHeader>
            <PlatformOpsTableBody>
              {visible.map((h) => (
                <PlatformOpsTableRow key={`${h.kind}-${h.id}`}>
                  <PlatformOpsTableCell>{h.kind}</PlatformOpsTableCell>
                  <PlatformOpsTableCell>{h.title}</PlatformOpsTableCell>
                  <PlatformOpsTableCell className="text-xs text-muted-foreground">
                    {h.subtitle}
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        catalogProductivityStore.touchRecent(h.id);
                        props.onNavigate(h.section);
                      }}
                    >
                      {cc("actions.open")}
                    </Button>
                  </PlatformOpsTableCell>
                </PlatformOpsTableRow>
              ))}
            </PlatformOpsTableBody>
          </PlatformOpsTable>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {cc("experience.search.showingWindow")
          .replace("{visible}", String(visible.length))
          .replace("{total}", String(hits.length))}
      </p>
    </PlatformOpsSection>
  );
}

export function VersionComparePanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const versions = props.data.versionsQuery.data ?? [];

  const left = versions.find((v) => v.id === leftId);
  const right = versions.find((v) => v.id === rightId);

  useEffect(() => {
    if (leftId && rightId) catalogExperienceObservability.recordCompare();
  }, [leftId, rightId]);

  const leftVal = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId: leftId },
    { enabled: Boolean(leftId) }
  );
  const rightVal = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId: rightId },
    { enabled: Boolean(rightId) }
  );

  const compare = useMemo(() => {
    if (!left || !right) return null;
    const leftPrices = (props.data.pricesQuery.data ?? []).filter(
      (p) => p.planVersionId === left.id
    );
    const rightPrices = (props.data.pricesQuery.data ?? []).filter(
      (p) => p.planVersionId === right.id
    );
    const leftBundle = (props.data.bundlesQuery.data ?? []).find(
      (b) => b.id === left.featureBundleId
    );
    const rightBundle = (props.data.bundlesQuery.data ?? []).find(
      (b) => b.id === right.featureBundleId
    );
    const leftLimits = (props.data.limitsQuery.data ?? []).find(
      (l) => l.id === left.limitProfileId
    );
    const rightLimits = (props.data.limitsQuery.data ?? []).find(
      (l) => l.id === right.limitProfileId
    );
    const lf = (leftBundle?.features ?? [])
      .filter((f) => f.included)
      .map((f) => f.featureKey);
    const rf = (rightBundle?.features ?? [])
      .filter((f) => f.included)
      .map((f) => f.featureKey);
    const lm: Record<string, number | null> = {};
    const rm: Record<string, number | null> = {};
    for (const v of leftLimits?.values ?? []) lm[v.limitKey] = v.value;
    for (const v of rightLimits?.values ?? []) rm[v.limitKey] = v.value;

    return {
      pricing: [
        diffScalar(
          "priceCount",
          leftPrices.length,
          rightPrices.length
        ),
        diffScalar(
          "firstAmount",
          leftPrices[0]?.amount,
          rightPrices[0]?.amount
        ),
      ],
      billing: [
        diffScalar(
          "billingCycleId",
          leftPrices[0]?.billingCycleId,
          rightPrices[0]?.billingCycleId
        ),
      ],
      features: diffFeatureSets(lf, rf),
      limits: diffLimitMaps(lm, rm),
      trial: [
        diffScalar("trialPolicyId", left.trialPolicyId, right.trialPolicyId),
      ],
      regional: [
        diffScalar(
          "regionalPrice",
          leftPrices.some((p) => p.regionId),
          rightPrices.some((p) => p.regionId)
        ),
      ],
      promotions: [diffScalar("note", "n/a", "n/a")],
      migration: [
        diffScalar(
          "migrationPolicyId",
          left.migrationPolicyId,
          right.migrationPolicyId
        ),
      ],
      retirement: [
        diffScalar(
          "retirementPolicyId",
          left.retirementPolicyId,
          right.retirementPolicyId
        ),
      ],
    };
  }, [left, right, props.data]);

  return (
    <PlatformOpsSection
      title={cc("experience.compare.title")}
      description={cc("experience.compare.body")}
    >
      <div className="flex flex-wrap gap-2">
        <Select value={leftId} onValueChange={setLeftId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={cc("placeholders.leftVersion")} />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName} ({v.state})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rightId} onValueChange={setRightId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={cc("placeholders.rightVersion")} />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName} ({v.state})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {compare ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <PlatformOpsStatusBadge
              status={leftVal.data?.ok ? "healthy" : "warning"}
              label={cc("experience.compare.leftReady").replace(
                "{ready}",
                leftVal.data?.ok ? cc("common.yes") : cc("common.no")
              )}
            />
            <PlatformOpsStatusBadge
              status={rightVal.data?.ok ? "healthy" : "warning"}
              label={cc("experience.compare.rightReady").replace(
                "{ready}",
                rightVal.data?.ok ? cc("common.yes") : cc("common.no")
              )}
            />
            <span className="text-xs text-muted-foreground">
              {cc("experience.compare.featuresSummary").replace(
                "{summary}",
                JSON.stringify(summarizeDiffs(compare.features))
              )}
            </span>
          </div>
          {(
            [
              ["experience.compare.pricing", compare.pricing],
              ["experience.compare.billing", compare.billing],
              ["experience.compare.features", compare.features],
              ["experience.compare.limits", compare.limits],
              ["experience.compare.trial", compare.trial],
              ["experience.compare.regional", compare.regional],
              ["experience.compare.migration", compare.migration],
              ["experience.compare.retirement", compare.retirement],
            ] as const
          ).map(([titleKey, diffs]) => (
            <div key={titleKey}>
              <h3 className="mb-1 text-sm font-medium">{cc(titleKey)}</h3>
              <DiffList diffs={diffs} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {cc("experience.compare.selectTwo")}
        </p>
      )}
    </PlatformOpsSection>
  );
}

export function PricingPreviewPanel(props: { data: CatalogManagementData }) {
  const { cc, t, language } = useCatalogI18n();
  const [versionId, setVersionId] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const version = (props.data.versionsQuery.data ?? []).find(
    (v) => v.id === versionId
  );
  const plan = (props.data.plansQuery.data ?? []).find(
    (p) => p.id === version?.planId
  );
  const prices = (props.data.pricesQuery.data ?? []).filter(
    (p) => p.planVersionId === versionId
  );
  const bundle = (props.data.bundlesQuery.data ?? []).find(
    (b) => b.id === version?.featureBundleId
  );
  const limits = (props.data.limitsQuery.data ?? []).find(
    (l) => l.id === version?.limitProfileId
  );
  const trial = (props.data.trialsQuery.data ?? []).find(
    (t) => t.id === version?.trialPolicyId
  );
  const regions = (props.data.regionsQuery.data ?? []).map((r) => ({
    id: r.id,
    countryCode: r.countryCode,
    currency: r.currency,
  }));
  const priceRows = prices.map((p) => ({
    amount: p.amount,
    currency: p.currency,
    regionId: p.regionId,
  }));
  const monthlyCycleIds = (props.data.cyclesQuery.data ?? [])
    .filter(
      (c) =>
        c.intervalUnit === "month" || c.code.toLowerCase().includes("month")
    )
    .map((c) => c.id);
  const yearlyCycleIds = (props.data.cyclesQuery.data ?? [])
    .filter(
      (c) =>
        c.intervalUnit === "year" || c.code.toLowerCase().includes("year")
    )
    .map((c) => c.id);

  useEffect(() => {
    if (versionId) catalogExperienceObservability.recordPreview();
  }, [versionId]);

  return (
    <PlatformOpsSection
      title={cc("preview.pricingTitle")}
      description={cc("preview.pricingBody")}
    >
      <div className="flex flex-wrap gap-2">
        <Select value={versionId} onValueChange={setVersionId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder={cc("preview.selectVersion")} />
          </SelectTrigger>
          <SelectContent>
            {(props.data.versionsQuery.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName} ({v.state})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded border p-1">
          <Button
            type="button"
            size="sm"
            variant={cycle === "monthly" ? "default" : "ghost"}
            onClick={() => setCycle("monthly")}
          >
            {cc("preview.monthly")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={cycle === "yearly" ? "default" : "ghost"}
            onClick={() => setCycle("yearly")}
          >
            {cc("preview.yearly")}
          </Button>
        </div>
      </div>
      {version && plan ? (
        <div className="mt-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <PlatformOpsStatusBadge
                  status={version.state === "published" ? "healthy" : "warning"}
                  label={version.state}
                />
              </div>
              <AdminLocalizedPricePreview
                prices={priceRows}
                regions={regions}
                priceCycleHints={prices.map((p) => ({
                  billingCycleId: p.billingCycleId,
                }))}
                monthlyBillingCycleIds={monthlyCycleIds}
                yearlyBillingCycleIds={yearlyCycleIds}
              />
              {trial ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {trial.durationDays}
                </p>
              ) : null}
              <ul className="mt-4 space-y-1 text-sm">
                {(bundle?.features ?? [])
                  .filter((f) => f.included)
                  .slice(0, 8)
                  .map((f) => (
                    <li key={f.featureKey}>
                      ✓{" "}
                      {resolveCatalogLabel(
                        t,
                        catalogFeatureNameKey(f.featureKey),
                        f.featureKey
                      )}
                    </li>
                  ))}
              </ul>
              <div className="mt-4 text-xs text-muted-foreground">
                {(limits?.values ?? [])
                  .map(
                    (v) =>
                      `${resolveCatalogLabel(t, catalogLimitNameKey(v.limitKey), v.limitKey)}=${v.value ?? cc("common.infinity")}`
                  )
                  .join(", ") || cc("common.emDash")}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {cc("preview.selectToPreview")}
        </p>
      )}
    </PlatformOpsSection>
  );
}

export function CustomerPreviewPanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const [versionId, setVersionId] = useState("");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [regionId, setRegionId] = useState("");
  const width =
    device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";

  useEffect(() => {
    if (versionId) catalogExperienceObservability.recordPreview();
  }, [versionId, device]);

  const version = (props.data.versionsQuery.data ?? []).find(
    (v) => v.id === versionId
  );
  const plan = (props.data.plansQuery.data ?? []).find(
    (p) => p.id === version?.planId
  );
  const price = (props.data.pricesQuery.data ?? []).find(
    (p) =>
      p.planVersionId === versionId &&
      (!regionId || p.regionId === regionId || !p.regionId)
  );
  const region = (props.data.regionsQuery.data ?? []).find(
    (r) => r.id === regionId
  );

  return (
    <PlatformOpsSection
      title={cc("experience.customerPreview.title")}
      description={cc("experience.customerPreview.body")}
    >
      <div className="flex flex-wrap gap-2">
        <Select value={versionId} onValueChange={setVersionId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={cc("placeholders.version")} />
          </SelectTrigger>
          <SelectContent>
            {(props.data.versionsQuery.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(["desktop", "tablet", "mobile"] as const).map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={device === d ? "default" : "outline"}
            onClick={() => setDevice(d)}
          >
            {cc(
              d === "desktop"
                ? "experience.customerPreview.deviceDesktop"
                : d === "tablet"
                  ? "experience.customerPreview.deviceTablet"
                  : "experience.customerPreview.deviceMobile"
            )}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={cycle === "monthly" ? "default" : "outline"}
          onClick={() => setCycle("monthly")}
        >
          {cc("experience.customerPreview.monthly")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={cycle === "yearly" ? "default" : "outline"}
          onClick={() => setCycle("yearly")}
        >
          {cc("experience.customerPreview.annual")}
        </Button>
        <Select
          value={regionId || "__none"}
          onValueChange={(v) => setRegionId(v === "__none" ? "" : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={cc("placeholders.region")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">{cc("common.default")}</SelectItem>
            {(props.data.regionsQuery.data ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} ({r.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 flex justify-center bg-muted/40 p-4">
        <div
          className="rounded-xl border bg-background p-6 shadow transition-[width]"
          style={{ width, maxWidth: "100%" }}
          data-device={device}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {cc("experience.customerPreview.previewBanner")
              .replace(
                "{cycle}",
                cycle === "monthly"
                  ? cc("experience.customerPreview.monthly")
                  : cc("experience.customerPreview.annual")
              )
              .replace(
                "{currencyInfo}",
                region
                  ? `${region.currency} · tax ${region.taxPolicyRef ?? cc("experience.customerPreview.taxDefault")}`
                  : cc("experience.customerPreview.defaultCurrency")
              )}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {plan?.name ?? cc("experience.customerPreview.selectVersion")}
          </h2>
          <p className="mt-1 text-3xl font-bold">
            {price?.amount ?? cc("common.emDash")}{" "}
            {price?.currency ?? region?.currency ?? ""}
          </p>
          <Button type="button" className="mt-4 w-full" disabled>
            {cc("experience.customerPreview.continuePreviewOnly")}
          </Button>
        </div>
      </div>
    </PlatformOpsSection>
  );
}

export function DependencyGraphPanel(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc, t } = useCatalogI18n();
  const [versionId, setVersionId] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const version = (props.data.versionsQuery.data ?? []).find(
    (v) => v.id === versionId
  );
  const plan = (props.data.plansQuery.data ?? []).find(
    (p) => p.id === version?.planId
  );
  const validation = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId },
    { enabled: Boolean(versionId) && version?.state === "draft" }
  );

  const graph = useMemo(() => {
    if (!version || !plan) return null;
    const prices = (props.data.pricesQuery.data ?? []).filter(
      (p) => p.planVersionId === version.id
    );
    return buildVersionDependencyGraph({
      plan,
      version,
      prices,
      cycles: props.data.cyclesQuery.data ?? [],
      bundle:
        (props.data.bundlesQuery.data ?? []).find(
          (b) => b.id === version.featureBundleId
        ) ?? null,
      limits:
        (props.data.limitsQuery.data ?? []).find(
          (l) => l.id === version.limitProfileId
        ) ?? null,
      trial:
        (props.data.trialsQuery.data ?? []).find(
          (t) => t.id === version.trialPolicyId
        ) ?? null,
      regions: props.data.regionsQuery.data ?? [],
      promotions: props.data.promotionsQuery.data ?? [],
      migration:
        (props.data.migrationQuery.data ?? []).find(
          (m) => m.id === version.migrationPolicyId
        ) ?? null,
      retirement:
        (props.data.retirementQuery.data ?? []).find(
          (r) => r.id === version.retirementPolicyId
        ) ?? null,
      blockers: (validation.data?.issues ?? []).map((i) => i.message),
    });
  }, [version, plan, props.data, validation.data]);

  const impact = selectedNode && graph
    ? analyzeNodeImpact(
        selectedNode,
        graph.edges,
        (validation.data?.issues ?? []).map((i) => i.message)
      )
    : null;

  return (
    <PlatformOpsSection
      title={cc("experience.dependencyGraph.title")}
      description={cc("experience.dependencyGraph.body")}
    >
      <Select value={versionId} onValueChange={setVersionId}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder={cc("placeholders.selectVersionGraph")} />
        </SelectTrigger>
        <SelectContent>
          {(props.data.versionsQuery.data ?? []).map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.versionName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {graph ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-wrap gap-2">
            {graph.nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedNode === n.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedNode(n.id)}
              >
                <div className="text-xs uppercase text-muted-foreground">
                  {n.kind}
                </div>
                <div className="font-medium">{n.label}</div>
                {n.meta ? (
                  <div className="text-xs text-muted-foreground">{n.meta}</div>
                ) : null}
              </button>
            ))}
          </div>
          <div className="rounded border p-3 text-sm">
            <h3 className="font-medium">{cc("experience.dependencyGraph.impact")}</h3>
            {impact ? (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {cc("experience.dependencyGraph.node").replace(
                    "{id}",
                    impact.nodeId
                  )}
                </p>
                <p className="mt-2">
                  {cc("experience.dependencyGraph.dependencies").replace(
                    "{count}",
                    String(impact.dependencies.length)
                  )}
                </p>
                <p>
                  {cc("experience.dependencyGraph.consumers").replace(
                    "{count}",
                    String(impact.consumers.length)
                  )}
                </p>
                <p className="mt-2 font-medium">
                  {cc("experience.dependencyGraph.blockers")}
                </p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
                  {impact.blockers.length === 0 ? (
                    <li>{cc("experience.dependencyGraph.none")}</li>
                  ) : (
                    impact.blockers.map((b) => <li key={b}>{b}</li>)
                  )}
                </ul>
                {resolveSmartValidationActions(
                  validation.data?.issues ?? [],
                  t
                ).map((a) => (
                  <Button
                    key={a.code}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 mr-2"
                    onClick={() => props.onNavigate(a.navigateTo)}
                  >
                    {a.ctaLabel}
                  </Button>
                ))}
              </>
            ) : (
              <p className="text-muted-foreground">
                {cc("experience.dependencyGraph.selectNode")}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </PlatformOpsSection>
  );
}

export function CommercialTimelinePanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const [planId, setPlanId] = useState("");
  const events = useMemo(() => {
    const plan = (props.data.plansQuery.data ?? []).find((p) => p.id === planId);
    const versions = (props.data.versionsQuery.data ?? []).filter(
      (v) => v.planId === planId
    );
    const rows: Array<{
      at: string;
      action: string;
      detail: string;
      auditRef: string;
    }> = [];
    if (plan) {
      rows.push({
        at: plan.createdAt,
        action: cc("experience.timeline.created"),
        detail: cc("experience.timeline.planCreated").replace(
          "{name}",
          plan.name
        ),
        auditRef: `plan:${plan.id}`,
      });
      if (plan.updatedAt !== plan.createdAt) {
        rows.push({
          at: plan.updatedAt,
          action: cc("experience.timeline.updated"),
          detail: plan.isHidden
            ? cc("experience.timeline.planArchived")
            : cc("experience.timeline.planMetadata"),
          auditRef: `plan:${plan.id}`,
        });
      }
      if (plan.isHidden) {
        rows.push({
          at: plan.updatedAt,
          action: cc("experience.timeline.archived"),
          detail: cc("experience.timeline.planHidden"),
          auditRef: `plan:${plan.id}`,
        });
      }
    }
    for (const v of versions) {
      rows.push({
        at: v.createdAt,
        action: cc("experience.timeline.created"),
        detail: cc("experience.timeline.versionCreated").replace(
          "{name}",
          v.versionName
        ),
        auditRef: `version:${v.id}`,
      });
      if (v.publishedAt) {
        rows.push({
          at: v.publishedAt,
          action: cc("experience.timeline.published"),
          detail: v.versionCode,
          auditRef: `version:${v.id}:publish`,
        });
      }
      if (v.deprecatedAt) {
        rows.push({
          at: v.deprecatedAt,
          action: cc("experience.timeline.deprecated"),
          detail: v.versionCode,
          auditRef: `version:${v.id}:deprecate`,
        });
      }
      if (v.retiredAt) {
        rows.push({
          at: v.retiredAt,
          action: cc("experience.timeline.retired"),
          detail: v.versionCode,
          auditRef: `version:${v.id}:retire`,
        });
      }
    }
    return rows.sort((a, b) => a.at.localeCompare(b.at));
  }, [planId, props.data, cc]);

  return (
    <PlatformOpsSection
      title={cc("experience.timeline.title")}
      description={cc("experience.timeline.body")}
    >
      <Select value={planId} onValueChange={setPlanId}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder={cc("placeholders.selectPlanTimeline")} />
        </SelectTrigger>
        <SelectContent>
          {(props.data.plansQuery.data ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ol className="mt-4 space-y-3 border-l pl-4">
        {events.map((e, idx) => (
          <li key={`${e.auditRef}-${idx}`} className="relative">
            <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
            <div className="text-sm font-medium">{e.action}</div>
            <div className="text-sm text-muted-foreground">{e.detail}</div>
            <div className="text-xs text-muted-foreground">
              {cc("experience.timeline.auditRef")
                .replace("{at}", e.at)
                .replace("{ref}", e.auditRef)}
            </div>
          </li>
        ))}
      </ol>
    </PlatformOpsSection>
  );
}

export function BulkOperationsPanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<null | "publish" | "deprecate" | "retire">(
    null
  );
  const [results, setResults] = useState<string[]>([]);
  const publish = trpc.commercialCatalog.publishVersion.useMutation();
  const deprecate = trpc.commercialCatalog.deprecateVersion.useMutation();
  const retire = trpc.commercialCatalog.retireVersion.useMutation();
  const updatePlan = trpc.commercialCatalog.updatePlan.useMutation();
  const utils = trpc.useUtils();

  const versions = props.data.versionsQuery.data ?? [];
  const ids = Object.keys(selected).filter((id) => selected[id]);

  async function runBulk() {
    if (!confirm) return;
    catalogExperienceObservability.recordBulk();
    const out: string[] = [];
    for (const id of ids) {
      try {
        if (confirm === "publish") {
          const v = await utils.commercialCatalog.validatePublication.fetch({
            versionId: id,
          });
          if (!v.ok) {
            out.push(
              cc("experience.bulk.resultBlocked")
                .replace("{id}", id.slice(0, 8))
                .replace("{code}", v.issues[0]?.code ?? "")
            );
            continue;
          }
          await publish.mutateAsync({ versionId: id });
          out.push(
            cc("experience.bulk.resultPublished").replace(
              "{id}",
              id.slice(0, 8)
            )
          );
        } else if (confirm === "deprecate") {
          await deprecate.mutateAsync({ versionId: id });
          out.push(
            cc("experience.bulk.resultDeprecated").replace(
              "{id}",
              id.slice(0, 8)
            )
          );
        } else {
          await retire.mutateAsync({ versionId: id });
          out.push(
            cc("experience.bulk.resultRetired").replace("{id}", id.slice(0, 8))
          );
        }
      } catch (e) {
        out.push(
          cc("experience.bulk.resultFailed")
            .replace("{id}", id.slice(0, 8))
            .replace(
              "{error}",
              e instanceof Error ? e.message : cc("experience.bulk.errorGeneric")
            )
        );
      }
    }
    setResults(out);
    setConfirm(null);
    await props.data.invalidateAll();
    toast.message(
      cc("toasts.bulkFinished").replace("{action}", confirm ?? "")
    );
  }

  async function bulkArchivePlans() {
    catalogExperienceObservability.recordBulk();
    const planIds = [
      ...new Set(
        ids
          .map((id) => versions.find((v) => v.id === id)?.planId)
          .filter(Boolean) as string[]
      ),
    ];
    const out: string[] = [];
    for (const pid of planIds) {
      try {
        await updatePlan.mutateAsync({ id: pid, isHidden: true });
        out.push(
          cc("experience.bulk.planArchived").replace("{id}", pid.slice(0, 8))
        );
      } catch (e) {
        out.push(
          cc("experience.bulk.planFailed")
            .replace("{id}", pid.slice(0, 8))
            .replace(
              "{error}",
              e instanceof Error ? e.message : cc("experience.bulk.errorGeneric")
            )
        );
      }
    }
    setResults(out);
    await props.data.invalidateAll();
  }

  return (
    <PlatformOpsSection
      title={cc("experience.bulk.title")}
      description={cc("experience.bulk.body")}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={ids.length === 0}
          onClick={() => setConfirm("publish")}
        >
          {cc("actions.bulkPublish")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={ids.length === 0}
          onClick={() => setConfirm("deprecate")}
        >
          {cc("actions.bulkDeprecate")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={ids.length === 0}
          onClick={() => setConfirm("retire")}
        >
          {cc("actions.bulkRetire")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={ids.length === 0}
          onClick={() => void bulkArchivePlans()}
        >
          {cc("actions.archiveRelatedPlans")}
        </Button>
      </div>
      <p className="mb-2 text-sm text-muted-foreground">
        {cc("experience.bulk.selectedImpact").replace(
          "{count}",
          String(ids.length)
        )}
      </p>
      <div className="max-h-80 overflow-auto rounded border">
        {versions.map((v) => (
          <label
            key={v.id}
            className="flex items-center gap-2 border-b px-3 py-2 text-sm"
          >
            <Checkbox
              checked={Boolean(selected[v.id])}
              onCheckedChange={(c) =>
                setSelected((s) => ({ ...s, [v.id]: Boolean(c) }))
              }
            />
            <span className="flex-1">
              {v.versionName}{" "}
              <span className="text-muted-foreground">({v.state})</span>
            </span>
          </label>
        ))}
      </div>
      {results.length > 0 ? (
        <ul className="mt-3 list-disc pl-5 text-sm">
          {results.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
      <SemanticConfirmDialog
        open={confirm != null}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
        title={cc("experience.bulk.confirmTitle").replace(
          "{action}",
          confirm ?? ""
        )}
        description={cc("experience.bulk.confirmBody")
          .replace("{action}", confirm ?? "")
          .replace("{count}", String(ids.length))}
        cancelLabel={cc("actions.cancel")}
        confirmLabel={cc("actions.execute")}
        onConfirm={() => void runBulk()}
      />
    </PlatformOpsSection>
  );
}

export function DeepClonePanel(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const [versionId, setVersionId] = useState("");
  const [includePricing, setIncludePricing] = useState(true);
  const [includeBundle, setIncludeBundle] = useState(true);
  const [busy, setBusy] = useState(false);
  const createPlan = trpc.commercialCatalog.createPlan.useMutation();
  const createVersion = trpc.commercialCatalog.createVersion.useMutation();
  const createBundle = trpc.commercialCatalog.createFeatureBundle.useMutation();
  const createLimits = trpc.commercialCatalog.createLimitProfile.useMutation();
  const createPrice = trpc.commercialCatalog.createPrice.useMutation();
  const createCycle = trpc.commercialCatalog.createBillingCycle.useMutation();

  const version = (props.data.versionsQuery.data ?? []).find(
    (v) => v.id === versionId
  );
  const plan = (props.data.plansQuery.data ?? []).find(
    (p) => p.id === version?.planId
  );

  async function deepClone() {
    if (!version || !plan) return;
    setBusy(true);
    try {
      catalogExperienceObservability.recordClone();
      const newPlan = await createPlan.mutateAsync({
        code: uniqueSlug(plan.code),
        name: `${plan.name} ${cc("manage.copySuffix")}`,
        description: plan.description,
      });
      let bundleId = version.featureBundleId;
      let limitId = version.limitProfileId;
      if (includeBundle && version.featureBundleId) {
        const src = (props.data.bundlesQuery.data ?? []).find(
          (b) => b.id === version.featureBundleId
        );
        if (src) {
          const created = await createBundle.mutateAsync({
            code: uniqueSlug(src.code),
            name: `${src.name} ${cc("manage.copySuffix")}`,
            features: (src.features ?? []).map((f) => ({
              featureKey: f.featureKey,
              included: f.included,
            })),
          });
          bundleId = created.id;
        }
        const lim = (props.data.limitsQuery.data ?? []).find(
          (l) => l.id === version.limitProfileId
        );
        if (lim) {
          const created = await createLimits.mutateAsync({
            code: uniqueSlug(lim.code),
            name: `${lim.name} ${cc("manage.copySuffix")}`,
            values: (lim.values ?? []).map((v) => ({
              limitKey: v.limitKey,
              value: v.value,
              unit: v.unit,
            })),
          });
          limitId = created.id;
        }
      }
      const newVersion = await createVersion.mutateAsync({
        planId: newPlan.id,
        versionCode: uniqueSlug(version.versionCode),
        versionName: `${version.versionName} ${cc("manage.copySuffix")}`,
        featureBundleId: bundleId,
        limitProfileId: limitId,
        trialPolicyId: version.trialPolicyId,
        migrationPolicyId: version.migrationPolicyId,
        retirementPolicyId: version.retirementPolicyId,
        compatibility: version.compatibility,
      });
      if (includePricing) {
        const prices = (props.data.pricesQuery.data ?? []).filter(
          (p) => p.planVersionId === version.id
        );
        for (const p of prices) {
          const cycle = (props.data.cyclesQuery.data ?? []).find(
            (c) => c.id === p.billingCycleId
          );
          let cycleId = p.billingCycleId;
          if (cycle) {
            const createdCycle = await createCycle.mutateAsync({
              code: uniqueSlug(cycle.code),
              name: `${cycle.name} ${cc("manage.copySuffix")}`,
              intervalCount: cycle.intervalCount,
              intervalUnit: cycle.intervalUnit,
            });
            cycleId = createdCycle.id;
          }
          await createPrice.mutateAsync({
            planVersionId: newVersion.id,
            billingCycleId: cycleId,
            currency: p.currency,
            amount: p.amount,
            regionId: p.regionId,
          });
        }
      }
      toast.success(cc("toasts.deepCloneCreated"));
      await props.data.invalidateAll();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : cc("toasts.cloneFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlatformOpsSection
      title={cc("experience.deepClone.title")}
      description={cc("experience.deepClone.body")}
    >
      <div className="flex flex-wrap gap-3">
        <Select value={versionId} onValueChange={setVersionId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder={cc("placeholders.sourceVersion")} />
          </SelectTrigger>
          <SelectContent>
            {(props.data.versionsQuery.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includePricing}
            onCheckedChange={(c) => setIncludePricing(Boolean(c))}
          />
          {cc("experience.deepClone.clonePricingCycles")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeBundle}
            onCheckedChange={(c) => setIncludeBundle(Boolean(c))}
          />
          {cc("experience.deepClone.cloneBundleLimits")}
        </label>
        <Button
          type="button"
          disabled={!versionId || busy}
          onClick={() => void deepClone()}
        >
          {busy ? cc("actions.cloning") : cc("actions.deepClone")}
        </Button>
      </div>
    </PlatformOpsSection>
  );
}

export function PublicationDiffPanel(props: { data: CatalogManagementData }) {
  const { cc, t } = useCatalogI18n();
  const [draftId, setDraftId] = useState("");
  const drafts = (props.data.versionsQuery.data ?? []).filter(
    (v) => v.state === "draft"
  );
  const draft = drafts.find((v) => v.id === draftId);
  const published = (props.data.versionsQuery.data ?? []).find(
    (v) => v.planId === draft?.planId && v.state === "published"
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const publish = trpc.commercialCatalog.publishVersion.useMutation();
  const validation = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId: draftId },
    { enabled: Boolean(draftId) }
  );

  const diffs = useMemo(() => {
    if (!draft) return null;
    const left = published;
    const right = draft;
    return [
      diffScalar("versionCode", left?.versionCode, right.versionCode),
      diffScalar("featureBundleId", left?.featureBundleId, right.featureBundleId),
      diffScalar("limitProfileId", left?.limitProfileId, right.limitProfileId),
      diffScalar("trialPolicyId", left?.trialPolicyId, right.trialPolicyId),
      diffScalar(
        "migrationPolicyId",
        left?.migrationPolicyId,
        right.migrationPolicyId
      ),
      diffScalar(
        "retirementPolicyId",
        left?.retirementPolicyId,
        right.retirementPolicyId
      ),
    ];
  }, [draft, published]);

  return (
    <PlatformOpsSection
      title={cc("experience.publicationDiff.title")}
      description={cc("experience.publicationDiff.body")}
    >
      <Select value={draftId} onValueChange={setDraftId}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder={cc("placeholders.draftToPublish")} />
        </SelectTrigger>
        <SelectContent>
          {drafts.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.versionName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {diffs ? (
        <div className="mt-4 space-y-2">
          <PlatformOpsAlert
            severity="info"
            title={
              published
                ? cc("experience.publicationDiff.publishingOver").replace(
                    "{name}",
                    published.versionName
                  )
                : cc("experience.publicationDiff.firstPublication")
            }
            detail={cc("experience.publicationDiff.reviewChanges")}
          />
          <DiffList diffs={diffs} />
          {validation.data && !validation.data.ok ? (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {resolveSmartValidationActions(
                validation.data.issues,
                t
              ).map((a) => (
                <li key={a.code}>
                  {a.title}: {a.description}
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            type="button"
            disabled={!validation.data?.ok}
            onClick={() => setConfirmOpen(true)}
          >
            {cc("actions.reviewPublish")}
          </Button>
        </div>
      ) : null}
      <SemanticConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={cc("experience.publicationDiff.confirmTitle")}
        description={cc("experience.publicationDiff.confirmBody")}
        cancelLabel={cc("actions.cancel")}
        confirmLabel={cc("actions.publish")}
        onConfirm={() => {
          const started = Date.now();
          void publish
            .mutateAsync({ versionId: draftId })
            .then(async () => {
              catalogExperienceObservability.recordPublication(true);
              catalogExperienceObservability.recordPublishDuration(
                Date.now() - started
              );
              toast.success(cc("toasts.published"));
              setConfirmOpen(false);
              await props.data.invalidateAll();
            })
            .catch((e) => {
              catalogExperienceObservability.recordPublication(false);
              toast.error(e.message);
            });
        }}
      />
    </PlatformOpsSection>
  );
}

export function SmartValidationEnhancer(props: {
  data: CatalogManagementData;
  onNavigate: ExperienceNavigate;
}) {
  const { cc, t } = useCatalogI18n();
  const [versionId, setVersionId] = useState("");
  const validation = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId },
    { enabled: Boolean(versionId) }
  );
  const actions = resolveSmartValidationActions(
    validation.data?.issues ?? [],
    t
  );

  return (
    <PlatformOpsSection
      title={cc("validation.smartTitle")}
      description={cc("validation.smartBody")}
    >
      <Select value={versionId} onValueChange={setVersionId}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder={cc("placeholders.draftVersion")} />
        </SelectTrigger>
        <SelectContent>
          {(props.data.versionsQuery.data ?? [])
            .filter((v) => v.state === "draft")
            .map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <div className="mt-4 space-y-2">
        {actions.length === 0 && versionId ? (
          <PlatformOpsAlert
            severity="success"
            title={cc("validation.publicationReady")}
            detail={cc("validation.noBlockingIssues")}
          />
        ) : null}
        {actions.map((a) => (
          <div
            key={a.code}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
          >
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-muted-foreground">
                {a.description}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => props.onNavigate(a.navigateTo)}
            >
              {a.ctaLabel}
            </Button>
          </div>
        ))}
      </div>
    </PlatformOpsSection>
  );
}

/** Keyboard shortcuts helper hook for the experience shell. */
export function useCatalogExperienceShortcuts(handlers: {
  onSearch?: () => void;
  onWizard?: () => void;
  onDashboard?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handlers.onSearch?.();
      }
      if (e.key === "w" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlers.onWizard?.();
      }
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        handlers.onDashboard?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}

export function ProductivityRail(props: { data: CatalogManagementData }) {
  const { cc } = useCatalogI18n();
  const recent = catalogProductivityStore.get().recentEntityIds.slice(0, 8);
  const favorites = catalogProductivityStore.get().favorites;
  return (
    <div
      className="rounded border p-3 text-sm"
      aria-label={cc("a11y.productivityRail")}
    >
      <div className="font-medium">{cc("experience.productivity.recentFavorites")}</div>
      <p className="text-xs text-muted-foreground">
        {cc("experience.productivity.shortcuts")
          .replace("{search}", "/")
          .replace("{wizard}", "Ctrl+W")
          .replace("{dashboard}", "Ctrl+Shift+D")}
      </p>
      <ul className="mt-2 space-y-1 text-xs">
        {recent.map((id) => (
          <li key={id} className="font-mono">
            {cc("experience.productivity.recent").replace(
              "{id}",
              id.slice(0, 10)
            )}
          </li>
        ))}
        {favorites.map((id) => (
          <li key={id} className="font-mono">
            {cc("experience.productivity.favorite").replace(
              "{id}",
              id.slice(0, 10)
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">
        {(props.data.plansQuery.data ?? []).slice(0, 5).map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              catalogProductivityStore.togglePinnedPlan(p.id);
              catalogProductivityStore.toggleFavorite(p.id);
              toast.message(
                cc("toasts.toggledPinFavorite").replace("{name}", p.name)
              );
            }}
          >
            {cc("actions.pin")} {p.code}
          </Button>
        ))}
      </div>
    </div>
  );
}
