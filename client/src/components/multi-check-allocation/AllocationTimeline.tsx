import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
};

export function AllocationTimeline({ row, language }: Props) {
  if (row.timeline.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-medium text-slate-300">
        {multiCheckAllocationUiLabel("timelineTitle", language)}
      </p>
      <ol className="space-y-1">
        {row.timeline.map((e) => (
          <li
            key={`${e.kind}-${e.id}`}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <span>
              {e.kind}
              {e.targetCheckId != null ? ` · #${e.targetCheckId}` : ""}
              {e.direction ? ` · ${e.direction}` : ""}
            </span>
            <span className="tabular-nums text-slate-200">
              {e.amountDisplay}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
