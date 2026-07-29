/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1 — entity management panels.
 * All mutations call existing commercialCatalog tRPC procedures (no duplicate logic).
 */

import { useMemo, useState, type ReactNode } from "react";
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
import { catalogManagementUiObservability } from "./catalogManagementObservability";
import type { CatalogManagementData } from "./useCatalogManagementData";

type Props = { data: CatalogManagementData };

function useMutationToast(
  data: CatalogManagementData,
  successMessage: string
) {
  return {
    onSuccess: async () => {
      data.trackCrud(true);
      toast.success(successMessage);
      await data.invalidateAll();
    },
    onError: (err: { message?: string }) => {
      data.trackCrud(false, err.message);
      toast.error(err.message ?? "Operation failed");
    },
  };
}

export function PlansManagementPanel({ data }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const createMut = trpc.commercialCatalog.createPlan.useMutation(
    useMutationToast(data, "Plan created")
  );
  const updateMut = trpc.commercialCatalog.updatePlan.useMutation(
    useMutationToast(data, "Plan updated")
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
        title="Plans"
        description="Create and manage Commercial Plan Identities. Archive hides a plan from selection; hard delete is not supported for historical identity integrity."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Plan"
        onPrimaryAction={openCreate}
        emptyTitle="No plans"
        emptyDescription="Create the first Commercial Plan Identity."
        isEmpty={rows.length === 0}
        headers={[
          "Code",
          "Name",
          "Versions",
          "Status",
          "Updated",
          "Actions",
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
                label={p.isHidden ? "Archived" : "Active"}
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
                  Edit
                </Button>
                {!p.isHidden ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void archive(p.id)}
                  >
                    Archive
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
        title={editId ? "Edit Plan" : "Create Plan"}
        description="Catalog owns plan identity. Code is immutable after create."
        pending={createMut.isPending || updateMut.isPending}
        onSubmit={() => void submit()}
      >
        {!editId ? (
          <CatalogField label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </CatalogField>
        ) : (
          <CatalogField label="Code" hint="Immutable">
            <Input value={code} disabled />
          </CatalogField>
        )}
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CatalogField>
        <CatalogField label="Sort order">
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
    useMutationToast(data, "Version created")
  );
  const updateMut = trpc.commercialCatalog.updateDraftVersion.useMutation(
    useMutationToast(data, "Draft version updated")
  );
  const publishMut = trpc.commercialCatalog.publishVersion.useMutation({
    onSuccess: async () => {
      catalogManagementUiObservability.recordPublication(true);
      toast.success("Version published");
      await data.invalidateAll();
    },
    onError: (err) => {
      catalogManagementUiObservability.recordPublication(false, err.message);
      toast.error(err.message);
    },
  });
  const deprecateMut = trpc.commercialCatalog.deprecateVersion.useMutation(
    useMutationToast(data, "Version deprecated")
  );
  const retireMut = trpc.commercialCatalog.retireVersion.useMutation(
    useMutationToast(data, "Version retired")
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
      versionName: `${v.versionName} (clone)`,
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
        title="Plan Versions"
        description="Draft → Publish → Deprecate → Retire. Clone creates a new draft from an existing version."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Version"
        onPrimaryAction={() => {
          reset();
          setOpen(true);
        }}
        emptyTitle="No versions"
        emptyDescription="Create a draft Plan Version for a plan."
        isEmpty={rows.length === 0}
        headers={[
          "Version",
          "Plan",
          "State",
          "Snapshots",
          "Updated",
          "Actions",
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
                label={v.state}
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
                  Clone
                </Button>
                {v.state === "draft" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void publishMut.mutateAsync({ versionId: v.id })}
                  >
                    Publish
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
                    Deprecate
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
                    Retire
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
                    Touch Draft
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
        title="Create Plan Version"
        pending={createMut.isPending}
        onSubmit={() => void submitCreate()}
      >
        <CatalogField label="Plan">
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select plan" />
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
        <CatalogField label="Version code">
          <Input
            value={versionCode}
            onChange={(e) => setVersionCode(e.target.value)}
          />
        </CatalogField>
        <CatalogField label="Version name">
          <Input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
        </CatalogField>
        <CatalogField label="Feature bundle">
          <Select
            value={featureBundleId || "__none"}
            onValueChange={(v) => setFeatureBundleId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {(data.bundlesQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label="Limit profile">
          <Select
            value={limitProfileId || "__none"}
            onValueChange={(v) => setLimitProfileId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {(data.limitsQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label="Trial policy">
          <Select
            value={trialPolicyId || "__none"}
            onValueChange={(v) => setTrialPolicyId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {(data.trialsQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label="Migration policy">
          <Select
            value={migrationPolicyId || "__none"}
            onValueChange={(v) =>
              setMigrationPolicyId(v === "__none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {(data.migrationQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label="Retirement policy">
          <Select
            value={retirementPolicyId || "__none"}
            onValueChange={(v) =>
              setRetirementPolicyId(v === "__none" ? "" : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [planVersionId, setPlanVersionId] = useState("");
  const [billingCycleId, setBillingCycleId] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [amount, setAmount] = useState("");
  const [regionId, setRegionId] = useState("");

  const createMut = trpc.commercialCatalog.createPrice.useMutation(
    useMutationToast(data, "Price created")
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
    await createMut.mutateAsync({
      planVersionId,
      billingCycleId,
      currency,
      amount,
      regionId: regionId || null,
    });
    setOpen(false);
  }

  return (
    <>
      <CatalogEntityPanel
        title="Pricing"
        description="Create version prices. Price rows are immutable commercial facts — create a new price for changes (no silent rewrite)."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Price"
        onPrimaryAction={() => setOpen(true)}
        emptyTitle="No prices"
        emptyDescription="Attach pricing to a Plan Version."
        isEmpty={rows.length === 0}
        headers={["Version", "Cycle", "Amount", "Currency", "Region", "Created"]}
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
              {p.regionId ? p.regionId.slice(0, 8) + "…" : "—"}
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
        title="Create Price"
        pending={createMut.isPending}
        onSubmit={() => void submit()}
      >
        <CatalogField label="Plan version">
          <Select value={planVersionId} onValueChange={setPlanVersionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {(data.versionsQuery.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.versionName} ({v.state})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CatalogField>
        <CatalogField label="Billing cycle">
          <Select value={billingCycleId} onValueChange={setBillingCycleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select cycle" />
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
        <CatalogField label="Amount">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </CatalogField>
        <CatalogField label="Currency">
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </CatalogField>
        <CatalogField label="Region (optional)">
          <Select
            value={regionId || "__none"}
            onValueChange={(v) => setRegionId(v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Global / none" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [intervalCount, setIntervalCount] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<
    "day" | "week" | "month" | "year"
  >("month");

  const createMut = trpc.commercialCatalog.createBillingCycle.useMutation(
    useMutationToast(data, "Billing cycle created")
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
        title="Billing Cycles"
        description="Monthly, quarterly, annual, and custom interval definitions."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Cycle"
        onPrimaryAction={() => setOpen(true)}
        emptyTitle="No billing cycles"
        emptyDescription="Define at least one billing cycle before pricing."
        isEmpty={rows.length === 0}
        headers={["Code", "Name", "Interval", "Created"]}
      >
        {rows.map((c) => (
          <PlatformOpsTableRow key={c.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {c.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{c.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {c.intervalCount} {c.intervalUnit}
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
        title="Create Billing Cycle"
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
        <CatalogField label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </CatalogField>
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label="Interval count">
          <Input
            type="number"
            value={intervalCount}
            onChange={(e) => setIntervalCount(e.target.value)}
          />
        </CatalogField>
        <CatalogField label="Interval unit">
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
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function FeatureBundlesManagementPanel({ data }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const createMut = trpc.commercialCatalog.createFeatureBundle.useMutation(
    useMutationToast(data, "Feature bundle created")
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
        title="Feature Bundles"
        description="Visual feature editor — assign normative feature keys included in a bundle."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Bundle"
        onPrimaryAction={() => setOpen(true)}
        emptyTitle="No feature bundles"
        emptyDescription="Create a bundle before attaching it to a Plan Version."
        isEmpty={rows.length === 0}
        headers={["Code", "Name", "Features", "Created"]}
      >
        {rows.map((b) => (
          <PlatformOpsTableRow key={b.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {b.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{b.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {(b.features ?? []).filter((f) => f.included).length} included
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
        title="Create Feature Bundle"
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
        <CatalogField label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </CatalogField>
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CatalogField>
        <CatalogField label="Features">
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded border p-2">
            {CATALOG_FEATURE_KEYS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={Boolean(selected[key])}
                  onCheckedChange={() => toggle(key)}
                />
                {key}
              </label>
            ))}
          </div>
        </CatalogField>
      </CatalogFormDialog>
    </>
  );
}

export function LimitProfilesManagementPanel({ data }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({
    restaurants: "1",
    items: "100",
    categories: "10",
  });
  const [unlimited, setUnlimited] = useState<Record<string, boolean>>({});

  const createMut = trpc.commercialCatalog.createLimitProfile.useMutation(
    useMutationToast(data, "Limit profile created")
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
        title="Limit Profiles"
        description="Numeric or unlimited usage limits. Null value = unlimited."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Profile"
        onPrimaryAction={() => setOpen(true)}
        emptyTitle="No limit profiles"
        emptyDescription="Create a limit profile for Plan Versions."
        isEmpty={rows.length === 0}
        headers={["Code", "Name", "Limits", "Created"]}
      >
        {rows.map((p) => (
          <PlatformOpsTableRow key={p.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs">
              {(p.values ?? [])
                .map((v) => `${v.limitKey}=${v.value ?? "∞"}`)
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
        title="Create Limit Profile"
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
        <CatalogField label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </CatalogField>
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        {CATALOG_LIMIT_KEYS.map((key) => (
          <CatalogField key={key} label={key}>
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
                Unlimited
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
        primaryActionLabel="Create"
        onPrimaryAction={() => setOpen(true)}
        emptyTitle={props.emptyTitle}
        emptyDescription={`Create the first ${props.title.toLowerCase()} entry.`}
        isEmpty={rows.length === 0}
        headers={["Code", "Name", "Details", "Created"]}
      >
        {rows.map((r) => (
          <PlatformOpsTableRow key={r.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {r.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{r.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell className="text-xs text-muted-foreground">
              {r.extra ?? "—"}
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
        title={`Create ${props.title}`}
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
        <CatalogField label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </CatalogField>
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label="Description">
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
  const [days, setDays] = useState("14");
  const createMut = trpc.commercialCatalog.createTrialPolicy.useMutation(
    useMutationToast(data, "Trial policy created")
  );
  return (
    <SimplePolicyCreatePanel
      data={data}
      title="Trial Policies"
      description="Trial duration and eligibility policy definitions."
      emptyTitle="No trial policies"
      pending={createMut.isPending}
      rows={(data.trialsQuery.data ?? []).map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        createdAt: t.createdAt,
        extra: `${t.durationDays} days`,
      }))}
      buildExtra={() => ({ durationDays: Number(days) || 14 })}
      onCreate={(input) => createMut.mutateAsync(input as never)}
      extraFields={
        <CatalogField label="Duration (days)">
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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [taxPolicyRef, setTaxPolicyRef] = useState("");

  const createMut = trpc.commercialCatalog.createRegion.useMutation(
    useMutationToast(data, "Region created")
  );
  const updateMut = trpc.commercialCatalog.updateRegion.useMutation(
    useMutationToast(data, "Region updated")
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
    setCountryCode("");
    setCurrency("SAR");
    setTaxPolicyRef("");
  }

  return (
    <>
      <CatalogEntityPanel
        title="Regional Policies"
        description="Country, currency, tax reference, and regional availability."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Region"
        onPrimaryAction={() => {
          reset();
          setOpen(true);
        }}
        emptyTitle="No regions"
        emptyDescription="Create regional commercial policies."
        isEmpty={rows.length === 0}
        headers={["Code", "Name", "Country", "Currency", "Actions"]}
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
                Edit
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
        title={editId ? "Edit Region" : "Create Region"}
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
          <CatalogField label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </CatalogField>
        ) : null}
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label="Country code">
          <Input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
          />
        </CatalogField>
        <CatalogField label="Currency">
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </CatalogField>
        <CatalogField label="Tax policy ref">
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
  const [effectSummary, setEffectSummary] = useState("");
  const createMut = trpc.commercialCatalog.createPromotion.useMutation(
    useMutationToast(data, "Promotion created")
  );
  return (
    <SimplePolicyCreatePanel
      data={data}
      title="Promotions"
      description="Promotion definitions (discount summary, eligibility, validity)."
      emptyTitle="No promotions"
      pending={createMut.isPending}
      rows={(data.promotionsQuery.data ?? []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        createdAt: p.createdAt,
        extra: `${p.isActive ? "active" : "inactive"} · ${p.effectSummary}`,
      }))}
      buildExtra={() => ({ effectSummary })}
      onCreate={(input) => createMut.mutateAsync(input as never)}
      extraFields={
        <CatalogField label="Effect summary">
          <Input
            value={effectSummary}
            onChange={(e) => setEffectSummary(e.target.value)}
            placeholder="e.g. 20% off first month"
          />
        </CatalogField>
      }
    />
  );
}

export function MigrationPoliciesManagementPanel({ data }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresExplicitAction, setRequiresExplicitAction] = useState(true);

  const createMut = trpc.commercialCatalog.createMigrationPolicy.useMutation(
    useMutationToast(data, "Migration policy created")
  );
  const updateMut = trpc.commercialCatalog.updateMigrationPolicy.useMutation(
    useMutationToast(data, "Migration policy updated")
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
        title="Migration Policies"
        description="Upgrade/downgrade compatibility and explicit-action requirements."
        search={search}
        onSearchChange={setSearch}
        primaryActionLabel="Create Policy"
        onPrimaryAction={() => {
          setEditId(null);
          setOpen(true);
        }}
        emptyTitle="No migration policies"
        emptyDescription="Create migration policies for Plan Versions."
        isEmpty={rows.length === 0}
        headers={["Code", "Name", "Explicit action", "Actions"]}
      >
        {rows.map((p) => (
          <PlatformOpsTableRow key={p.id}>
            <PlatformOpsTableCell className="font-mono text-xs">
              {p.code}
            </PlatformOpsTableCell>
            <PlatformOpsTableCell>{p.name}</PlatformOpsTableCell>
            <PlatformOpsTableCell>
              {p.requiresExplicitAction ? "Required" : "Optional"}
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
                Edit
              </Button>
            </PlatformOpsTableCell>
          </PlatformOpsTableRow>
        ))}
      </CatalogEntityPanel>
      <CatalogFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editId ? "Edit Migration Policy" : "Create Migration Policy"}
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
          <CatalogField label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </CatalogField>
        ) : null}
        <CatalogField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </CatalogField>
        <CatalogField label="Description">
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
          Requires explicit action
        </label>
      </CatalogFormDialog>
    </>
  );
}

export function RetirementPoliciesManagementPanel({ data }: Props) {
  const [allowRenewals, setAllowRenewals] = useState(false);
  const createMut = trpc.commercialCatalog.createRetirementPolicy.useMutation(
    useMutationToast(data, "Retirement policy created")
  );
  return (
    <SimplePolicyCreatePanel
      data={data}
      title="Retirement Policies"
      description="Retirement visibility, renewals, and replacement guidance."
      emptyTitle="No retirement policies"
      pending={createMut.isPending}
      rows={(data.retirementQuery.data ?? []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        createdAt: p.createdAt,
        extra: p.allowRenewals ? "renewals allowed" : "renewals blocked",
      }))}
      buildExtra={() => ({ allowRenewals })}
      onCreate={(input) => createMut.mutateAsync(input as never)}
      extraFields={
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allowRenewals}
            onCheckedChange={(c) => setAllowRenewals(Boolean(c))}
          />
          Allow renewals after retirement
        </label>
      }
    />
  );
}

export function PublicationManagementPanel({ data }: Props) {
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
      toast.success("Published");
      await data.invalidateAll();
    },
    onError: (err) => {
      catalogManagementUiObservability.recordPublication(false, err.message);
      toast.error(err.message);
    },
  });
  const deprecateMut = trpc.commercialCatalog.deprecateVersion.useMutation(
    useMutationToast(data, "Deprecated")
  );
  const retireMut = trpc.commercialCatalog.retireVersion.useMutation(
    useMutationToast(data, "Retired")
  );

  const versions = data.versionsQuery.data ?? [];
  const byState = {
    draft: versions.filter((v) => v.state === "draft"),
    published: versions.filter((v) => v.state === "published"),
    deprecated: versions.filter((v) => v.state === "deprecated"),
    retired: versions.filter((v) => v.state === "retired"),
  };

  return (
    <PlatformOpsSection
      title="Publication Workspace"
      description="Lifecycle lanes for draft, published, deprecated, and retired versions with CC-16 gate."
    >
      <PlatformOpsMetricGrid>
        {(
          [
            ["Draft", byState.draft.length],
            ["Published", byState.published.length],
            ["Deprecated", byState.deprecated.length],
            ["Retired", byState.retired.length],
          ] as const
        ).map(([label, value]) => (
          <PlatformOpsMetricCard
            key={label}
            label={label}
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
                label={v.state}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedVersionId(v.id)}
              >
                Validate
              </Button>
              {v.state === "draft" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void publishMut.mutateAsync({ versionId: v.id })
                  }
                >
                  Publish
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
                  Deprecate
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
                  Retire
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
                ? "CC-16 publication ready"
                : "CC-16 blocking issues"
            }
            detail={`${validationQuery.data.issues.length} issue(s)`}
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
  const [versionId, setVersionId] = useState<string>("");
  const validationQuery = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId },
    { enabled: Boolean(versionId) }
  );

  return (
    <PlatformOpsSection
      title="Commercial Validation"
      description="CC-16 publication readiness — blocking errors, missing pricing, limits, features, and policies."
    >
      <CatalogField label="Plan version">
        <Select value={versionId} onValueChange={setVersionId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select version to validate" />
          </SelectTrigger>
          <SelectContent>
            {(data.versionsQuery.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.versionName} ({v.state})
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
              validationQuery.data.ok ? "Ready to publish" : "Not ready"
            }
          />
          {validationQuery.data.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No blocking issues.
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
  const health = data.healthQuery.data;
  const adoption = data.adoptionQuery.data;
  const uiMetrics = catalogManagementUiObservability.snapshot();

  return (
    <PlatformOpsSection
      title="Commercial Health"
      description="Catalog growth, lifecycle distribution, snapshots, adoption, and management UX metrics."
    >
      <PlatformOpsMetricGrid>
        <PlatformOpsMetricCard
          label="Plans"
          value={String(health?.plans ?? data.plansQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Versions"
          value={String(health?.versions.total ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Published"
          value={String(health?.versions.published ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Draft"
          value={String(health?.versions.draft ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Deprecated"
          value={String(health?.versions.deprecated ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Retired"
          value={String(health?.versions.retired ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Snapshots"
          value={String(data.snapshotsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Regions"
          value={String(data.regionsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Promotions"
          value={String(data.promotionsQuery.data?.length ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Validation errors"
          value={String(health?.validationErrors ?? 0)}
          tone={(health?.validationErrors ?? 0) > 0 ? "amber" : "info"}
          domain="information"
        />
        <PlatformOpsMetricCard
          label="CRUD success rate"
          value={`${Math.round(uiMetrics.crudSuccessRate * 100)}%`}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label="Adoption snapshot creates"
          value={String(adoption?.snapshotCreations ?? 0)}
          tone="info"
          domain="information"
        />
      </PlatformOpsMetricGrid>
      {health?.lastValidationError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Last validation error: {health.lastValidationError}
        </p>
      ) : null}
      {health?.lastPublicationError ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Last publication error: {health.lastPublicationError}
        </p>
      ) : null}
      {adoption &&
      typeof adoption === "object" &&
      "runtimeAuthority" in adoption &&
      adoption.runtimeAuthority ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime mixedResolutionCount={" "}
          {
            (
              adoption.runtimeAuthority as {
                mixedResolutionCount: number;
              }
            ).mixedResolutionCount
          }
        </p>
      ) : null}
    </PlatformOpsSection>
  );
}
