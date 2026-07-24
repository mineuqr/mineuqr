/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 — Manager / Counter host.
 * Presentation only — crmp.register.* unchanged. No routing / API changes.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  AvailabilityBadge,
  DutyBadge,
  ShiftBadge,
} from "./RegisterStatusBadges";
import {
  catalogStatusLabel,
  dutyStatusLabel,
  filterRegisterRows,
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
  registerOperationsUiLabel,
  shiftBadgeFromRef,
  toRegisterListRowVm,
  useInvalidateRegisterOperationsQueries,
  useRegisterCurrent,
  useRegisterHistory,
  useRegisterList,
  useRegisterOperationsMutations,
  useResolveActiveRegister,
  type RegisterListRowVm,
  type RegisterOperationsLang,
} from "@/lib/register-operations-presentation";
import { cn } from "@/lib/utils";
import {
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

type Props = {
  restaurantId: number;
  language: RegisterOperationsLang;
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
      className={cn(
        "animate-pulse rounded-lg bg-slate-700/40",
        className
      )}
      aria-hidden
    />
  );
}

function EmptyOnboarding({
  language,
  station,
}: {
  language: RegisterOperationsLang;
  station: boolean;
}) {
  return (
    <div
      className={cn(
        restaurantDash.panel,
        "flex min-h-[min(28rem,70vh)] flex-col items-center justify-center px-6 py-12 text-center sm:px-10"
      )}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "mb-5 flex items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
          station ? "size-20 [&_svg]:size-10" : "size-16 [&_svg]:size-8"
        )}
        aria-hidden
      >
        <WalletCards />
      </div>
      <h2
        className={cn(
          "font-semibold text-white",
          station ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        )}
      >
        {registerOperationsUiLabel("emptyTitle", language)}
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-400 sm:text-base">
        {registerOperationsUiLabel("emptySubtitle", language)}
      </p>
      <OpButton
        station={station}
        className="mt-6 min-w-[12rem]"
        disabled
        aria-disabled="true"
        title={registerOperationsUiLabel("createRegisterDisabledHint", language)}
      >
        {registerOperationsUiLabel("createRegister", language)}
      </OpButton>
      <p className="mt-3 max-w-lg text-xs leading-relaxed text-slate-500 sm:text-sm">
        {registerOperationsUiLabel("createRegisterDisabledHint", language)}
      </p>
    </div>
  );
}

