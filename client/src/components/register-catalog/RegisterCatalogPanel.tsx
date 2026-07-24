/**
 * REGISTER-CATALOG-MANAGEMENT-1 / REGISTER-CATALOG-VALIDATION-PRESENTATION-1 —
 * Manager Register Catalog host. Presentation only — crmp.catalog.*.
 * Validation presentation maps server errors; no Domain/API/DB changes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import {
  catalogFieldErrorId,
  catalogStatusLabel,
  presentRegisterCatalogError,
  registerCatalogUiLabel,
  registerCatalogValidationMessage,
  registerTypeLabel,
  useRegisterCatalogList,
  useRegisterCatalogMutations,
  type CatalogFormField,
  type CatalogLanguage,
  type CatalogRegisterDto,
  type CatalogValidationMessageKey,
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

function FieldHelper({
  field,
  messageKey,
  language,
}: {
  field: CatalogFormField;
  messageKey: CatalogValidationMessageKey | undefined;
  language: CatalogLanguage;
}) {
  if (!messageKey) return null;
  return (
    <p
      id={catalogFieldErrorId(field)}
      className="text-xs text-rose-300"
      role="alert"
    >
      {registerCatalogValidationMessage(messageKey, language)}
    </p>
  );
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CatalogFormField, CatalogValidationMessageKey>>
  >({});
  const [globalErrorKey, setGlobalErrorKey] =
    useState<CatalogValidationMessageKey | null>(null);
  const [actionErrorKey, setActionErrorKey] =
    useState<CatalogValidationMessageKey | null>(null);

  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const submittingRef = useRef(false);

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

  const formBusy =
    mutations.create.isPending || mutations.update.isPending;
  const listBusy =
    mutations.activate.isPending ||
    mutations.deactivate.isPending ||
    mutations.archive.isPending;
  const busy = formBusy || listBusy;

  function clearPresentationErrors() {
    setFieldErrors({});
    setGlobalErrorKey(null);
  }

  function clearFieldError(field: CatalogFormField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function focusField(field: CatalogFormField | null) {
    if (field === "code") codeRef.current?.focus();
    else if (field === "displayName") nameRef.current?.focus();
    else if (field === "registerType") typeRef.current?.focus();
  }

  function openCreateForm() {
    if (!canManageCatalog) return;
    setEditing(null);
    setForm(emptyForm());
    clearPresentationErrors();
    setActionErrorKey(null);
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
    clearPresentationErrors();
    setActionErrorKey(null);
    setFormOpen(true);
  }

  async function submitForm() {
    if (submittingRef.current || formBusy) return;
    submittingRef.current = true;
    clearPresentationErrors();
    setActionErrorKey(null);
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
        toast.success(
          registerCatalogUiLabel("saveSuccessUpdate", language)
        );
      } else {
        await mutations.create.mutateAsync({
          restaurantId,
          code: form.code,
          displayName: form.displayName,
          registerType: form.registerType,
        });
        toast.success(
          registerCatalogUiLabel("saveSuccessCreate", language)
        );
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm());
    } catch (e) {
      const presented = presentRegisterCatalogError(e);
      setFieldErrors(presented.fieldErrors);
      setGlobalErrorKey(presented.globalKey);
      focusField(presented.firstInvalidField);
    } finally {
      submittingRef.current = false;
    }
  }

  async function runLifecycle(
    action: () => Promise<unknown>
  ): Promise<void> {
    setActionErrorKey(null);
    try {
      await action();
    } catch (e) {
      const presented = presentRegisterCatalogError(e);
      setActionErrorKey(presented.globalKey ?? "unknown");
    }
  }

  const listErrorPresented = listQuery.isError
    ? presentRegisterCatalogError(listQuery.error)
    : null;

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
            disabled={!canManageCatalog || formBusy}
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

      {actionErrorKey && (
        <div
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          role="alert"
        >
          {registerCatalogValidationMessage(actionErrorKey, language)}
        </div>
      )}

      {formOpen && canManageCatalog && (
        <div
          className="space-y-3 rounded-xl border border-slate-600/60 bg-slate-900/50 p-4"
          role="form"
          aria-busy={formBusy || undefined}
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

          {globalErrorKey && (
            <div
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {registerCatalogValidationMessage(globalErrorKey, language)}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="reg-code">
                {registerCatalogUiLabel("code", language)}
              </Label>
              <Input
                ref={codeRef}
                id="reg-code"
                value={form.code}
                onChange={(e) => {
                  clearFieldError("code");
                  setForm((f) => ({ ...f, code: e.target.value }));
                }}
                autoComplete="off"
                disabled={formBusy}
                aria-invalid={fieldErrors.code ? true : undefined}
                aria-describedby={
                  fieldErrors.code ? catalogFieldErrorId("code") : undefined
                }
                className={cn(
                  fieldErrors.code &&
                    "border-rose-500 focus-visible:ring-rose-500"
                )}
              />
              <FieldHelper
                field="code"
                messageKey={fieldErrors.code}
                language={language}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-name">
                {registerCatalogUiLabel("displayName", language)}
              </Label>
              <Input
                ref={nameRef}
                id="reg-name"
                value={form.displayName}
                onChange={(e) => {
                  clearFieldError("displayName");
                  setForm((f) => ({ ...f, displayName: e.target.value }));
                }}
                disabled={formBusy}
                aria-invalid={fieldErrors.displayName ? true : undefined}
                aria-describedby={
                  fieldErrors.displayName
                    ? catalogFieldErrorId("displayName")
                    : undefined
                }
                className={cn(
                  fieldErrors.displayName &&
                    "border-rose-500 focus-visible:ring-rose-500"
                )}
              />
              <FieldHelper
                field="displayName"
                messageKey={fieldErrors.displayName}
                language={language}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-type">
                {registerCatalogUiLabel("registerType", language)}
              </Label>
              <select
                ref={typeRef}
                id="reg-type"
                className={cn(
                  "flex h-10 w-full rounded-md border bg-slate-950 px-3 text-sm text-white",
                  fieldErrors.registerType
                    ? "border-rose-500"
                    : "border-slate-600"
                )}
                value={form.registerType}
                disabled={formBusy}
                aria-invalid={fieldErrors.registerType ? true : undefined}
                aria-describedby={
                  fieldErrors.registerType
                    ? catalogFieldErrorId("registerType")
                    : undefined
                }
                onChange={(e) => {
                  clearFieldError("registerType");
                  setForm((f) => ({
                    ...f,
                    registerType: e.target.value as RegisterType,
                  }));
                }}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {registerTypeLabel(t, language)}
                  </option>
                ))}
              </select>
              <FieldHelper
                field="registerType"
                messageKey={fieldErrors.registerType}
                language={language}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              disabled={formBusy}
              onClick={() => void submitForm()}
              aria-busy={formBusy || undefined}
            >
              {formBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span className="ms-2">
                    {registerCatalogUiLabel("saving", language)}
                  </span>
                </>
              ) : (
                registerCatalogUiLabel("save", language)
              )}
            </Button>
            <Button
              variant="ghost"
              disabled={formBusy}
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
                clearPresentationErrors();
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
      ) : listErrorPresented ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-rose-300">
            {registerCatalogValidationMessage(
              listErrorPresented.globalKey ?? "unknown",
              language
            )}
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
        <ul
          className="space-y-2"
          aria-label={registerCatalogUiLabel("title", language)}
        >
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
                          void runLifecycle(() =>
                            mutations.activate.mutateAsync({
                              restaurantId,
                              registerId: row.registerId,
                              expectedVersion: row.version,
                            })
                          )
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
                          void runLifecycle(() =>
                            mutations.deactivate.mutateAsync({
                              restaurantId,
                              registerId: row.registerId,
                              expectedVersion: row.version,
                            })
                          )
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
                          void runLifecycle(() =>
                            mutations.archive.mutateAsync({
                              restaurantId,
                              registerId: row.registerId,
                              expectedVersion: row.version,
                            })
                          )
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
