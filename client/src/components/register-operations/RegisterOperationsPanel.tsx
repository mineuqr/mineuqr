/**
 * REGISTER-OPERATIONS-SIMPLIFICATION-1 /
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 /
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 /
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 /
 * FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1 /
 * FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 /
 * REGISTER-CREATION-UX-CONSOLIDATION-1 /
 * REGISTER-CREATION-LABEL-ADOPTION-1 /
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — adaptive Register Operations host.
 * Presentation only — crmp.register.* + crmp.financialShift.*.
 * Shift Archive + human Shift Number; DRAP display window transparent.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { CashDrawerSummaryCard } from "./CashDrawerSummaryCard";
import { FinancialShiftTenderSummaryCard } from "./FinancialShiftTenderSummaryCard";
import { OpeningFloatDialog } from "./OpeningFloatDialog";
import {
  ShiftClosingSummaryDialog,
  type ShiftClosingConfirmPayload,
} from "./ShiftClosingSummaryDialog";
import { ShiftClosingPrintHost } from "./ShiftClosingPrintHost";
import { CreateRegisterDialog } from "./CreateRegisterDialog";
import { FinancialShiftArchivePanel } from "./FinancialShiftArchivePanel";
import {
  AvailabilityBadge,
  DutyBadge,
  ShiftBadge,
} from "./RegisterStatusBadges";
import {
  closeRequiresCashCount,
  dutyStatusLabel,
  filterRegisterRows,
  formatRegisterMoneyDisplay,
  mapRegisterOperationsApiError,
  needsOpeningFloatPrompt,
  presentFriendlyDevice,
  presentFriendlyOperator,
  printShiftClosingReport,
  registerOperationsErrorMessage,
  registerOperationsUiLabel,
  rememberActiveRegister,
  resolvePrimaryDutyAction,
  resolveRegisterOpsLayoutMode,
  selectActiveRegisters,
  shiftBadgeFromRef,
  toRegisterListRowVm,
  useFinancialShiftCurrent,
  useFinancialShiftMutations,
  useFinancialShiftTenderSummary,
  useInvalidateRegisterOperationsQueries,
  useRegisterCurrent,
  useRegisterHistory,
  useRegisterList,
  useRegisterOperationsMutations,
  type RegisterListRowVm,
  type RegisterOperationsLang,
  type ShiftClosingReportVm,
} from "@/lib/register-operations-presentation";
import { spaNavigate } from "@/const";
import { cn } from "@/lib/utils";
import { Loader2, Plus, RefreshCw, Search, WalletCards } from "lucide-react";

type Props = {
  restaurantId: number;
  language: RegisterOperationsLang;
  canManageCatalog?: boolean;
  currencyCode?: string;
  currencySymbol?: string;
  restaurantName?: string;
};

function OpButton({
  station,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & { station?: boolean }) {
  return (
    <Button
      {...props}
      className={cn(
        "touch-manipulation",
        station ? "min-h-12 text-sm sm:min-h-14 sm:text-base" : "min-h-10",
        className
      )}
    >
      {children}
    </Button>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-700/40", className)}
      aria-hidden
    />
  );
}

function StatusCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-950/45 p-3 sm:p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function EmptyOnboarding({
  language,
  restaurantId,
  canManageCatalog,
  variant,
  refreshing,
  onCreate,
  onRefresh,
}: {
  language: RegisterOperationsLang;
  restaurantId: number;
  canManageCatalog: boolean;
  variant: "none" | "inactive";
  refreshing: boolean;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const titleKey =
    variant === "inactive" ? "noActiveRegisterTitle" : "emptyTitle";
  const subtitleKey =
    variant === "inactive" ? "noActiveRegisterSubtitle" : "emptySubtitle";

  return (
    <div
      className={cn(
        restaurantDash.panel,
        "flex min-h-[min(28rem,70vh)] flex-col items-center justify-center px-6 py-12 text-center sm:px-10"
      )}
      dir={language === "ar" ? "rtl" : "ltr"}
      data-register-empty={variant}
    >
      <div
        className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 sm:size-20 [&_svg]:size-8 sm:[&_svg]:size-10"
        aria-hidden
      >
        <WalletCards />
      </div>
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        {registerOperationsUiLabel(titleKey, language)}
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-400 sm:text-base">
        {registerOperationsUiLabel(subtitleKey, language)}
      </p>
      <div className="mt-6 flex w-full max-w-md flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
        <OpButton
          station
          className="min-w-[12rem]"
          disabled={!canManageCatalog}
          aria-disabled={!canManageCatalog ? "true" : undefined}
          title={
            canManageCatalog
              ? undefined
              : registerOperationsUiLabel(
                  "createRegisterDisabledHint",
                  language
                )
          }
          onClick={() => {
            if (!canManageCatalog) return;
            onCreate();
          }}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span className="ms-1.5">
            {registerOperationsUiLabel("createRegister", language)}
          </span>
        </OpButton>
        {variant === "inactive" && canManageCatalog && (
          <OpButton
            variant="secondary"
            className="min-w-[12rem]"
            onClick={() =>
              spaNavigate(
                `/dashboard?restaurant=${restaurantId}&section=register-catalog`
              )
            }
          >
            {registerOperationsUiLabel("openCatalogActivate", language)}
          </OpButton>
        )}
        <OpButton
          variant="outline"
          className="min-w-[8rem]"
          disabled={refreshing}
          onClick={onRefresh}
          aria-label={registerOperationsUiLabel("refresh", language)}
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          <span className="ms-1.5">
            {registerOperationsUiLabel("refresh", language)}
          </span>
        </OpButton>
      </div>
      {!canManageCatalog && (
        <p className="mt-3 max-w-lg text-xs text-slate-500 sm:text-sm">
          {registerOperationsUiLabel("createRegisterDisabledHint", language)}
        </p>
      )}
    </div>
  );
}

function RegisterCard({
  row,
  selected,
  shiftLabel,
  shiftTone,
  onSelect,
  language,
}: {
  row: RegisterListRowVm;
  selected: boolean;
  shiftLabel?: string;
  shiftTone?: "active" | "none";
  onSelect: () => void;
  language: RegisterOperationsLang;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "w-full min-h-14 rounded-xl border px-3 py-2.5 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
        selected
          ? "border-cyan-400/50 bg-cyan-950/35 shadow-sm shadow-cyan-500/10"
          : "border-slate-700/55 bg-slate-950/35 hover:border-cyan-500/30"
      )}
    >
      <div className="truncate font-medium text-white">{row.displayName}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <DutyBadge tone={row.dutyTone} label={row.dutyLabel} />
        <AvailabilityBadge
          tone={row.availabilityTone}
          label={row.availabilityLabel}
        />
        {shiftLabel && shiftTone && (
          <ShiftBadge tone={shiftTone} label={shiftLabel} />
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
        <span>
          {registerOperationsUiLabel("currentUser", language)}:{" "}
          <span className="text-slate-200">{row.operatorLabel}</span>
        </span>
        <span className="truncate">
          {registerOperationsUiLabel("currentDevice", language)}:{" "}
          <span className="text-slate-200">{row.deviceLabel}</span>
        </span>
      </div>
    </button>
  );
}

export function RegisterOperationsPanel({
  restaurantId,
  language,
  canManageCatalog = true,
  currencyCode = "SAR",
  currencySymbol = "ر.س",
  restaurantName = "",
}: Props) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cashCountOpen, setCashCountOpen] = useState(false);
  const [closeVariance, setCloseVariance] = useState<string | null>(null);
  /** Sole print payload for ShiftClosingPrintHost (one root). */
  const [closingPrintReport, setClosingPrintReport] =
    useState<ShiftClosingReportVm | null>(null);
  const [createRegisterOpen, setCreateRegisterOpen] = useState(false);
  const [opsView, setOpsView] = useState<"current" | "archive">("current");

  const listQuery = useRegisterList({ restaurantId });
  const currentQuery = useRegisterCurrent(
    { restaurantId, registerId: selectedId ?? "" },
    { enabled: !!selectedId }
  );
  const historyQuery = useRegisterHistory(
    { restaurantId, registerId: selectedId ?? "" },
    { enabled: !!selectedId }
  );
  const shiftQuery = useFinancialShiftCurrent(
    { restaurantId, registerId: selectedId ?? "" },
    { enabled: !!selectedId }
  );
  const tenderQuery = useFinancialShiftTenderSummary(
    { restaurantId, registerId: selectedId ?? "" },
    { enabled: !!selectedId && !!shiftQuery.data }
  );

  const mutations = useRegisterOperationsMutations(restaurantId, language);
  const shiftMutations = useFinancialShiftMutations(restaurantId, language);
  const invalidate = useInvalidateRegisterOperationsQueries();

  const registers = listQuery.data ?? [];
  const activeRegisters = useMemo(
    () => selectActiveRegisters(registers),
    [registers]
  );
  const layoutMode = useMemo(
    () => resolveRegisterOpsLayoutMode(registers),
    [registers]
  );
  const simpleMode = layoutMode === "simple";

  const rows = useMemo(
    () => registers.map((r) => toRegisterListRowVm(r, language)),
    [registers, language]
  );
  const filtered = useMemo(
    () => filterRegisterRows(rows, search),
    [rows, search]
  );

  useEffect(() => {
    if (simpleMode && activeRegisters[0]) {
      setSelectedId(activeRegisters[0].registerId);
      return;
    }
    if (!selectedId && activeRegisters[0]) {
      setSelectedId(activeRegisters[0].registerId);
      return;
    }
    if (!selectedId && rows[0]) setSelectedId(rows[0].registerId);
  }, [simpleMode, activeRegisters, rows, selectedId]);

  useEffect(() => {
    rememberActiveRegister(restaurantId, selectedId);
  }, [restaurantId, selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        void invalidate(restaurantId, selectedId ?? undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [invalidate, restaurantId, selectedId]);

  const view = currentQuery.data;
  const register = view?.register;
  const version = register?.version;
  const activeShift = shiftQuery.data ?? null;
  const hasActiveShift = activeShift != null;
  const shiftInfo = shiftBadgeFromRef(
    hasActiveShift || !!view?.financialShift,
    language
  );

  const showOpeningFloat = needsOpeningFloatPrompt({
    dutyStatus: register?.dutyStatus,
    hasActiveFinancialShift: hasActiveShift,
    currentLoaded: !!register && !currentQuery.isLoading && !shiftQuery.isLoading,
  });

  const operatorVm = presentFriendlyOperator({
    assignedOperatorUserId: register?.assignedOperatorUserId ?? null,
    currentUserId: user?.id ?? null,
    currentUserName: user?.name ?? null,
    currentUserRole: user?.role ?? null,
    language,
  });
  const deviceVm = presentFriendlyDevice({
    deviceId: register?.deviceId ?? null,
    language,
  });

  const primaryAction = register
    ? resolvePrimaryDutyAction({
        catalogStatus: register.catalogStatus,
        dutyStatus: register.dutyStatus,
      })
    : null;

  const busy =
    mutations.open.isPending ||
    mutations.close.isPending ||
    mutations.suspend.isPending ||
    mutations.resume.isPending ||
    shiftMutations.open.isPending ||
    shiftMutations.close.isPending;

  const listError =
    listQuery.error != null
      ? registerOperationsErrorMessage(
          mapRegisterOperationsApiError(listQuery.error),
          language
        )
      : null;

  const currentError =
    currentQuery.error != null
      ? registerOperationsErrorMessage(
          mapRegisterOperationsApiError(currentQuery.error),
          language
        )
      : null;

  const dir = language === "ar" ? "rtl" : "ltr";

  function closeDuty() {
    if (!register) return;
    mutations.close.mutate({
      restaurantId,
      registerId: register.registerId,
      expectedVersion: version,
    });
  }

  function runPrimaryAction() {
    if (!register || !primaryAction) return;
    const base = {
      restaurantId,
      registerId: register.registerId,
      expectedVersion: version,
    };
    if (primaryAction === "open") {
      mutations.open.mutate({
        ...base,
        operatorUserId: user?.id ?? null,
      });
      return;
    }
    if (primaryAction === "close") {
      if (
        closeRequiresCashCount({
          dutyStatus: register.dutyStatus,
          hasActiveFinancialShift: hasActiveShift,
        })
      ) {
        setCloseVariance(null);
        setCashCountOpen(true);
        return;
      }
      closeDuty();
      return;
    }
    mutations.resume.mutate(base);
  }

  async function confirmCashCount(payload: ShiftClosingConfirmPayload) {
    if (!activeShift || !register || !user?.id) return;
    try {
      const closed = await shiftMutations.close.mutateAsync({
        restaurantId,
        financialShiftId: activeShift.financialShiftId,
        actualCashAmount: payload.actualCashAmount,
        actorUserId: user.id,
        expectedVersion: activeShift.version,
      });
      setCloseVariance(closed.shift.finalCount?.varianceAmount ?? null);
      setCashCountOpen(false);
      await mutations.close.mutateAsync({
        restaurantId,
        registerId: register.registerId,
      });
      if (payload.autoPrint) {
        runClosingPrint(payload.report);
      }
    } catch {
      /* toasts from mutation hooks */
    }
  }

  function runClosingPrint(report: ShiftClosingReportVm) {
    setClosingPrintReport(report);
    window.setTimeout(() => {
      printShiftClosingReport();
    }, 50);
  }

  function confirmOpeningFloat(openingFloatAmount: string) {
    if (!register || !user?.id) return;
    shiftMutations.open.mutate({
      restaurantId,
      registerId: register.registerId,
      operatorUserId: user.id,
      openingFloatAmount,
      currencyCode: currencyCode || "SAR",
    });
  }

  if (listQuery.isLoading) {
    return (
      <section
        className={cn(restaurantDash.panel, "p-4 sm:p-6")}
        dir={dir}
        aria-busy="true"
        aria-label={registerOperationsUiLabel("title", language)}
      >
        <SkeletonBlock className="mb-4 h-8 w-56" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-20" />
        </div>
        <SkeletonBlock className="mt-4 h-28 w-full" />
        <span className="sr-only">
          {registerOperationsUiLabel("loading", language)}
        </span>
      </section>
    );
  }

  if (opsView === "archive") {
    return (
      <FinancialShiftArchivePanel
        restaurantId={restaurantId}
        language={language}
        currencySymbol={currencySymbol}
        restaurantName={restaurantName}
        onBack={() => setOpsView("current")}
      />
    );
  }

  if (!listQuery.isLoading && registers.length === 0 && !listError) {
    return (
      <section dir={dir} aria-label={registerOperationsUiLabel("title", language)}>
        <EmptyOnboarding
          language={language}
          restaurantId={restaurantId}
          canManageCatalog={canManageCatalog}
          variant="none"
          refreshing={listQuery.isFetching}
          onCreate={() => setCreateRegisterOpen(true)}
          onRefresh={() => void listQuery.refetch()}
        />
        <CreateRegisterDialog
          open={createRegisterOpen}
          restaurantId={restaurantId}
          language={language}
          onOpenChange={setCreateRegisterOpen}
          onCreated={() => void invalidate(restaurantId)}
        />
      </section>
    );
  }

  if (
    !listQuery.isLoading &&
    activeRegisters.length === 0 &&
    registers.length > 0 &&
    !listError
  ) {
    return (
      <section dir={dir} aria-label={registerOperationsUiLabel("title", language)}>
        <EmptyOnboarding
          language={language}
          restaurantId={restaurantId}
          canManageCatalog={canManageCatalog}
          variant="inactive"
          refreshing={listQuery.isFetching}
          onCreate={() => setCreateRegisterOpen(true)}
          onRefresh={() => void listQuery.refetch()}
        />
        <CreateRegisterDialog
          open={createRegisterOpen}
          restaurantId={restaurantId}
          language={language}
          onOpenChange={setCreateRegisterOpen}
          onCreated={() => void invalidate(restaurantId)}
        />
      </section>
    );
  }

  const registerTitle =
    register?.displayName?.trim() ||
    registerOperationsUiLabel("mainRegister", language);

  return (
    <section
      className={cn(
        restaurantDash.panel,
        "flex min-w-0 flex-col gap-4 overflow-x-hidden p-4 sm:gap-5 sm:p-6"
      )}
      dir={dir}
      aria-label={registerOperationsUiLabel("title", language)}
      data-layout-mode={layoutMode}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            {registerOperationsUiLabel("title", language)}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {registerOperationsUiLabel("subtitle", language)}
          </p>
          {simpleMode && register && (
            <p className="mt-3 text-base text-slate-200">
              <span className="text-slate-500">
                {registerOperationsUiLabel("registerLabel", language)}
              </span>
              <span className="mx-2 text-slate-600">·</span>
              <span className="font-medium text-white">{registerTitle}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OpButton
            size="sm"
            variant="secondary"
            className="min-h-9"
            onClick={() => setOpsView("archive")}
          >
            {registerOperationsUiLabel("shiftArchive", language)}
          </OpButton>
          {canManageCatalog && (
            <OpButton
              size="sm"
              className="min-h-9"
              onClick={() => setCreateRegisterOpen(true)}
              aria-label={registerOperationsUiLabel("createRegister", language)}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              <span className="ms-1.5">
                {registerOperationsUiLabel("createRegister", language)}
              </span>
            </OpButton>
          )}
          <OpButton
            size="sm"
            variant="outline"
            className="min-h-9"
            disabled={listQuery.isFetching || busy}
            onClick={() =>
              void invalidate(restaurantId, selectedId ?? undefined)
            }
            aria-label={registerOperationsUiLabel("refresh", language)}
          >
            {listQuery.isFetching || currentQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            <span className="ms-1.5 hidden sm:inline">
              {registerOperationsUiLabel("refresh", language)}
            </span>
          </OpButton>
        </div>
      </header>

      {listError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-3 text-rose-100"
        >
          <p>{listError}</p>
          <OpButton
            className="mt-3"
            variant="outline"
            onClick={() => void listQuery.refetch()}
          >
            {registerOperationsUiLabel("retry", language)}
          </OpButton>
        </div>
      )}

      <div
        className={cn(
          "grid min-w-0 gap-4",
          !simpleMode &&
            "lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]"
        )}
      >
        {!simpleMode && (
          <aside className="flex flex-col gap-3 rounded-xl border border-slate-700/50 bg-slate-900/35 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {registerOperationsUiLabel("availableRegisters", language)}
              </h3>
              <span className="text-xs text-slate-500">{rows.length}</span>
            </div>
            {rows.length > 3 && (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={registerOperationsUiLabel(
                    "searchRegisters",
                    language
                  )}
                  aria-label={registerOperationsUiLabel(
                    "searchRegisters",
                    language
                  )}
                  className="ps-9"
                />
              </div>
            )}
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-700/60 px-3 py-6 text-center text-sm text-slate-500">
                {registerOperationsUiLabel("noResults", language)}
              </p>
            ) : (
              <ul
                className="flex max-h-[min(28rem,55vh)] flex-col gap-2 overflow-y-auto"
                role="listbox"
                aria-label={registerOperationsUiLabel(
                  "availableRegisters",
                  language
                )}
              >
                {filtered.map((row) => {
                  const isSelected = selectedId === row.registerId;
                  const shift =
                    isSelected && (activeShift || view)
                      ? shiftBadgeFromRef(
                          hasActiveShift || !!view?.financialShift,
                          language
                        )
                      : undefined;
                  return (
                    <li key={row.registerId}>
                      <RegisterCard
                        row={row}
                        selected={isSelected}
                        language={language}
                        shiftLabel={shift?.label}
                        shiftTone={shift?.tone}
                        onSelect={() => setSelectedId(row.registerId)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        )}

        <div className="flex min-w-0 flex-col gap-4">
          {!selectedId ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/55 px-4 py-10 text-center">
              <p className="font-medium text-slate-200">
                {registerOperationsUiLabel("selectRegister", language)}
              </p>
            </div>
          ) : currentQuery.isLoading && !register ? (
            <div className="space-y-3" aria-busy="true">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
              </div>
              <span className="sr-only">
                {registerOperationsUiLabel("loading", language)}
              </span>
            </div>
          ) : !register ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/35 bg-rose-950/30 px-4 py-4 text-rose-100"
            >
              <p>
                {currentError ??
                  registerOperationsUiLabel("selectRegister", language)}
              </p>
              <OpButton
                className="mt-3"
                variant="outline"
                onClick={() => void currentQuery.refetch()}
              >
                {registerOperationsUiLabel("retry", language)}
              </OpButton>
            </div>
          ) : (
            <>
              <section
                aria-label={registerOperationsUiLabel(
                  "registerSection",
                  language
                )}
                className="space-y-2"
              >
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {registerOperationsUiLabel("registerSection", language)}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <StatusCard
                    label={registerOperationsUiLabel("registerStatus", language)}
                  >
                    <DutyBadge
                      tone={register.dutyStatus}
                      label={dutyStatusLabel(register.dutyStatus, language)}
                    />
                  </StatusCard>
                  <StatusCard
                    label={registerOperationsUiLabel("currentUser", language)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-100"
                        aria-hidden
                      >
                        {operatorVm.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {operatorVm.title}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {operatorVm.subtitle}
                        </p>
                      </div>
                    </div>
                  </StatusCard>
                  <StatusCard
                    label={registerOperationsUiLabel("currentDevice", language)}
                  >
                    <p className="font-medium text-white">{deviceVm.title}</p>
                    <p className="text-xs text-slate-400">{deviceVm.subtitle}</p>
                  </StatusCard>
                </div>
              </section>

              <section
                aria-label={registerOperationsUiLabel(
                  "financialShiftSection",
                  language
                )}
                className="space-y-2"
              >
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {registerOperationsUiLabel("financialShiftSection", language)}
                </h3>
                <StatusCard
                  label={registerOperationsUiLabel("shiftStatus", language)}
                >
                  <ShiftBadge tone={shiftInfo.tone} label={shiftInfo.label} />
                </StatusCard>
              </section>

              {activeShift && (
                <CashDrawerSummaryCard
                  language={language}
                  currencySymbol={currencySymbol}
                  openingFloatAmount={activeShift.openingFloatAmount}
                  expectedCashAmount={activeShift.expectedCashAmount}
                  actualCashAmount={
                    activeShift.finalCount?.actualAmount ?? null
                  }
                  differenceAmount={
                    activeShift.finalCount?.varianceAmount ??
                    closeVariance
                  }
                  openedAt={activeShift.openedAt}
                  shiftStatusLabel={shiftInfo.label}
                  shiftTone={shiftInfo.tone}
                />
              )}

              {activeShift && (
                <FinancialShiftTenderSummaryCard
                  language={language}
                  currencySymbol={currencySymbol}
                  summary={tenderQuery.data}
                  loading={tenderQuery.isLoading || tenderQuery.isFetching}
                />
              )}

              {closeVariance != null && (
                <div
                  role="status"
                  className="rounded-xl border border-slate-600/40 bg-slate-900/40 px-4 py-3 text-sm text-slate-200"
                >
                  {registerOperationsUiLabel("cashCountDifference", language)}:{" "}
                  <span className="font-medium text-white">
                    {formatRegisterMoneyDisplay(
                      closeVariance,
                      currencySymbol,
                      language
                    )}
                  </span>
                </div>
              )}

              {register.catalogStatus !== "active" && (
                <div
                  className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100"
                  role="status"
                >
                  <p>
                    {registerOperationsUiLabel("catalogActivateHint", language)}
                  </p>
                  {canManageCatalog && (
                    <OpButton
                      className="mt-3"
                      variant="outline"
                      onClick={() =>
                        spaNavigate(
                          `/dashboard?restaurant=${restaurantId}&section=register-catalog`
                        )
                      }
                    >
                      {registerOperationsUiLabel("openCatalogActivate", language)}
                    </OpButton>
                  )}
                </div>
              )}

              <section
                aria-label={registerOperationsUiLabel("primaryActions", language)}
                className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3 sm:p-4"
              >
                {primaryAction ? (
                  <OpButton
                    station
                    className="w-full sm:w-auto sm:min-w-[14rem]"
                    disabled={busy || showOpeningFloat}
                    variant={
                      primaryAction === "close" ? "destructive" : "default"
                    }
                    onClick={runPrimaryAction}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      registerOperationsUiLabel(
                        primaryAction === "open"
                          ? "open"
                          : primaryAction === "close"
                            ? "close"
                            : "resume",
                        language
                      )
                    )}
                  </OpButton>
                ) : (
                  <p className="text-sm text-slate-300">
                    {registerOperationsUiLabel("openDisabledHint", language)}
                  </p>
                )}
                {(busy || currentQuery.isFetching || shiftQuery.isFetching) && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300">
                    <Loader2 className="size-3.5 animate-spin" />
                    {registerOperationsUiLabel("syncing", language)}
                  </p>
                )}
              </section>

              {!simpleMode && register.dutyStatus === "open" && (
                <section
                  aria-label={registerOperationsUiLabel("actions", language)}
                >
                  <OpButton
                    variant="secondary"
                    disabled={busy || showOpeningFloat}
                    onClick={() =>
                      mutations.suspend.mutate({
                        restaurantId,
                        registerId: register.registerId,
                        expectedVersion: version,
                      })
                    }
                  >
                    {registerOperationsUiLabel("suspend", language)}
                  </OpButton>
                </section>
              )}

              {!simpleMode && (
                <section className="rounded-xl border border-slate-700/50 p-3 sm:p-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-400">
                    {registerOperationsUiLabel("history", language)}
                  </h3>
                  {historyQuery.isLoading ? (
                    <SkeletonBlock className="h-8 w-full" />
                  ) : (historyQuery.data?.shifts.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500">
                      {registerOperationsUiLabel("noShift", language)}
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-800">
                      {historyQuery.data!.shifts.map((shift) => (
                        <li
                          key={shift.financialShiftId}
                          className="flex flex-wrap justify-between gap-2 py-2 text-sm text-slate-300"
                        >
                          <span>
                            {registerOperationsUiLabel("currentShift", language)}
                          </span>
                          <span className="text-slate-400">{shift.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <OpeningFloatDialog
        open={showOpeningFloat}
        language={language}
        currencySymbol={currencySymbol}
        pending={shiftMutations.open.isPending || mutations.close.isPending}
        onConfirm={confirmOpeningFloat}
        onCloseDutyWithoutShift={closeDuty}
      />

      {activeShift && (
        <ShiftClosingSummaryDialog
          key={
            cashCountOpen
              ? `${activeShift.financialShiftId}:${activeShift.expectedCashAmount}`
              : "closed"
          }
          open={cashCountOpen}
          language={language}
          currencySymbol={currencySymbol}
          restaurantName={restaurantName}
          registerName={registerTitle}
          operatorName={
            operatorVm.title || user?.name || registerOperationsUiLabel("currentUserFallback", language)
          }
          financialShiftId={activeShift.financialShiftId}
          shiftNumber={activeShift.shiftNumber}
          openedAt={activeShift.openedAt}
          openingFloatAmount={activeShift.openingFloatAmount}
          expectedCashAmount={activeShift.expectedCashAmount}
          tenderSummary={tenderQuery.data}
          tenderLoading={tenderQuery.isLoading || tenderQuery.isFetching}
          pending={
            shiftMutations.close.isPending || mutations.close.isPending
          }
          onConfirm={(payload) => void confirmCashCount(payload)}
          onPrint={runClosingPrint}
          onCancel={() => setCashCountOpen(false)}
        />
      )}

      <ShiftClosingPrintHost
        language={language}
        currencySymbol={currencySymbol}
        report={closingPrintReport}
      />

      <CreateRegisterDialog
        open={createRegisterOpen}
        restaurantId={restaurantId}
        language={language}
        onOpenChange={setCreateRegisterOpen}
        onCreated={() => void invalidate(restaurantId, selectedId ?? undefined)}
      />
    </section>
  );
}
