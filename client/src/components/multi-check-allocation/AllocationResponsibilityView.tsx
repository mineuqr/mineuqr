import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationResponsibilityView({ row, language }: Props) {
  return (
    <div>
      <p className="mb-1 font-medium text-slate-300">
        {multiCheckAllocationUiLabel("responsibilityTitle", language)}
      </p>
      <dl className="grid grid-cols-3 gap-2 text-xs text-slate-400">
        <div>
          <dt>
            {multiCheckAllocationUiLabel("financialResponsibility", language)}
          </dt>
          <dd className="tabular-nums text-slate-200">
            {row.responsibility.financialResponsibilityDisplay}
          </dd>
        </div>
        <div>
          <dt>{multiCheckAllocationUiLabel("allocatedAmount", language)}</dt>
          <dd className="tabular-nums text-slate-200">
            {row.responsibility.allocatedAmountDisplay}
          </dd>
        </div>
        <div>
          <dt>{multiCheckAllocationUiLabel("remainingAmount", language)}</dt>
          <dd className="tabular-nums text-slate-200">
            {row.responsibility.remainingAmountDisplay}
          </dd>
        </div>
      </dl>
    </div>
  );
}
