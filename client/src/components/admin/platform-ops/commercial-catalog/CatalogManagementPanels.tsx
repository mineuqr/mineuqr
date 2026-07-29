/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1 — entity management panels.
 * All mutations call existing commercialCatalog tRPC procedures (no duplicate logic).
 */

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCatalogI18n } from "./useCatalogI18n";
import { AdminLocalizedPricePreview } from "@/components/commercial/AdminLocalizedPricePreview";
import { COMMERCIAL_CANONICAL_CURRENCY } from "@shared/commercial-catalog";
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
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PlatformOpsTableCell,
  PlatformOpsTableRow,
} from "@/design-system/platform-ops-ui";
import { CatalogEntityPanel } from "./CatalogEntityPanel";
import {
  CatalogField,
  CatalogFormDialog,
  Input,
  Textarea,
} from "./CatalogFormDialog";
import {
  CATALOG_FEATURE_KEYS,
  CATALOG_LIMIT_KEYS,
  filterByQuery,
  versionStateTone,
} from "./catalogUiHelpers";
import {
  catalogFeatureNameKey,
  catalogLimitNameKey,
  resolveCatalogLabel,
} from "./catalogCommercialDisplay";
import { CatalogCountrySelect } from "./CatalogCountrySelect";
import { catalogManagementUiObservability } from "./catalogManagementObservability";
import type { CatalogManagementData } from "./useCatalogManagementData";

type Props = { data: CatalogManagementData };

function useMutationToast(
  data: CatalogManagementData,
  successMessage: string,
  errorFallback: string
) {
  return {
    onSuccess: async () => {
      data.trackCrud(true);
      toast.success(successMessage);
      await data.invalidateAll();
    },
    onError: (err: { message?: string }) => {
      data.trackCrud(false, err.message);
      toast.error(err.message ?? errorFallback);
    },
  };
}

function stateLabel(cc: (key: string) => string, state: string) {
  const map: Record<string, string> = {
    draft: "states.draft",
    published: "states.published",
    deprecated: "states.deprecated",
    retired: "states.retired",
    active: "states.active",
    archived: "states.archived",
  };
  return cc(map[state] ?? "states.unknown");
}

