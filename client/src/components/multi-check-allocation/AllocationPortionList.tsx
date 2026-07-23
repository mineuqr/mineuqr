import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationPortionList({ row, language }: Props) {
  if (row.portions.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-slate-300">
        {multiCheckAllocationUiLabel("portionsTitle", language)}
      </p>
      <ul className="space-y-1">
        {row.portions.map((p) => (
          <li
            key={p.portionId}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <span>
              #{p.sequence} · {multiCheckAllocationUiLabel("targetCheck", language)}{" "}
              #{p.targetCheckId} ·{" "}
              {p.applied
                ? multiCheckAllocationUiLabel("appliedFlag", language)
                : multiCheckAllocationUiLabel("pendingFlag", language)}
            </span>
            <span className="tabular-nums text-slate-200">
              {p.amountDisplay}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
