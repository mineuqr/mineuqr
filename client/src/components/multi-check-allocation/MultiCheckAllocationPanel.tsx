/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — Check Workspace allocation panel.
 * Renders API View Models only. Mutations go through multiCheckAllocation.* API.
 *
 * PRODUCTION-ADOPTION-1 Rev 2.0 — UI dormant:
 * Not mounted in DiningSessionWorkspaceSheet. Do not reintroduce operational
 * entry points unless MULTI_CHECK_ALLOCATION_UI_ENABLED is flipped and
 * Settlement Record adoption explicitly requires it.
 */

import { useMemo, useState } from "react";
import { SemanticConfirmDialog } from "@/design-system/semantic-confirm-dialog";
import { Button } from "@/components/ui/button";
import { restaurantDash, restaurantSemantic } from "@/components/dashboard/restaurantDashStyles";
import { AllocationActionBar, type AllocationDialogKind } from "./AllocationActionBar";
import { AllocationAdjustmentHistory } from "./AllocationAdjustmentHistory";
import { AllocationMetadataView } from "./AllocationMetadataView";
import { AllocationPortionList } from "./AllocationPortionList";
import { AllocationResponsibilityView } from "./AllocationResponsibilityView";
import { AllocationReversalHistory } from "./AllocationReversalHistory";
import { AllocationSummaryCard } from "./AllocationSummaryCard";
import { AllocationTimeline } from "./AllocationTimeline";
import {
  AdjustAllocationDialog,
  type AdjustAllocationFormValues,
} from "./AdjustAllocationDialog";
import {
  CreateAllocationDialog,
  type CreateAllocationFormValues,
} from "./CreateAllocationDialog";
import {
  mapMultiCheckAllocationApiError,
  multiCheckAllocationErrorMessage,
  multiCheckAllocationUiLabel,
  toMultiCheckAllocationPanelViewModel,
  useMultiCheckAllocationMutations,
  useMultiCheckAllocationsBySourceCheck,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock3, Loader2, Plus } from "lucide-react";

type MultiCheckAllocationPanelProps = {
  restaurantId: number;
  checkId: number | null | undefined;
  language: MultiCheckAllocationLang;
  currencySymbol: string;
  enabled?: boolean;
  showDiagnostics?: boolean;
};

function newOpaqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function MultiCheckAllocationPanel({
  restaurantId,
  checkId,
  language,
  currencySymbol,
  enabled = true,
  showDiagnostics = false,
}: MultiCheckAllocationPanelProps) {
  const queryEnabled =
    enabled && checkId != null && checkId > 0 && restaurantId > 0;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustRow, setAdjustRow] =
    useState<MultiCheckAllocationDetailViewModel | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: Exclude<AllocationDialogKind, null | "adjust">;
    row: MultiCheckAllocationDetailViewModel;
  } | null>(null);

  const listQuery = useMultiCheckAllocationsBySourceCheck(
    { restaurantId, sourceCheckId: checkId ?? 0 },
    { enabled: queryEnabled }
  );
  const mutations = useMultiCheckAllocationMutations(language);

  const panel = useMemo(
    () =>
      toMultiCheckAllocationPanelViewModel({
        list: listQuery.data,
        language,
        currencySymbol,
      }),
    [listQuery.data, language, currencySymbol]
  );

  const isLoading = queryEnabled && listQuery.isLoading;
  const error = listQuery.error;

  const runLifecycle = (
    kind: Exclude<AllocationDialogKind, null | "adjust">,
    row: MultiCheckAllocationDetailViewModel
  ) => {
    if (!checkId) return;
    const base = {
      restaurantId,
      checkId,
      allocationId: row.allocationId,
    };
    if (kind === "reserve") {
      mutations.reserveAllocation.mutate(base);
      return;
    }
    if (kind === "apply") {
      mutations.applyAllocation.mutate(base);
      return;
    }
    if (kind === "complete") {
      mutations.completeAllocation.mutate(base);
      return;
    }
    if (kind === "cancel") {
      mutations.cancelAllocation.mutate(base);
      return;
    }
    if (kind === "reverse") {
      mutations.reverseAllocation.mutate({
        ...base,
        reversalId: newOpaqueId("rev"),
      });
    }
  };

  const onCreate = (values: CreateAllocationFormValues) => {
    if (!checkId) return;
    const targetCheckId = Number(values.targetCheckId);
    if (!Number.isFinite(targetCheckId) || targetCheckId <= 0) return;
    const allocationId = newOpaqueId("alloc");
    mutations.createAllocation.mutate(
      {
        restaurantId,
        checkId,
        allocationId,
        allocationReference:
          values.allocationReference || `aref_${allocationId}`,
        financialResponsibility: values.financialResponsibility,
        portions: [
          {
            portionId: newOpaqueId("portion"),
            sequence: 1,
            targetCheckId,
            amount: values.portionAmount,
          },
        ],
      },
      {
        onSuccess: () => setCreateOpen(false),
      }
    );
  };

  const onAdjust = (values: AdjustAllocationFormValues) => {
    if (!checkId || !adjustRow) return;
    mutations.adjustAllocation.mutate(
      {
        restaurantId,
        checkId,
        allocationId: adjustRow.allocationId,
        adjustmentId: newOpaqueId("adj"),
        amount: values.amount,
        direction: values.direction,
      },
      {
        onSuccess: () => setAdjustRow(null),
      }
    );
  };

  const confirmCopy = (kind: Exclude<AllocationDialogKind, null | "adjust">) => {
    if (kind === "reserve") {
      return multiCheckAllocationUiLabel("confirmReserve", language);
    }
    if (kind === "apply") {
      return multiCheckAllocationUiLabel("confirmApply", language);
    }
    if (kind === "complete") {
      return multiCheckAllocationUiLabel("confirmComplete", language);
    }
    if (kind === "cancel") {
      return multiCheckAllocationUiLabel("confirmCancel", language);
    }
    return multiCheckAllocationUiLabel("reverseTitle", language);
  };

  if (!queryEnabled) {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={multiCheckAllocationUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {multiCheckAllocationUiLabel("sectionTitle", language)}
        </h3>
        <EmptyState language={language} />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={multiCheckAllocationUiLabel("sectionTitle", language)}
        aria-busy="true"
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {multiCheckAllocationUiLabel("sectionTitle", language)}
        </h3>
        <div
          className="flex items-center gap-2 text-sm text-slate-300"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {multiCheckAllocationUiLabel("loading", language)}
        </div>
      </section>
    );
  }

  if (error) {
    const kind = mapMultiCheckAllocationApiError(error);
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={multiCheckAllocationUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {multiCheckAllocationUiLabel("sectionTitle", language)}
        </h3>
        <div
          className={cn(
            "rounded-lg border px-3 py-3 text-sm",
            restaurantSemantic.rowWarning
          )}
          role="alert"
        >
          {multiCheckAllocationErrorMessage(kind, language)}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={multiCheckAllocationUiLabel("sectionTitle", language)}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {multiCheckAllocationUiLabel("sectionTitle", language)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {multiCheckAllocationUiLabel("notCheckSettlement", language)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={mutations.pending}
        >
          <Plus className="me-1 h-3.5 w-3.5" aria-hidden />
          {multiCheckAllocationUiLabel("create", language)}
        </Button>
      </div>

      {panel.isEmpty ? (
        <EmptyState language={language} />
      ) : (
        <ul className="flex flex-col gap-2">
          {panel.rows.map((row) => {
            const expanded = expandedId === row.allocationId;
            return (
              <li
                key={row.allocationId}
                className="rounded-lg border border-cyan-500/15 bg-slate-900/40 px-3 py-2"
              >
                <button
                  type="button"
                  className="flex w-full flex-wrap items-baseline justify-between gap-2 text-start"
                  onClick={() =>
                    setExpandedId(expanded ? null : row.allocationId)
                  }
                  aria-expanded={expanded}
                >
                  <span className="text-sm font-medium text-slate-100">
                    {multiCheckAllocationUiLabel("allocationLabel", language)}{" "}
                    {row.allocationReference}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                    {row.statusLabel}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        expanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </span>
                </button>

                <AllocationSummaryCard row={row} language={language} />

                <div className="mt-3">
                  <AllocationActionBar
                    row={row}
                    language={language}
                    pending={mutations.pending}
                    onAction={(kind) => {
                      if (kind === "adjust") {
                        setAdjustRow(row);
                        return;
                      }
                      setConfirm({ kind, row });
                    }}
                  />
                </div>

                {expanded ? (
                  <div className="mt-3 space-y-3 border-t border-cyan-500/10 pt-3 text-xs text-slate-400">
                    <AllocationResponsibilityView
                      row={row}
                      language={language}
                    />
                    <AllocationPortionList row={row} language={language} />
                    <AllocationAdjustmentHistory
                      row={row}
                      language={language}
                    />
                    <AllocationReversalHistory row={row} language={language} />
                    <AllocationTimeline row={row} language={language} />
                    {showDiagnostics ? (
                      <AllocationMetadataView row={row} language={language} />
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <CreateAllocationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        language={language}
        pending={mutations.pending}
        onSubmit={onCreate}
      />

      <AdjustAllocationDialog
        open={adjustRow != null}
        onOpenChange={(open) => {
          if (!open) setAdjustRow(null);
        }}
        language={language}
        pending={mutations.pending}
        onSubmit={onAdjust}
      />

      <SemanticConfirmDialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        kind={confirm?.kind === "reverse" || confirm?.kind === "cancel" ? "destructive" : "default"}
        icon={
          confirm?.kind === "reverse" || confirm?.kind === "cancel" ? "close" : "question"
        }
        title={
          confirm
            ? multiCheckAllocationUiLabel(
                confirm.kind === "reverse"
                  ? "reverseTitle"
                  : confirm.kind === "reserve"
                    ? "reserve"
                    : confirm.kind === "apply"
                      ? "apply"
                      : confirm.kind === "complete"
                        ? "complete"
                        : "cancel",
                language
              )
            : ""
        }
        description={confirm ? confirmCopy(confirm.kind) : ""}
        cancelLabel={multiCheckAllocationUiLabel("dismiss", language)}
        confirmLabel={multiCheckAllocationUiLabel("confirm", language)}
        onConfirm={() => {
          if (!confirm) return;
          runLifecycle(confirm.kind, confirm.row);
          setConfirm(null);
        }}
        loading={mutations.pending}
      />
    </section>
  );
}

function EmptyState({ language }: { language: MultiCheckAllocationLang }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-3",
        restaurantSemantic.rowWarning
      )}
    >
      <Clock3
        className={cn("h-5 w-5 shrink-0", restaurantSemantic.iconWarning)}
        aria-hidden
      />
      <p className="text-sm text-orange-200">
        {multiCheckAllocationUiLabel("empty", language)}
      </p>
    </div>
  );
}
