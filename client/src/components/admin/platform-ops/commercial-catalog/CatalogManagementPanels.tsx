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
} from "./catalogUiHelpers";
import {
  catalogFeatureNameKey,
  catalogLimitNameKey,
  resolveCatalogLabel,
} from "./catalogCommercialDisplay";
import { CatalogCountrySelect } from "./CatalogCountrySelect";
import { catalogManagementUiObservability } from "./catalogManagementObservability";
import { CapabilityFilterPicker } from "./experience/CapabilityFilterPicker";
import { normalizePlanFeatures } from "./experience/capabilityExperienceModel";
import { CATALOG_PROMOTED_PROJECTION_IDS } from "@shared/commercial-projection";
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
  const updateMut = trpc.commercialCatalog.saveLivePlan.useMutation(
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

export function VersionsManagementPanel(_props: Props) { return null; }

export function PricingManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
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
        p.planId,
      ]),
    [data.pricesQuery.data, search]
  );

  async function submit() {
    const isOverride = Boolean(regionId);
    await createMut.mutateAsync({
      planId,
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
          cc("headers.plan"),
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
              {p.planId.slice(0, 8)}…
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
        <CatalogField label={cc("fields.plan")}>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger>
              <SelectValue placeholder={cc("placeholders.selectPlan")} />
            </SelectTrigger>
            <SelectContent>
              {(data.plansQuery.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} ({v.code})
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
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const id of CATALOG_PROMOTED_PROJECTION_IDS) next[id] = true;
    return next;
  });

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
                included: Boolean(
                  normalizePlanFeatures(selected)[featureKey]
                ),
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
          <CapabilityFilterPicker
            compact
            value={selected}
            onChange={setSelected}
          />
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

export function RetirementPoliciesManagementPanel(_props: Props) { return null; }

export function PublicationManagementPanel(_props: Props) { return null; }

export function ValidationManagementPanel({ data }: Props) {
  const { cc } = useCatalogI18n();
  const [planId, setPlanId] = useState<string>("");
  const validationQuery = trpc.commercialCatalog.validatePlanSave.useQuery(
    { planId },
    { enabled: Boolean(planId) }
  );

  return (
    <PlatformOpsSection
      title={cc("manage.commercialValidationTitle")}
      description={cc("manage.commercialValidationBody")}
    >
      <CatalogField label={cc("fields.plan")}>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder={cc("placeholders.selectPlan")} />
          </SelectTrigger>
          <SelectContent>
            {(data.plansQuery.data ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} ({v.code})
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
                ? cc("manage.readyToSave")
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
          label={cc("manage.hiddenPlans")}
          value={String(health?.hiddenPlans ?? 0)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("headers.prices")}
          value={String(health?.prices ?? 0)}
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
      </PlatformOpsMetricGrid>
      {health?.lastValidationError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {cc("manage.lastValidationError").replace(
            "{message}",
            health.lastValidationError
          )}
        </p>
      ) : null}
    </PlatformOpsSection>
  );
}

