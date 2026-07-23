import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationAdjustmentHistory({ row, language }: Props) {
  if (row.adjustments.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-slate-300">
        {multiCheckAllocationUiLabel("adjustmentsTitle", language)}
      </p>
      <ul className="space-y-1">
        {row.adjustments.map((a) => (
          <li
            key={a.adjustmentId}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <span>
              {a.direction === "increase"
                ? multiCheckAllocationUiLabel("increase", language)
                : multiCheckAllocationUiLabel("decrease", language)}
              {a.portionId ? ` · ${a.portionId}` : ""}
            </span>
            <span className="tabular-nums text-slate-200">
              {a.amountDisplay}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
