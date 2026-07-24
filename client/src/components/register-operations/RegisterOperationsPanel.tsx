/**
 * REGISTER-OPERATIONS-UI-1 — Manager / Counter host for Register Operations.
 * Presentation only — all commands via crmp.register.*.
 */

import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  availabilityLabelFromDto,
  catalogStatusLabel,
  dutyStatusLabel,
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
  registerOperationsUiLabel,
  toRegisterListRowVm,
  useInvalidateRegisterOperationsQueries,
  useRegisterCurrent,
  useRegisterHistory,
  useRegisterList,
  useRegisterOperationsMutations,
  useResolveActiveRegister,
  type RegisterOperationsLang,
} from "@/lib/register-operations-presentation";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";

type Props = {
  restaurantId: number;
  language: RegisterOperationsLang;
};

function ActionButton({
  station,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & { station: boolean }) {
  return (
    <Button
      {...props}
      className={cn(
        station && "min-h-14 touch-manipulation text-base sm:min-h-16 sm:text-lg",
        !station && "min-h-11 touch-manipulation",
        className
      )}
    >
      {children}
    </Button>
  );
}

export function RegisterOperationsPanel({ restaurantId, language }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stationMode, setStationMode] = useState(true);
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

  useEffect(() => {
    if (!selectedId && rows[0]) {
      setSelectedId(rows[0].registerId);
    }
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
          language,
          (listQuery.error as { message?: string }).message
        )
      : null;

  const currentError =
    currentQuery.error != null
      ? registerOperationsErrorMessage(
          mapRegisterOperationsApiError(currentQuery.error),
          language,
          (currentQuery.error as { message?: string }).message
        )
      : null;

  const parseOperator = (): number | null => {
    const n = Number.parseInt(operatorId.trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  return (
    <section
      className={cn(
        restaurantDash.panel,
        "flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-7",
        stationMode && "gap-5 sm:gap-6"
      )}
      aria-label={registerOperationsUiLabel("title", language)}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className={cn(
              "font-semibold text-white",
              stationMode ? "text-2xl sm:text-3xl" : "text-xl"
            )}
          >
            {registerOperationsUiLabel("title", language)}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {registerOperationsUiLabel("subtitle", language)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
            <Switch
              id="register-station-mode"
              checked={stationMode}
              onCheckedChange={setStationMode}
            />
            <Label htmlFor="register-station-mode" className="text-slate-200">
              {registerOperationsUiLabel("stationMode", language)}
            </Label>
          </div>
          <ActionButton
            station={stationMode}
            variant="secondary"
            disabled={listQuery.isFetching || busy}
            onClick={() => void invalidate(restaurantId, selectedId ?? undefined)}
          >
            {listQuery.isFetching || currentQuery.isFetching ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="me-2 h-4 w-4" aria-hidden />
            )}
            {registerOperationsUiLabel("refresh", language)}
          </ActionButton>
        </div>
      </header>

      {listError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-rose-100"
        >
          <p>{listError}</p>
          <ActionButton
            station={stationMode}
            className="mt-3"
            variant="outline"
            onClick={() => void listQuery.refetch()}
          >
            {registerOperationsUiLabel("retry", language)}
          </ActionButton>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr] xl:grid-cols-[minmax(0,20rem)_1fr]">
        {/* Available registers */}
        <aside className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            {registerOperationsUiLabel("availableRegisters", language)}
          </h3>
          {listQuery.isLoading ? (
            <p className="flex items-center gap-2 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {registerOperationsUiLabel("loading", language)}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-slate-400">
              {registerOperationsUiLabel("noRegisters", language)}
            </p>
          ) : (
            <ul className="flex flex-col gap-2" role="listbox">
              {rows.map((row) => (
                <li key={row.registerId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedId === row.registerId}
                    className={cn(
                      "w-full rounded-lg border px-3 text-start transition",
                      stationMode ? "min-h-16 py-3" : "min-h-12 py-2",
                      selectedId === row.registerId
                        ? "border-cyan-400/50 bg-cyan-950/40 text-white"
                        : "border-slate-700/60 bg-slate-950/40 text-slate-200 hover:border-cyan-500/30"
                    )}
                    onClick={() => setSelectedId(row.registerId)}
                  >
                    <div className="font-medium">{row.displayName}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {row.dutyLabel} · {row.availabilityLabel}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Details + actions */}
        <div className="flex min-w-0 flex-col gap-4">
          {!selectedId || !register ? (
            <div className="rounded-xl border border-dashed border-slate-700/60 p-8 text-center text-slate-400">
              {currentQuery.isLoading
                ? registerOperationsUiLabel("loading", language)
                : registerOperationsUiLabel("selectRegister", language)}
              {currentError && (
                <p className="mt-3 text-rose-300" role="alert">
                  {currentError}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                  label={registerOperationsUiLabel("dutyStatus", language)}
                  value={dutyStatusLabel(register.dutyStatus, language)}
                  station={stationMode}
                />
                <StatusCard
                  label={registerOperationsUiLabel("currentOperator", language)}
                  value={
                    register.assignedOperatorUserId != null
                      ? String(register.assignedOperatorUserId)
                      : registerOperationsUiLabel("none", language)
                  }
                  station={stationMode}
                />
                <StatusCard
                  label={registerOperationsUiLabel("currentDevice", language)}
                  value={
                    register.deviceId ??
                    registerOperationsUiLabel("none", language)
                  }
                  station={stationMode}
                />
                <StatusCard
                  label={registerOperationsUiLabel("financialShift", language)}
                  value={
                    view.financialShift
                      ? `${view.financialShift.financialShiftId} (${view.financialShift.status})`
                      : registerOperationsUiLabel("noShift", language)
                  }
                  station={stationMode}
                />
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-3 sm:p-4 text-sm text-slate-300">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    {registerOperationsUiLabel("catalogStatus", language)}:{" "}
                    <strong className="text-white">
                      {catalogStatusLabel(register.catalogStatus, language)}
                    </strong>
                  </span>
                  <span>
                    {registerOperationsUiLabel("availability", language)}:{" "}
                    <strong className="text-white">
                      {availabilityLabelFromDto(register, language)}
                    </strong>
                  </span>
                  <span>
                    {registerOperationsUiLabel("version", language)}:{" "}
                    <strong className="text-white">{register.version}</strong>
                  </span>
                  {(busy || currentQuery.isFetching) && (
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {registerOperationsUiLabel("syncing", language)}
                    </span>
                  )}
                </div>
              </div>

              {/* Duty actions */}
              <section aria-label={registerOperationsUiLabel("actions", language)}>
                <h3 className="mb-2 text-sm font-medium text-slate-400">
                  {registerOperationsUiLabel("actions", language)}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ActionButton
                    station={stationMode}
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
                  </ActionButton>
                  <ActionButton
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
                  </ActionButton>
                  <ActionButton
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
                  </ActionButton>
                  <ActionButton
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
                  </ActionButton>
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
                    className={cn(stationMode && "min-h-14 text-lg")}
                    aria-label={registerOperationsUiLabel(
                      "operatorUserId",
                      language
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <ActionButton
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
                    </ActionButton>
                    <ActionButton
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
                    </ActionButton>
                    <ActionButton
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
                    </ActionButton>
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
                    className={cn(stationMode && "min-h-14 text-lg")}
                    aria-label={registerOperationsUiLabel("deviceId", language)}
                  />
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <ActionButton
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
                    </ActionButton>
                    <ActionButton
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
                    </ActionButton>
                    <ActionButton
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
                    </ActionButton>
                  </div>
                </div>
              </section>

              {/* Recovery */}
              <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 sm:p-4">
                <h3 className="mb-1 text-sm font-medium text-amber-200">
                  {registerOperationsUiLabel("recovery", language)}
                </h3>
                <p className="mb-3 text-xs text-amber-100/80 sm:text-sm">
                  {registerOperationsUiLabel("recoveryHint", language)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
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
                  </ActionButton>
                  <ActionButton
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
                  </ActionButton>
                  <ActionButton
                    station={stationMode}
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void invalidate(restaurantId, register.registerId)
                    }
                  >
                    {registerOperationsUiLabel("refresh", language)}
                  </ActionButton>
                </div>
              </section>

              {/* History */}
              <section className="rounded-xl border border-slate-700/50 p-3 sm:p-4">
                <h3 className="mb-2 text-sm font-medium text-slate-400">
                  {registerOperationsUiLabel("history", language)}
                </h3>
                {historyQuery.isLoading ? (
                  <p className="text-slate-400">
                    {registerOperationsUiLabel("loading", language)}
                  </p>
                ) : (historyQuery.data?.shifts.length ?? 0) === 0 ? (
                  <p className="text-slate-500">
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
  value,
  station,
}: {
  label: string;
  value: string;
  station: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-950/50 p-3",
        station && "p-4"
      )}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 break-all font-medium text-white",
          station ? "text-lg sm:text-xl" : "text-base"
        )}
      >
        {value}
      </div>
    </div>
  );
}