function RegisterCard({
  row,
  selected,
  station,
  shiftLabel,
  shiftTone,
  onSelect,
  language,
}: {
  row: RegisterListRowVm;
  selected: boolean;
  station: boolean;
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
        "w-full rounded-xl border px-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
        station ? "min-h-[4.5rem] py-3" : "min-h-14 py-2.5",
        selected
          ? "border-cyan-400/50 bg-cyan-950/35 shadow-sm shadow-cyan-500/10"
          : "border-slate-700/55 bg-slate-950/35 hover:border-cyan-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
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
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
        <span>
          {registerOperationsUiLabel("currentOperator", language)}:{" "}
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

export function RegisterOperationsPanel({ restaurantId, language }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stationMode, setStationMode] = useState(true);
  const [search, setSearch] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const listQuery = useRegisterList({ restaurantId });
  const currentQuery = useRegisterCurrent(
    { restaurantId, registerId: selectedId ?? "" },
    { enabled: !!selectedId }
  );
  const historyQuery = useRegisterHistory(
    { restaurantId, registerId: selectedId ?? "" },
    { enabled: !!selectedId }
  );

  const mutations = useRegisterOperationsMutations(restaurantId, language);
  const { resolve } = useResolveActiveRegister(language);
  const invalidate = useInvalidateRegisterOperationsQueries();

  const rows = useMemo(
    () => (listQuery.data ?? []).map((r) => toRegisterListRowVm(r, language)),
    [listQuery.data, language]
  );
  const filtered = useMemo(
    () => filterRegisterRows(rows, search),
    [rows, search]
  );

  useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].registerId);
  }, [rows, selectedId]);

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
  const shiftInfo = shiftBadgeFromRef(!!view?.financialShift, language);

  const busy =
    mutations.open.isPending ||
    mutations.close.isPending ||
    mutations.suspend.isPending ||
    mutations.resume.isPending ||
    mutations.assignOperator.isPending ||
    mutations.releaseOperator.isPending ||
    mutations.reassignOperator.isPending ||
    mutations.attachDevice.isPending ||
    mutations.detachDevice.isPending ||
    mutations.replaceDevice.isPending;

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

  const parseOperator = (): number | null => {
    const n = Number.parseInt(operatorId.trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const dir = language === "ar" ? "rtl" : "ltr";

  if (listQuery.isLoading) {
    return (
      <section
        className={cn(restaurantDash.panel, "p-4 sm:p-6")}
        dir={dir}
        aria-busy="true"
        aria-label={registerOperationsUiLabel("title", language)}
      >
        <SkeletonBlock className="mb-4 h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <div className="space-y-2">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
            </div>
            <SkeletonBlock className="h-28 w-full" />
          </div>
        </div>
        <span className="sr-only">
          {registerOperationsUiLabel("loading", language)}
        </span>
      </section>
    );
  }

  if (!listQuery.isLoading && rows.length === 0 && !listError) {
    return (
      <section dir={dir} aria-label={registerOperationsUiLabel("title", language)}>
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              {registerOperationsUiLabel("title", language)}
            </h2>
            <p className="text-sm text-slate-400">
              {registerOperationsUiLabel("subtitle", language)}
            </p>
          </div>
        </header>
        <EmptyOnboarding language={language} station={stationMode} />
        <p className="mt-3 text-center text-xs text-slate-500">
          {registerOperationsUiLabel("listEmptyGuidance", language)}{" "}
          {registerOperationsUiLabel("listEmptyNext", language)}
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        restaurantDash.panel,
        "flex flex-col gap-4 p-4 sm:gap-5 sm:p-6"
      )}
      dir={dir}
      aria-label={registerOperationsUiLabel("title", language)}
    >
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2
            className={cn(
              "font-semibold text-white",
              stationMode ? "text-2xl" : "text-xl"
            )}
          >
            {registerOperationsUiLabel("title", language)}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {registerOperationsUiLabel("subtitle", language)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex max-w-xs flex-col gap-1 rounded-xl border border-slate-700/55 bg-slate-900/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <Switch
                id="register-station-mode"
                checked={stationMode}
                onCheckedChange={setStationMode}
              />
              <Label htmlFor="register-station-mode" className="text-slate-200">
                {registerOperationsUiLabel("stationMode", language)}
              </Label>
            </div>
            <p className="text-[11px] leading-snug text-slate-500">
              {registerOperationsUiLabel("stationModeHint", language)}
            </p>
          </div>
          <OpButton
            station={false}
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
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
              {rows.length === 0
                ? registerOperationsUiLabel("listEmptyGuidance", language)
                : registerOperationsUiLabel("noResults", language)}
            </p>
          ) : (
            <ul
              className="flex max-h-[min(28rem,55vh)] flex-col gap-2 overflow-y-auto pe-0.5"
              role="listbox"
              aria-label={registerOperationsUiLabel(
                "availableRegisters",
                language
              )}
            >
              {filtered.map((row) => {
                const isSelected = selectedId === row.registerId;
                const shift =
                  isSelected && view
                    ? shiftBadgeFromRef(!!view.financialShift, language)
                    : undefined;
                return (
                  <li key={row.registerId}>
                    <RegisterCard
                      row={row}
                      selected={isSelected}
                      station={stationMode}
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

        <div className="flex min-w-0 flex-col gap-4">
          {!selectedId ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/55 px-4 py-10 text-center">
              <p className="font-medium text-slate-200">
                {registerOperationsUiLabel("selectRegister", language)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {registerOperationsUiLabel("selectRegisterHint", language)}
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
              <SkeletonBlock className="h-24" />
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
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                  label={registerOperationsUiLabel("dutyStatus", language)}
                  station={stationMode}
                >
                  <DutyBadge
                    tone={register.dutyStatus}
                    label={dutyStatusLabel(register.dutyStatus, language)}
                  />
                </StatusCard>
                <StatusCard
                  label={registerOperationsUiLabel("currentOperator", language)}
                  station={stationMode}
                >
                  <span className="text-lg font-medium text-white">
                    {register.assignedOperatorUserId != null
                      ? String(register.assignedOperatorUserId)
                      : registerOperationsUiLabel("none", language)}
                  </span>
                </StatusCard>
                <StatusCard
                  label={registerOperationsUiLabel("currentDevice", language)}
                  station={stationMode}
                >
                  <span className="break-all text-lg font-medium text-white">
                    {register.deviceId ??
                      registerOperationsUiLabel("none", language)}
                  </span>
                </StatusCard>
                <StatusCard
                  label={registerOperationsUiLabel("financialShift", language)}
                  station={stationMode}
                >
                  <div className="space-y-1">
                    <ShiftBadge
                      tone={shiftInfo.tone}
                      label={shiftInfo.label}
                    />
                    {view.financialShift && (
                      <p className="truncate font-mono text-[11px] text-slate-400">
                        {view.financialShift.financialShiftId}
                      </p>
                    )}
                  </div>
                </StatusCard>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <AvailabilityBadge
                  tone={
                    register.catalogStatus === "active" ? "ready" : "unavailable"
                  }
                  label={
                    register.catalogStatus === "active"
                      ? registerOperationsUiLabel("ready", language)
                      : registerOperationsUiLabel("unavailable", language)
                  }
                />
                <span>
                  {registerOperationsUiLabel("catalogStatus", language)}:{" "}
                  <span className="text-slate-200">
                    {catalogStatusLabel(register.catalogStatus, language)}
                  </span>
                </span>
                <span>
                  {registerOperationsUiLabel("version", language)}:{" "}
                  <span className="text-slate-200">{register.version}</span>
                </span>
                {(busy || currentQuery.isFetching) && (
                  <span className="inline-flex items-center gap-1 text-cyan-300">
                    <Loader2 className="size-3.5 animate-spin" />
                    {registerOperationsUiLabel("syncing", language)}
                  </span>
                )}
              </div>

              {/* Primary action */}
              <section
                aria-label={registerOperationsUiLabel("primaryActions", language)}
                className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3 sm:p-4"
              >
                <OpButton
                  station={stationMode}
                  className="w-full sm:w-auto sm:min-w-[14rem]"
                  disabled={busy || register.catalogStatus !== "active"}
                  onClick={() =>
                    mutations.open.mutate({
                      restaurantId,
                      registerId: register.registerId,
                      operatorUserId: parseOperator(),
                      expectedVersion: version,
                    })
                  }
                >
                  {registerOperationsUiLabel("open", language)}
                </OpButton>
              </section>

              {/* Contextual duty */}
              <section
                aria-label={registerOperationsUiLabel(
                  "contextualActions",
                  language
                )}
              >
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {registerOperationsUiLabel("actions", language)}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <OpButton
                    station={stationMode}
                    variant="secondary"
                    disabled={busy}
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
                  <OpButton
                    station={stationMode}
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      mutations.resume.mutate({
                        restaurantId,
                        registerId: register.registerId,
                        expectedVersion: version,
                      })
                    }
                  >
                    {registerOperationsUiLabel("resume", language)}
                  </OpButton>
                  <OpButton
                    station={stationMode}
                    variant="destructive"
                    disabled={busy}
                    onClick={() =>
                      mutations.close.mutate({
                        restaurantId,
                        registerId: register.registerId,
                        expectedVersion: version,
                      })
                    }
                  >
                    {registerOperationsUiLabel("close", language)}
                  </OpButton>
                </div>
              </section>

              {/* Operator */}
              <section className="rounded-xl border border-slate-700/50 p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-medium text-slate-400">
                  {registerOperationsUiLabel("currentOperator", language)}
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    inputMode="numeric"
                    placeholder={registerOperationsUiLabel(
                      "operatorUserId",
                      language
                    )}
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className={cn(stationMode && "min-h-12")}
                    aria-label={registerOperationsUiLabel(
                      "operatorUserId",
                      language
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <OpButton
                      station={stationMode}
                      disabled={busy || parseOperator() == null}
                      onClick={() => {
                        const id = parseOperator();
                        if (id == null) return;
                        mutations.assignOperator.mutate({
                          restaurantId,
                          registerId: register.registerId,
                          operatorUserId: id,
                          expectedVersion: version,
                        });
                      }}
                    >
                      {registerOperationsUiLabel("assignOperator", language)}
                    </OpButton>
                    <OpButton
                      station={stationMode}
                      variant="secondary"
                      disabled={busy || parseOperator() == null}
                      onClick={() => {
                        const id = parseOperator();
                        if (id == null) return;
                        mutations.reassignOperator.mutate({
                          restaurantId,
                          registerId: register.registerId,
                          operatorUserId: id,
                          expectedVersion: version,
                        });
                      }}
                    >
                      {registerOperationsUiLabel("reassignOperator", language)}
                    </OpButton>
                    <OpButton
                      station={stationMode}
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        mutations.releaseOperator.mutate({
                          restaurantId,
                          registerId: register.registerId,
                          expectedVersion: version,
                        })
                      }
                    >
                      {registerOperationsUiLabel("releaseOperator", language)}
                    </OpButton>
                  </div>
                </div>
              </section>

              {/* Device */}
              <section className="rounded-xl border border-slate-700/50 p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-medium text-slate-400">
                  {registerOperationsUiLabel("currentDevice", language)}
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder={registerOperationsUiLabel("deviceId", language)}
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className={cn(stationMode && "min-h-12")}
                    aria-label={registerOperationsUiLabel("deviceId", language)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <OpButton
                      station={stationMode}
                      disabled={busy || !deviceId.trim()}
                      onClick={() =>
                        mutations.attachDevice.mutate({
                          restaurantId,
                          registerId: register.registerId,
                          deviceId: deviceId.trim(),
                          expectedVersion: version,
                        })
                      }
                    >
                      {registerOperationsUiLabel("attachDevice", language)}
                    </OpButton>
                    <OpButton
                      station={stationMode}
                      variant="secondary"
                      disabled={busy || !deviceId.trim()}
                      onClick={() =>
                        mutations.replaceDevice.mutate({
                          restaurantId,
                          registerId: register.registerId,
                          deviceId: deviceId.trim(),
                          expectedVersion: version,
                        })
                      }
                    >
                      {registerOperationsUiLabel("replaceDevice", language)}
                    </OpButton>
                    <OpButton
                      station={stationMode}
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        mutations.detachDevice.mutate({
                          restaurantId,
                          registerId: register.registerId,
                          expectedVersion: version,
                        })
                      }
                    >
                      {registerOperationsUiLabel("detachDevice", language)}
                    </OpButton>
                  </div>
                </div>
              </section>

              {/* Recovery */}
              <section className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3 sm:p-4">
                <h3 className="mb-1 text-sm font-medium text-amber-100">
                  {registerOperationsUiLabel("recovery", language)}
                </h3>
                <p className="mb-3 text-xs text-amber-100/75 sm:text-sm">
                  {registerOperationsUiLabel("recoveryHint", language)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <OpButton
                    station={stationMode}
                    variant="secondary"
                    disabled={busy || register.dutyStatus !== "suspended"}
                    onClick={() =>
                      mutations.resume.mutate({
                        restaurantId,
                        registerId: register.registerId,
                        expectedVersion: version,
                      })
                    }
                  >
                    {registerOperationsUiLabel("resume", language)}
                  </OpButton>
                  <OpButton
                    station={stationMode}
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void resolve({
                        restaurantId,
                        registerId: register.registerId,
                      }).then((r) => setSelectedId(r.registerId))
                    }
                  >
                    {registerOperationsUiLabel("resolveActive", language)}
                  </OpButton>
                </div>
              </section>

              {/* History */}
              <section className="rounded-xl border border-slate-700/50 p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-medium text-slate-400">
                  {registerOperationsUiLabel("history", language)}
                </h3>
                {historyQuery.isLoading ? (
                  <div className="space-y-2" aria-busy="true">
                    <SkeletonBlock className="h-8 w-full" />
                    <SkeletonBlock className="h-8 w-full" />
                  </div>
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
                        <span className="font-mono text-xs sm:text-sm">
                          {shift.financialShiftId}
                        </span>
                        <span>
                          {shift.status} · op {shift.operatorUserId}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusCard({
  label,
  children,
  station,
}: {
  label: string;
  children: ReactNode;
  station: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-950/45 p-3",
        station && "p-3.5"
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