export function PlansManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const createMut = trpc.commercialCatalog.createPlan.useMutation(
    useMutationToast(data, cc("toasts.planCreated"), cc("toasts.operationFailed"))
  );
  const updateMut = trpc.commercialCatalog.updatePlan.useMutation(
    useMutationToast(data, cc("toasts.planUpdated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.plansQuery.data ?? [], search, (p) => [
        p.code,
        p.name,
        p.description,
      ]),
    [data.plansQuery.data, search]
  );

  const versionCountByPlan = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of data.versionsQuery.data ?? []) {
      map.set(v.planId, (map.get(v.planId) ?? 0) + 1);
    }
    return map;
  }, [data.versionsQuery.data]);

  function reset() {
    setEditId(null);
    setCode("");
    setName("");
    setDescription("");
    setSortOrder("0");
  }

  function openCreate() {
    reset();
    setOpen(true);
  }

  function openEdit(plan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    sortOrder: number;
  }) {
    setEditId(plan.id);
    setCode(plan.code);
    setName(plan.name);
    setDescription(plan.description ?? "");
    setSortOrder(String(plan.sortOrder));
    setOpen(true);
  }

  async function submit() {
    if (editId) {
      await updateMut.mutateAsync({
        id: editId,
        name,
        description: description || null,
        sortOrder: Number(sortOrder) || 0,
      });
    } else {
      await createMut.mutateAsync({
        code,
        name,
        description: description || null,
        sortOrder: Number(sortOrder) || 0,
      });
    }
    setOpen(false);
    reset();
  }

  async function archive(id: string) {
    await updateMut.mutateAsync({ id, isHidden: true });
  }

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.plansTitle")}
        description={cc("manage.plansBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createPlan")}
        onPrimaryAction={openCreate}
        emptyTitle={cc("manage.noPlans")}
        emptyDescription={cc("manage.noPlansBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("headers.versions"),
          cc("headers.status"),
          cc("headers.updated"),
          cc("headers.actions"),
        ]}
      >
        {rows.map((p) => (
          <PlatformOpsTableRow key={p.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {versionCountByPlan.get(p.id) ?? 0}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              <PlatformOpsStatusBadge
                status={p.isHidden ? "unavailable" : "healthy"}
                label={
                  p.isHidden ? cc("states.archived") : cc("states.active")
                }
              />
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {p.updatedAt}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(p)}
                >
                  {cc("actions.edit")}
                </Button>
                {!p.isHidden ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void archive(p.id)}
                  >
                    {cc("actions.archive")}
                  </Button>
                ) : null}
              </div>
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>

      <CatalogFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
        title={
          editId ? cc("manage.editPlan") : cc("manage.createPlan")
        }
        description={cc("manage.planIdentityHint")}
        pending={createMut.isPending || updateMut.isPending}
        onSubmit={() => void submit()}
      >
        {!editId ? (
          <CatalogField label={cc("fields.code")}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </CatalogField>
        ) : (
          <CatalogField label={cc("fields.code")} hint={cc("common.immutable")}>
            <Input value={code} disabled />
          </CatalogField>
        )}
        <CatalogField label={cc("fields.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.description")}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CatalogField>
        <CatalogField label={cc("fields.sortOrder")}>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function VersionsManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [versionName, setVersionName] = useState("");
  const [featureBundleId, setFeatureBundleId] = useState<string>("");
  const [limitProfileId, setLimitProfileId] = useState<string>("");
  const [trialPolicyId, setTrialPolicyId] = useState<string>("");
  const [migrationPolicyId, setMigrationPolicyId] = useState<string>("");
  const [retirementPolicyId, setRetirementPolicyId] = useState<string>("");

  const createMut = trpc.commercialCatalog.createVersion.useMutation(
    useMutationToast(data, cc("toasts.versionCreated"), cc("toasts.operationFailed"))
  );
  const updateMut = trpc.commercialCatalog.updateDraftVersion.useMutation(
    useMutationToast(data, cc("toasts.draftVersionUpdated"), cc("toasts.operationFailed"))
  );
  const publishMut = trpc.commercialCatalog.publishVersion.useMutation({
    onSuccess: async () => {
      catalogManagementUiObservability.recordPublication(true);
      toast.success(cc("toasts.versionPublished"));
      await data.invalidateAll();
    },
    onError: (err) => {
      catalogManagementUiObservability.recordPublication(false, err.message);
      toast.error(err.message);
    },
  });
  const deprecateMut = trpc.commercialCatalog.deprecateVersion.useMutation(
    useMutationToast(data, cc("toasts.versionDeprecated"), cc("toasts.operationFailed"))
  );
  const retireMut = trpc.commercialCatalog.retireVersion.useMutation(
    useMutationToast(data, cc("toasts.versionRetired"), cc("toasts.operationFailed"))
  );

  const plansById = useMemo(() => {
    const m = new Map((data.plansQuery.data ?? []).map((p) => [p.id, p]));
    return m;
  }, [data.plansQuery.data]);

  const snapshotCountByVersion = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.snapshotsQuery.data ?? []) {
      m.set(s.planVersionId, (m.get(s.planVersionId) ?? 0) + 1);
    }
    return m;
  }, [data.snapshotsQuery.data]);

  const rows = useMemo(
    () =>
      filterByQuery(data.versionsQuery.data ?? [], search, (v) => [
        v.versionCode,
        v.versionName,
        v.state,
        plansById.get(v.planId)?.code,
      ]),
    [data.versionsQuery.data, search, plansById]
  );

  function reset() {
    setPlanId("");
    setVersionCode("");
    setVersionName("");
    setFeatureBundleId("");
    setLimitProfileId("");
    setTrialPolicyId("");
    setMigrationPolicyId("");
    setRetirementPolicyId("");
  }

  async function submitCreate() {
    await createMut.mutateAsync({
      planId,
      versionCode,
      versionName,
      featureBundleId: featureBundleId || null,
      limitProfileId: limitProfileId || null,
      trialPolicyId: trialPolicyId || null,
      migrationPolicyId: migrationPolicyId || null,
      retirementPolicyId: retirementPolicyId || null,
    });
    setOpen(false);
    reset();
  }

  async function cloneVersion(v: {
    planId: string;
    versionCode: string;
    versionName: string;
    featureBundleId: string | null;
    limitProfileId: string | null;
    trialPolicyId: string | null;
    migrationPolicyId: string | null;
    retirementPolicyId: string | null;
    compatibility?: {
      upgradeTargets: string[];
      downgradeTargets: string[];
      migrationRequirements: string[];
      breakingCommercialChanges: string[];
    };
  }) {
    const nextCode = `${v.versionCode}-clone-${Date.now().toString(36).slice(-4)}`;
    await createMut.mutateAsync({
      planId: v.planId,
      versionCode: nextCode,
      versionName: `${v.versionName} ${cc("manage.cloneSuffix")}`,
      featureBundleId: v.featureBundleId,
      limitProfileId: v.limitProfileId,
      trialPolicyId: v.trialPolicyId,
      migrationPolicyId: v.migrationPolicyId,
      retirementPolicyId: v.retirementPolicyId,
      compatibility: v.compatibility,
    });
  }

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.versionsTitle")}
        description={cc("manage.versionsBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createVersion")}
        onPrimaryAction={() => {
          reset();
          setOpen(true);
        }}
        emptyTitle={cc("manage.noVersions")}
        emptyDescription={cc("manage.noVersionsBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.version"),
          cc("headers.plan"),
          cc("headers.state"),
          cc("headers.snapshots"),
          cc("headers.updated"),
          cc("headers.actions"),
        ]}
      >
        {rows.map((v) => (
          <PlatformOpsTableRow key={v.id}>
            <PlatformOpsTableCell>
              {v.versionName}
              <div className="font-mono text-xs text-muted-foreground">
                {v.versionCode}
              </div>
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {plansById.get(v.planId)?.name ?? v.planId.slice(0, 8)}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              <PlatformOpsStatusBadge
                status={versionStateTone(v.state)}
                label={stateLabel(cc, v.state)}
              />
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {snapshotCountByVersion.get(v.id) ?? 0}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {v.updatedAt}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void cloneVersion(v)}
                >
                  {cc("actions.clone")}
                </Button>
                {v.state === "draft" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void publishMut.mutateAsync({ versionId: v.id })}
                  >
                    {cc("actions.publish")}
                  </Button>
                ) : null}
                {v.state === "published" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void deprecateMut.mutateAsync({ versionId: v.id })
                    }
                  >
                    {cc("actions.deprecate")}
                  </Button>
                ) : null}
                {v.state === "deprecated" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void retireMut.mutateAsync({ versionId: v.id })
                    }
                  >
                    {cc("actions.retire")}
                  </Button>
                ) : null}
                {v.state === "draft" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void updateMut.mutateAsync({
                        id: v.id,
                        versionName: `${v.versionName}`,
                        featureBundleId: v.featureBundleId,
                        limitProfileId: v.limitProfileId,
                        trialPolicyId: v.trialPolicyId,
                        migrationPolicyId: v.migrationPolicyId,
                        retirementPolicyId: v.retirementPolicyId,
                      })
                    }
                  >
                    {cc("actions.touchDraft")}
                  </Button>
                ) : null}
              </div>
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>

      <CatalogFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
        title={cc("manage.createVersionTitle")}
        pending={createMut.isPending}
        onSubmit={() => void submitCreate()}
      >
        <CatalogField label={cc("fields.plan")}>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.selectPlan")} />
            </SelectTrigger>
            <SelectContent>
              {(data.plansQuery.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.versionCode")}>
          <Input
            value={versionCode}
            onChange={(e) => setVersionCode(e.target.value)}
          />
        </CatalogField>
        <CatalogField label={cc("fields.versionName")}>
          <Input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
        </CatalogField>
        <CatalogField label={cc("fields.featureBundle")}>
          <Select
            value={featureBundleId || "__none"}
            onValueChange={(v) => setFeatureBundleId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.optional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(data.bundlesQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.limitProfile")}>
          <Select
            value={limitProfileId || "__none"}
            onValueChange={(v) => setLimitProfileId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.optional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(data.limitsQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.trialPolicy")}>
          <Select
            value={trialPolicyId || "__none"}
            onValueChange={(v) => setTrialPolicyId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.optional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(data.trialsQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.migrationPolicy")}>
          <Select
            value={migrationPolicyId || "__none"}
            onValueChange={(v) =>
              setMigrationPolicyId(v === "__none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.optional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(data.migrationQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.retirementPolicy")}>
          <Select
            value={retirementPolicyId || "__none"}
            onValueChange={(v) =>
              setRetirementPolicyId(v === "__none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.optional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(data.retirementQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function PricingManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [planVersionId, setPlanVersionId] = useState("");
  const [billingCycleId, setBillingCycleId] = useState("");
  const [currency, setCurrency] = useState(COMMERCIAL_CANONICAL_CURRENCY);
  const [amount, setAmount] = useState("");
  const [regionId, setRegionId] = useState("");

  const createMut = trpc.commercialCatalog.createPrice.useMutation(
    useMutationToast(data, cc("toasts.priceCreated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.pricesQuery.data ?? [], search, (p) => [
        p.currency,
        p.amount,
        p.planVersionId,
      ]),
    [data.pricesQuery.data, search]
  );

  async function submit() {
    const isOverride = Boolean(regionId);
    await createMut.mutateAsync({
      planVersionId,
      billingCycleId,
      currency: isOverride ? currency : COMMERCIAL_CANONICAL_CURRENCY,
      amount,
      regionId: regionId || null,
    });
    setOpen(false);
    setCurrency(COMMERCIAL_CANONICAL_CURRENCY);
    setRegionId("");
    setAmount("");
  }

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.pricingTitle")}
        description={cc("manage.pricingBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createPrice")}
        onPrimaryAction={() => setOpen(true)}
        emptyTitle={cc("manage.noPrices")}
        emptyDescription={cc("manage.noPricesBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.version"),
          cc("headers.cycle"),
          cc("headers.amount"),
          cc("headers.currency"),
          cc("headers.region"),
          cc("headers.created"),
        ]}
      >
        {rows.map((p) => (
          <PlatformOpsTableRow key={p.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.planVersionId.slice(0, 8)}…
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.billingCycleId.slice(0, 8)}…
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.amount}</PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.currency}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {p.regionId
                ? p.regionId.slice(0, 8) + "…"
                : cc("common.emDash")}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {p.createdAt}
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <div className="mt-4">
        <AdminLocalizedPricePreview
          prices={(data.pricesQuery.data ?? []).map((p) => ({
            amount: p.amount,
            currency: p.currency,
            regionId: p.regionId,
          }))}
          regions={(data.regionsQuery.data ?? []).map((r) => ({
            id: r.id,
            countryCode: r.countryCode,
            currency: r.currency,
          }))}
          priceCycleHints={(data.pricesQuery.data ?? []).map((p) => ({
            billingCycleId: p.billingCycleId,
          }))}
          monthlyBillingCycleIds={(data.cyclesQuery.data ?? [])
            .filter(
              (c) =>
                c.intervalUnit === "month" ||
                c.code.toLowerCase().includes("month")
            )
            .map((c) => c.id)}
          yearlyBillingCycleIds={(data.cyclesQuery.data ?? [])
            .filter(
              (c) =>
                c.intervalUnit === "year" ||
                c.code.toLowerCase().includes("year")
            )
            .map((c) => c.id)}
        />
      </div>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={cc("manage.createPrice")}
        pending={createMut.isPending}
        onSubmit={() => void submit()}
      >
        <CatalogField label={cc("fields.planVersion")}>
          <Select value={planVersionId} onValueChange={setPlanVersionId}>
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.selectVersion")} />
            </SelectTrigger>
            <SelectContent>
              {(data.versionsQuery.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.versionName} ({stateLabel(cc, v.state)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.billingCycle")}>
          <Select value={billingCycleId} onValueChange={setBillingCycleId}>
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.selectCycle")} />
            </SelectTrigger>
            <SelectContent>
              {(data.cyclesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label={cc("fields.amount")}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("manage.currencyUsdOnly")}>
          {regionId ? (
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          ) : (
            <Input value={COMMERCIAL_CANONICAL_CURRENCY} readOnly disabled />
          )}
        </CatalogField>
        <CatalogField label={cc("fields.regionOptional")}>
          <Select
            value={regionId || "__none"}
            onValueChange={(v) => {
              const next = v === "__none" ? "" : v;
              setRegionId(next);
              if (!next) setCurrency(COMMERCIAL_CANONICAL_CURRENCY);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.globalNone")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{cc("common.none")}</SelectItem>
              {(data.regionsQuery.data ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.countryCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function BillingCyclesManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [intervalCount, setIntervalCount] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<
    "day" | "week" | "month" | "year"
  >("month");

  const createMut = trpc.commercialCatalog.createBillingCycle.useMutation(
    useMutationToast(data, cc("toasts.billingCycleCreated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.cyclesQuery.data ?? [], search, (c) => [
        c.code,
        c.name,
        c.intervalUnit,
      ]),
    [data.cyclesQuery.data, search]
  );

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.billingCyclesTitle")}
        description={cc("manage.billingCyclesBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createCycle")}
        onPrimaryAction={() => setOpen(true)}
        emptyTitle={cc("manage.noBillingCycles")}
        emptyDescription={cc("manage.noBillingCyclesBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("headers.interval"),
          cc("headers.created"),
        ]}
      >
        {rows.map((c) => (
          <PlatformOpsTableRow key={c.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {c.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{c.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {c.intervalCount}{" "}
              {cc(
                c.intervalUnit === "day"
                  ? "intervalUnits.day"
                  : c.intervalUnit === "week"
                    ? "intervalUnits.week"
                    : c.intervalUnit === "year"
                      ? "intervalUnits.year"
                      : "intervalUnits.month"
              )}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {c.createdAt}
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={cc("manage.createBillingCycleTitle")}
        pending={createMut.isPending}
        onSubmit={() =>
          void createMut
            .mutateAsync({
              code,
              name,
              intervalCount: Number(intervalCount) || 1,
              intervalUnit,
            })
            .then(() => setOpen(false))
        }
      >
        <CatalogField label={cc("fields.code")}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.intervalCount")}>
          <Input
            type="number"
            value={intervalCount}
            onChange={(e) => setIntervalCount(e.target.value)}
          />
        </CatalogField>
        <CatalogField label={cc("fields.intervalUnit")}>
          <Select
            value={intervalUnit}
            onValueChange={(v) =>
              setIntervalUnit(v as "day" | "week" | "month" | "year")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{cc("intervalUnits.day")}</SelectItem>
              <SelectItem value="week">{cc("intervalUnits.week")}</SelectItem>
              <SelectItem value="month">{cc("intervalUnits.month")}</SelectItem>
              <SelectItem value="year">{cc("intervalUnits.year")}</SelectItem>
            </SelectContent>
          </Select>
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function FeatureBundlesManagementPanel({ data }: Props) {
  const { cc, t } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const createMut = trpc.commercialCatalog.createFeatureBundle.useMutation(
    useMutationToast(data, cc("toasts.featureBundleCreated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.bundlesQuery.data ?? [], search, (b) => [
        b.code,
        b.name,
      ]),
    [data.bundlesQuery.data, search]
  );

  function toggle(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.featureBundlesTitle")}
        description={cc("manage.featureBundlesBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createBundle")}
        onPrimaryAction={() => setOpen(true)}
        emptyTitle={cc("manage.noFeatureBundles")}
        emptyDescription={cc("manage.noFeatureBundlesBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("headers.features"),
          cc("headers.created"),
        ]}
      >
        {rows.map((b) => (
          <PlatformOpsTableRow key={b.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {b.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{b.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {cc("manage.includedCount").replace(
                "{count}",
                String((b.features ?? []).filter((f) => f.included).length)
              )}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {b.createdAt}
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={cc("manage.createFeatureBundleTitle")}
        pending={createMut.isPending}
        onSubmit={() =>
          void createMut
            .mutateAsync({
              code,
              name,
              description: description || null,
              features: CATALOG_FEATURE_KEYS.map((featureKey) => ({
                featureKey,
                included: Boolean(selected[featureKey]),
              })),
            })
            .then(() => setOpen(false))
        }
      >
        <CatalogField label={cc("fields.code")}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
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
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded border p-2">
            {CATALOG_FEATURE_KEYS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm"
                title={t(catalogFeatureNameKey(key))}
              >
                <Checkbox
                  checked={Boolean(selected[key])}
                  onCheckedChange={() => toggle(key)}
                />
                {resolveCatalogLabel(t, catalogFeatureNameKey(key), key)}
              </label>
            ))}
          </div>
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function LimitProfilesManagementPanel({ data }: Props) {
  const { cc, t } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({
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
  });
  const [unlimited, setUnlimited] = useState<Record<string, boolean>>({});

  const createMut = trpc.commercialCatalog.createLimitProfile.useMutation(
    useMutationToast(data, cc("toasts.limitProfileCreated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.limitsQuery.data ?? [], search, (p) => [
        p.code,
        p.name,
      ]),
    [data.limitsQuery.data, search]
  );

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.limitProfilesTitle")}
        description={cc("manage.limitProfilesBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createProfile")}
        onPrimaryAction={() => setOpen(true)}
        emptyTitle={cc("manage.noLimitProfiles")}
        emptyDescription={cc("manage.noLimitProfilesBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("headers.limits"),
          cc("headers.created"),
        ]}
      >
        {rows.map((p) => (
          <PlatformOpsTableRow key={p.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs">
              {(p.values ?? [])
                .map(
                  (v) =>
                    `${v.limitKey}=${v.value ?? cc("common.infinity")}`
                )
                .join(", ")}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {p.createdAt}
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={cc("manage.createLimitProfileTitle")}
        pending={createMut.isPending}
        onSubmit={() =>
          void createMut
            .mutateAsync({
              code,
              name,
              values: CATALOG_LIMIT_KEYS.map((limitKey) => ({
                limitKey,
                value: unlimited[limitKey]
                  ? null
                  : Number(values[limitKey] ?? 0),
              })),
            })
            .then(() => setOpen(false))
        }
      >
        <CatalogField label={cc("fields.code")}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        {CATALOG_LIMIT_KEYS.map((key) => (
          <CatalogField
            key={key}
            label={resolveCatalogLabel(t, catalogLimitNameKey(key), key)}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                disabled={Boolean(unlimited[key])}
                value={values[key] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <Checkbox
                  checked={Boolean(unlimited[key])}
                  onCheckedChange={(c) =>
                    setUnlimited((prev) => ({ ...prev, [key]: Boolean(c) }))
                  }
                />
                {cc("common.unlimited")}
              </label>
            </div>
          </CatalogField>
        ))}
      </CatalogFormDialog>
    </>
  );
}

export function SimplePolicyCreatePanel(props: {
  data: CatalogManagementData;
  title: string;
  description: string;
  rows: Array<{
    id: string;
    code: string;
    name: string;
    createdAt: string;
    extra?: string;
  }>;
  emptyTitle: string;
  onCreate: (input: {
    code: string;
    name: string;
    description?: string | null;
    [key: string]: unknown;
  }) => Promise<unknown>;
  pending: boolean;
  extraFields?: ReactNode;
  buildExtra?: () => Record<string, unknown>;
  searchFields?: (row: {
    code: string;
    name: string;
    extra?: string;
  }) => Array<string | null | undefined>;
}) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const rows = useMemo(
    () =>
      filterByQuery(props.rows, search, (r) =>
        props.searchFields
          ? props.searchFields(r)
          : [r.code, r.name, r.extra]
      ),
    [props.rows, search, props.searchFields]
  );

  return (
    <>
      <CatalogEntityPanel
        title={props.title}
        description={props.description}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("actions.create")}
        onPrimaryAction={() => setOpen(true)}
        emptyTitle={props.emptyTitle}
        emptyDescription={cc("manage.createFirstEntry").replace(
          "{entity}",
          props.title
        )}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("headers.details"),
          cc("headers.created"),
        ]}
      >
        {rows.map((r) => (
          <PlatformOpsTableRow key={r.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {r.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{r.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {r.extra ?? cc("common.emDash")}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {r.createdAt}
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={cc("manage.createEntityTitle").replace("{entity}", props.title)}
        pending={props.pending}
        onSubmit={() =>
          void props
            .onCreate({
              code,
              name,
              description: description || null,
              ...(props.buildExtra?.() ?? {}),
            })
            .then(() => setOpen(false))
        }
      >
        <CatalogField label={cc("fields.code")}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
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
        {props.extraFields}
      </CatalogFormDialog>
    </>
  );
}

export function TrialPoliciesManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [days, setDays] = useState("14");
  const createMut = trpc.commercialCatalog.createTrialPolicy.useMutation(
    useMutationToast(data, cc("toasts.trialPolicyCreated"), cc("toasts.operationFailed"))
  );
  return (
    <SimplePolicyCreatePanel
      data={data}
      title={cc("manage.trialPoliciesTitle")}
      description={cc("manage.trialPoliciesBody")}
      emptyTitle={cc("manage.noTrialPolicies")}
      pending={createMut.isPending}
      rows={(data.trialsQuery.data ?? []).map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        createdAt: t.createdAt,
        extra: cc("manage.daysCount").replace(
          "{count}",
          String(t.durationDays)
        ),
      }))}
      buildExtra={() => ({ durationDays: Number(days) || 14 })}
      onCreate={(input) => createMut.mutateAsync(input as never)}
      extraFields={
        <CatalogField label={cc("fields.durationDays")}>
          <Input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </CatalogField>
      }
    />
  );
}

export function RegionsManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [currency, setCurrency] = useState(COMMERCIAL_CANONICAL_CURRENCY);
  const [taxPolicyRef, setTaxPolicyRef] = useState("");

  const createMut = trpc.commercialCatalog.createRegion.useMutation(
    useMutationToast(data, cc("toasts.regionCreated"), cc("toasts.operationFailed"))
  );
  const updateMut = trpc.commercialCatalog.updateRegion.useMutation(
    useMutationToast(data, cc("toasts.regionUpdated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.regionsQuery.data ?? [], search, (r) => [
        r.code,
        r.name,
        r.countryCode,
        r.currency,
      ]),
    [data.regionsQuery.data, search]
  );

  function reset() {
    setEditId(null);
    setCode("");
    setName("");
    setCountryCode("US");
    setCurrency(COMMERCIAL_CANONICAL_CURRENCY);
    setTaxPolicyRef("");
  }

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.regionalPoliciesTitle")}
        description={cc("manage.regionalPoliciesBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createRegion")}
        onPrimaryAction={() => {
          reset();
          setOpen(true);
        }}
        emptyTitle={cc("manage.noRegions")}
        emptyDescription={cc("manage.noRegionsBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("headers.country"),
          cc("headers.currency"),
          cc("headers.actions"),
        ]}
      >
        {rows.map((r) => (
          <PlatformOpsTableRow key={r.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {r.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{r.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>{r.countryCode}</PlatformOpsTableCell>
            <PlatformOpsTableCell>{r.currency}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditId(r.id);
                  setCode(r.code);
                  setName(r.name);
                  setCountryCode(r.countryCode);
                  setCurrency(r.currency);
                  setTaxPolicyRef(r.taxPolicyRef ?? "");
                  setOpen(true);
                }}
              >
                {cc("actions.edit")}
              </Button>
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
        title={editId ? cc("manage.editRegionTitle") : cc("manage.createRegionTitle")}
        pending={createMut.isPending || updateMut.isPending}
        onSubmit={() =>
          void (editId
            ? updateMut.mutateAsync({
                id: editId,
                name,
                countryCode,
                currency,
                taxPolicyRef: taxPolicyRef || null,
              })
            : createMut.mutateAsync({
                code,
                name,
                countryCode,
                currency,
                taxPolicyRef: taxPolicyRef || null,
              })
          ).then(() => {
            setOpen(false);
            reset();
          })
        }
      >
        {!editId ? (
          <CatalogField label={cc("fields.code")}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </CatalogField>
        ) : null}
        <CatalogField label={cc("fields.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.countryCode")}>
          <CatalogCountrySelect
            value={countryCode}
            onChange={({ countryCode: nextCode, currency: nextCurrency, countryName }) => {
              setCountryCode(nextCode);
              setCurrency(nextCurrency);
              if (!name.trim()) setName(countryName);
            }}
          />
        </CatalogField>
        <CatalogField label={cc("polish.currencyAuto")}>
          <Input value={currency} readOnly disabled />
        </CatalogField>
        <CatalogField label={cc("fields.taxPolicyRef")}>
          <Input
            value={taxPolicyRef}
            onChange={(e) => setTaxPolicyRef(e.target.value)}
          />
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function PromotionsManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [effectSummary, setEffectSummary] = useState("");
  const createMut = trpc.commercialCatalog.createPromotion.useMutation(
    useMutationToast(data, cc("toasts.promotionCreated"), cc("toasts.operationFailed"))
  );
  return (
    <SimplePolicyCreatePanel
      data={data}
      title={cc("manage.promotionsTitle")}
      description={cc("manage.promotionsBody")}
      emptyTitle={cc("manage.noPromotions")}
      pending={createMut.isPending}
      rows={(data.promotionsQuery.data ?? []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        createdAt: p.createdAt,
        extra: `${p.isActive ? cc("manage.promotionActive") : cc("manage.promotionInactive")} · ${p.effectSummary}`,
      }))}
      buildExtra={() => ({ effectSummary })}
      onCreate={(input) => createMut.mutateAsync(input as never)}
      extraFields={
        <CatalogField label={cc("fields.effectSummary")}>
          <Input
            value={effectSummary}
            onChange={(e) => setEffectSummary(e.target.value)}
            placeholder={cc("placeholders.effectSummaryExample")}
          />
        </CatalogField>
      }
    />
  );
}

export function MigrationPoliciesManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresExplicitAction, setRequiresExplicitAction] = useState(true);

  const createMut = trpc.commercialCatalog.createMigrationPolicy.useMutation(
    useMutationToast(data, cc("toasts.migrationPolicyCreated"), cc("toasts.operationFailed"))
  );
  const updateMut = trpc.commercialCatalog.updateMigrationPolicy.useMutation(
    useMutationToast(data, cc("toasts.migrationPolicyUpdated"), cc("toasts.operationFailed"))
  );

  const rows = useMemo(
    () =>
      filterByQuery(data.migrationQuery.data ?? [], search, (p) => [
        p.code,
        p.name,
      ]),
    [data.migrationQuery.data, search]
  );

  return (
    <>
      <CatalogEntityPanel
        title={cc("manage.migrationPoliciesTitle")}
        description={cc("manage.migrationPoliciesBody")}
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel={cc("manage.createPolicy")}
        onPrimaryAction={() => {
          setEditId(null);
          setOpen(true);
        }}
        emptyTitle={cc("manage.noMigrationPolicies")}
        emptyDescription={cc("manage.noMigrationPoliciesBody")}
        isEmpty={rows.length === 0}
        headers={[
          cc("headers.code"),
          cc("headers.name"),
          cc("fields.explicitAction"),
          cc("headers.actions"),
        ]}
      >
        {rows.map((p) => (
          <PlatformOpsTableRow key={p.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {p.requiresExplicitAction
                ? cc("manage.explicitActionRequired")
                : cc("manage.explicitActionOptional")}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditId(p.id);
                  setCode(p.code);
                  setName(p.name);
                  setDescription(p.description ?? "");
                  setRequiresExplicitAction(p.requiresExplicitAction);
                  setOpen(true);
                }}
              >
                {cc("actions.edit")}
              </Button>
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={
          editId
            ? cc("manage.editMigrationPolicyTitle")
            : cc("manage.createMigrationPolicyTitle")
        }
        pending={createMut.isPending || updateMut.isPending}
        onSubmit={() =>
          void (editId
            ? updateMut.mutateAsync({
                id: editId,
                name,
                description: description || null,
                requiresExplicitAction,
              })
            : createMut.mutateAsync({
                code,
                name,
                description: description || null,
                requiresExplicitAction,
              })
          ).then(() => setOpen(false))
        }
      >
        {!editId ? (
          <CatalogField label={cc("fields.code")}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </CatalogField>
        ) : null}
        <CatalogField label={cc("fields.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label={cc("fields.description")}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CatalogField>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={requiresExplicitAction}
            onCheckedChange={(c) => setRequiresExplicitAction(Boolean(c))}
          />
          {cc("manage.requiresExplicitAction")}
        </label>
      </CatalogFormDialog>
    </>
  );
}

export function RetirementPoliciesManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [allowRenewals, setAllowRenewals] = useState(false);
  const createMut = trpc.commercialCatalog.createRetirementPolicy.useMutation(
    useMutationToast(data, cc("toasts.retirementPolicyCreated"), cc("toasts.operationFailed"))
  );
  return (
    <SimplePolicyCreatePanel
      data={data}
      title={cc("manage.retirementPoliciesTitle")}
      description={cc("manage.retirementPoliciesBody")}
      emptyTitle={cc("manage.noRetirementPolicies")}
      pending={createMut.isPending}
      rows={(data.retirementQuery.data ?? []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        createdAt: p.createdAt,
        extra: p.allowRenewals
          ? cc("manage.renewalsAllowed")
          : cc("manage.renewalsBlocked"),
      }))}
      buildExtra={() => ({ allowRenewals })}
      onCreate={(input) => createMut.mutateAsync(input as never)}
      extraFields={
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allowRenewals}
            onCheckedChange={(c) => setAllowRenewals(Boolean(c))}
          />
          {cc("manage.allowRenewalsAfterRetirement")}
        </label>
      }
    />
  );
}

export function PublicationManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const validationQuery = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId: selectedVersionId! },
    { enabled: Boolean(selectedVersionId) }
  );
  const publishMut = trpc.commercialCatalog.publishVersion.useMutation({
    onSuccess: async () => {
      catalogManagementUiObservability.recordPublication(true);
      toast.success(cc("toasts.published"));
      await data.invalidateAll();
    },
    onError: (err) => {
      catalogManagementUiObservability.recordPublication(false, err.message);
      toast.error(err.message);
    },
  });
  const deprecateMut = trpc.commercialCatalog.deprecateVersion.useMutation(
    useMutationToast(data, cc("toasts.deprecated"), cc("toasts.operationFailed"))
  );
  const retireMut = trpc.commercialCatalog.retireVersion.useMutation(
    useMutationToast(data, cc("toasts.retired"), cc("toasts.operationFailed"))
  );

  const versions = data.versionsQuery.data ?? [];
  const byState = {
    draft: versions.filter((v) => v.state === "draft"),
    published: versions.filter((v) => v.state === "published"),
    deprecated: versions.filter((v) => v.state === "deprecated"),
    retired: versions.filter((v) => v.state === "retired"),
  };

  const metricLabels = [
    ["draft", byState.draft.length],
    ["published", byState.published.length],
    ["deprecated", byState.deprecated.length],
    ["retired", byState.retired.length],
  ] as const;

  return (
    <PlatformOpsSection
      title={cc("manage.publicationWorkspaceTitle")}
      description={cc("manage.publicationWorkspaceBody")}
    >
      <PlatformOpsMetricGrid>
        {metricLabels.map(([label, value]) => (
          <PlatformOpsMetricCard
            key={label}
            label={stateLabel(cc, label)}
            value={String(value)}
            tone="info"
            domain="information"
          />
        ))}
      </PlatformOpsMetricGrid>

      <div className="mt-4 space-y-3">
        {versions.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
          >
            <div>
              <div className="font-medium">
                {v.versionName}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {v.versionCode}
                </span>
              </div>
              <PlatformOpsStatusBadge
                status={versionStateTone(v.state)}
                label={stateLabel(cc, v.state)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedVersionId(v.id)}
              >
                {cc("actions.validate")}
              </Button>
              {v.state === "draft" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void publishMut.mutateAsync({ versionId: v.id })
                  }
                >
                  {cc("actions.publish")}
                </Button>
              ) : null}
              {v.state === "published" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void deprecateMut.mutateAsync({ versionId: v.id })
                  }
                >
                  {cc("actions.deprecate")}
                </Button>
              ) : null}
              {v.state === "deprecated" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void retireMut.mutateAsync({ versionId: v.id })
                  }
                >
                  {cc("actions.retire")}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {selectedVersionId && validationQuery.data ? (
        <div className="mt-4 space-y-2">
          <PlatformOpsAlert
            severity={validationQuery.data.ok ? "info" : "warning"}
            title={
              validationQuery.data.ok
                ? cc("manage.cc16Ready")
                : cc("manage.cc16Blocking")
            }
            detail={cc("manage.issueCount").replace(
              "{count}",
              String(validationQuery.data.issues.length)
            )}
          />
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {validationQuery.data.issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>
                <strong>{issue.code}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PlatformOpsSection>
  );
}

export function ValidationManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [versionId, setVersionId] = useState<string>("");
  const validationQuery = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId },
    { enabled: Boolean(versionId) }
  );

  return (
    <PlatformOpsSection
      title={cc("manage.commercialValidationTitle")}
      description={cc("manage.commercialValidationBody")}
    >
      <CatalogField label={cc("fields.planVersion")}>
        <Select value={versionId} onValueChange={setVersionId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder={cc("placeholders.selectVersionToValidate")} />
          </SelectTrigger>
          <SelectContent>
            {(data.versionsQuery.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName} ({stateLabel(cc, v.state)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogField>

      {validationQuery.data ? (
        <div className="mt-4 space-y-2">
          <PlatformOpsStatusBadge
            status={validationQuery.data.ok ? "healthy" : "degraded"}
            label={
              validationQuery.data.ok
                ? cc("manage.readyToPublish")
                : cc("manage.notReady")
            }
          />
          {validationQuery.data.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {cc("manage.noBlockingIssues")}
            </p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {validationQuery.data.issues.map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>
                  <span className="font-mono text-xs">{issue.code}</span> —{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </PlatformOpsSection>
  );
}

export function HealthManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const health = data.healthQuery.data;
  const adoption = data.adoptionQuery.data;
  const uiMetrics = catalogManagementUiObservability.snapshot();

  return (
    <PlatformOpsSection
      title={cc("manage.commercialHealthTitle")}
      description={cc("manage.commercialHealthBody")}
    >
      <PlatformOpsMetricGrid>
        <PlatformOpsMetricCard
          label={cc("metricPlans")}
          value={String(health?.plans ?? data.plansQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("metricVersions")}
          value={String(health?.versions.total ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("metricPublished")}
          value={String(health?.versions.published ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={stateLabel(cc, "draft")}
          value={String(health?.versions.draft ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={stateLabel(cc, "deprecated")}
          value={String(health?.versions.deprecated ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={stateLabel(cc, "retired")}
          value={String(health?.versions.retired ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("headers.snapshots")}
          value={String(data.snapshotsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("metricRegions")}
          value={String(data.regionsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("manage.promotionsTitle")}
          value={String(data.promotionsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("manage.validationErrors")}
          value={String(health?.validationErrors ?? 0)}
          tone={(health?.validationErrors ?? 0) > 0 ? "amber" : "info"}
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("manage.crudSuccessRate")}
          value={`${Math.round(uiMetrics.crudSuccessRate * 100)}%`}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("manage.adoptionSnapshotCreates")}
          value={String(adoption?.snapshotCreations ?? 0)}
          tone="info"
          domain="information"
        />
      </PlatformOpsMetricGrid>
      {health?.lastValidationError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {cc("manage.lastValidationError").replace(
            "{message}",
            health.lastValidationError
          )}
        </p>
      ) : null}
      {health?.lastPublicationError ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {cc("manage.lastPublicationError").replace(
            "{message}",
            health.lastPublicationError
          )}
        </p>
      ) : null}
      {adoption &&
      typeof adoption === "object" &&
      "runtimeAuthority" in adoption &&
      adoption.runtimeAuthority ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {cc("manage.runtimeMixedResolution").replace(
            "{count}",
            String(
              (
                adoption.runtimeAuthority as {
                  mixedResolutionCount: number;
                }
              ).mixedResolutionCount
            )
          )}
        </p>
      ) : null}
    </PlatformOpsSection>
  );
}
