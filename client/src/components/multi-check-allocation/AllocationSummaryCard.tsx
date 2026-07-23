import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationSummaryCard({ row, language }: Props) {
  return (
    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-3">
      <div>
        <dt>{multiCheckAllocationUiLabel("financialResponsibility", language)}</dt>
        <dd className="tabular-nums text-slate-200">
          {row.financialResponsibilityDisplay}
        </dd>
      </div>
      <div>
        <dt>{multiCheckAllocationUiLabel("allocatedAmount", language)}</dt>
        <dd className="tabular-nums text-slate-200">
          {row.allocatedAmountDisplay}
        </dd>
      </div>
      <div>
        <dt>{multiCheckAllocationUiLabel("remainingAmount", language)}</dt>
        <dd className="tabular-nums text-slate-200">
          {row.remainingAmountDisplay}
        </dd>
      </div>
      <div>
        <dt>{multiCheckAllocationUiLabel("sourceCheck", language)}</dt>
        <dd className="tabular-nums text-slate-200">#{row.sourceCheckId}</dd>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <dt>{multiCheckAllocationUiLabel("targetCheck", language)}</dt>
        <dd className="tabular-nums text-slate-200">
          {row.targetCheckIds.map((id) => `#${id}`).join(", ") || "—"}
        </dd>
      </div>
    </dl>
  );
}
