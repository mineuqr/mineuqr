import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationReversalHistory({ row, language }: Props) {
  if (row.reversals.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-slate-300">
        {multiCheckAllocationUiLabel("reversalsTitle", language)}
      </p>
      <ul className="space-y-1">
        {row.reversals.map((r) => (
          <li
            key={r.reversalId}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <span>{r.reversalId}</span>
            <span className="tabular-nums text-slate-200">
              {r.reversedAmountDisplay}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
