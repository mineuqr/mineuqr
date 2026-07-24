/**
 * REGISTER-CATALOG-MANAGEMENT-1 — Manager Register Catalog host.
 * Presentation only — crmp.catalog.*. No Duty controls.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import {
  catalogStatusLabel,
  registerCatalogUiLabel,
  registerTypeLabel,
  useRegisterCatalogList,
  useRegisterCatalogMutations,
  type CatalogLanguage,
  type CatalogRegisterDto,
} from "@/lib/register-catalog-presentation";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Search } from "lucide-react";

type Props = {
  restaurantId: number;
  language: CatalogLanguage;
  /** When true, open create form (from Ops empty-state handoff). */
  openCreate?: boolean;
  /** Owner/admin may mutate catalog; others see read-only + disabled create. */
  canManageCatalog: boolean;
};

type RegisterType = CatalogRegisterDto["registerType"];
type CatalogStatus = CatalogRegisterDto["catalogStatus"];

const TYPES: RegisterType[] = [
  "settlement_station",
  "counter",
  "mobile_pos",
];

function emptyForm() {
  return {
    code: "",
    displayName: "",
    registerType: "counter" as RegisterType,
  };
}

export function RegisterCatalogPanel({
  restaurantId,
  language,
  openCreate = false,
  canManageCatalog,
}: Props) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const listQuery = useRegisterCatalogList(restaurantId);
  const mutations = useRegisterCatalogMutations(restaurantId);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CatalogStatus | "all">(
    "all"
  );
  const [formOpen, setFormOpen] = useState(openCreate);
  const [editing, setEditing] = useState<CatalogRegisterDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (openCreate && canManageCatalog) setFormOpen(true);
  }, [openCreate, canManageCatalog]);

  const rows = useMemo(() => {
    const all = listQuery.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (r.archivedAt != null) return false;
      if (statusFilter !== "all" && r.catalogStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        r.displayName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.registerId.toLowerCase().includes(q)
      );
    });
  }, [listQuery.data, query, statusFilter]);

  const busy =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.activate.isPending ||
    mutations.deactivate.isPending ||
    mutations.archive.isPending;

  function openCreateForm() {
    if (!canManageCatalog) return;
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEditForm(row: CatalogRegisterDto) {
    if (!canManageCatalog) return;
    setEditing(row);
    setForm({
      code: row.code,
      displayName: row.displayName,
      registerType: row.registerType,
    });
    setError(null);
    setFormOpen(true);
  }

  async function submitForm() {
    setError(null);
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          restaurantId,
          registerId: editing.registerId,
          code: form.code,
          displayName: form.displayName,
          registerType: form.registerType,
          expectedVersion: editing.version,
        });
      } else {
        await mutations.create.mutateAsync({
          restaurantId,
          code: form.code,
          displayName: form.displayName,
          registerType: form.registerType,
        });
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section
      className={cn(restaurantDash.panel, "space-y-4 p-4 sm:p-6")}
      dir={dir}
      aria-label={registerCatalogUiLabel("title", language)}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            {registerCatalogUiLabel("title", language)}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {registerCatalogUiLabel("subtitle", language)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {registerCatalogUiLabel("dutyHint", language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void listQuery.refetch()}
            disabled={listQuery.isFetching}
            aria-label={registerCatalogUiLabel("retry", language)}
          >
            {listQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={openCreateForm}
            disabled={!canManageCatalog}
            title={
              canManageCatalog
                ? undefined
                : registerCatalogUiLabel("forbiddenCreate", language)
            }
          >
            {registerCatalogUiLabel("create", language)}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              syncDashboardUrl({ restaurantId, section: "register" })
            }
          >
            {registerCatalogUiLabel("openOperations", language)}
          </Button>
        </div>
      </header>

      {!canManageCatalog && (
        <p className="text-sm text-amber-200/90" role="status">
          {registerCatalogUiLabel("forbiddenCreate", language)}
        </p>
      )}

      {formOpen && canManageCatalog && (
        <div
          className="space-y-3 rounded-xl border border-slate-600/60 bg-slate-900/50 p-4"
          role="form"
          aria-label={
            editing
              ? registerCatalogUiLabel("editDialogTitle", language)
              : registerCatalogUiLabel("createDialogTitle", language)
          }
        >
          <h3 className="text-base font-medium text-white">
            {editing
              ? registerCatalogUiLabel("editDialogTitle", language)
              : registerCatalogUiLabel("createDialogTitle", language)}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="reg-code">
                {registerCatalogUiLabel("code", language)}
              </Label>
              <Input
                id="reg-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-name">
                {registerCatalogUiLabel("displayName", language)}
              </Label>
              <Input
                id="reg-name"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-type">
                {registerCatalogUiLabel("registerType", language)}
              </Label>
              <select
                id="reg-type"
                className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-white"
                value={form.registerType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    registerType: e.target.value as RegisterType,
                  }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {registerTypeLabel(t, language)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void submitForm()}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                registerCatalogUiLabel("save", language)
              )}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              {registerCatalogUiLabel("cancel", language)}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-500 start-3" />
          <Input
            className="ps-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={registerCatalogUiLabel("search", language)}
            aria-label={registerCatalogUiLabel("search", language)}
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group">
          {(
            [
              ["all", "filterAll"],
              ["active", "filterActive"],
              ["provisioned", "filterProvisioned"],
              ["inactive", "filterInactive"],
            ] as const
          ).map(([value, key]) => (
            <Button
              key={value}
              size="sm"
              variant={statusFilter === value ? "default" : "outline"}
              onClick={() => setStatusFilter(value)}
            >
              {registerCatalogUiLabel(key, language)}
            </Button>
          ))}
        </div>
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-slate-400">
          {registerCatalogUiLabel("loading", language)}
        </p>
      ) : listQuery.isError ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-rose-300">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : String(listQuery.error)}
          </p>
          <Button size="sm" onClick={() => void listQuery.refetch()}>
            {registerCatalogUiLabel("retry", language)}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-lg font-medium text-white">
            {registerCatalogUiLabel("emptyTitle", language)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {(listQuery.data?.length ?? 0) === 0
              ? registerCatalogUiLabel("emptySubtitle", language)
              : registerCatalogUiLabel("noResults", language)}
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label={registerCatalogUiLabel("title", language)}>
          {rows.map((row) => (
            <li
              key={row.registerId}
              className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-white">{row.displayName}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {registerCatalogUiLabel("code", language)}: {row.code} ·{" "}
                  {registerTypeLabel(row.registerType, language)} ·{" "}
                  {catalogStatusLabel(row.catalogStatus, language)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManageCatalog && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => openEditForm(row)}
                    >
                      {registerCatalogUiLabel("edit", language)}
                    </Button>
                    {row.catalogStatus !== "active" && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void mutations.activate.mutateAsync({
                            restaurantId,
                            registerId: row.registerId,
                            expectedVersion: row.version,
                          })
                        }
                      >
                        {registerCatalogUiLabel("activate", language)}
                      </Button>
                    )}
                    {row.catalogStatus === "active" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy || row.dutyStatus !== "closed"}
                        title={
                          row.dutyStatus !== "closed"
                            ? registerCatalogUiLabel("dutyHint", language)
                            : undefined
                        }
                        onClick={() =>
                          void mutations.deactivate.mutateAsync({
                            restaurantId,
                            registerId: row.registerId,
                            expectedVersion: row.version,
                          })
                        }
                      >
                        {registerCatalogUiLabel("deactivate", language)}
                      </Button>
                    )}
                    {row.catalogStatus === "inactive" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy || row.dutyStatus !== "closed"}
                        onClick={() =>
                          void mutations.archive.mutateAsync({
                            restaurantId,
                            registerId: row.registerId,
                            expectedVersion: row.version,
                          })
                        }
                      >
                        {registerCatalogUiLabel("archive", language)}
                      </Button>
                    )}
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    syncDashboardUrl({ restaurantId, section: "register" })
                  }
                >
                  {registerCatalogUiLabel("openOperations", language)}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
