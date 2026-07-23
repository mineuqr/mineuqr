import { Button } from "@/components/ui/button";
import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationLang,
} from "@/lib/multi-check-allocation-presentation";
import { Loader2 } from "lucide-react";

export type AllocationDialogKind =
  | "reserve"
  | "apply"
  | "adjust"
  | "reverse"
  | "complete"
  | "cancel"
  | null;

type Props = {
  row: MultiCheckAllocationDetailViewModel;
  language: MultiCheckAllocationLang;
  pending: boolean;
  onAction: (kind: Exclude<AllocationDialogKind, null>) => void;
};

export function AllocationActionBar({
  row,
  language,
  pending,
  onAction,
}: Props) {
  const { actions } = row;
  if (
    !actions.canReserve &&
    !actions.canApply &&
    !actions.canAdjust &&
    !actions.canReverse &&
    !actions.canComplete &&
    !actions.canCancel
  ) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={multiCheckAllocationUiLabel("sectionTitle", language)}
    >
      {actions.canReserve ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => onAction("reserve")}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {multiCheckAllocationUiLabel("reserve", language)}
        </Button>
      ) : null}
      {actions.canApply ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => onAction("apply")}
        >
          {multiCheckAllocationUiLabel("apply", language)}
        </Button>
      ) : null}
      {actions.canAdjust ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => onAction("adjust")}
        >
          {multiCheckAllocationUiLabel("adjust", language)}
        </Button>
      ) : null}
      {actions.canReverse ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => onAction("reverse")}
        >
          {multiCheckAllocationUiLabel("reverse", language)}
        </Button>
      ) : null}
      {actions.canComplete ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => onAction("complete")}
        >
          {multiCheckAllocationUiLabel("complete", language)}
        </Button>
      ) : null}
      {actions.canCancel ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => onAction("cancel")}
        >
          {multiCheckAllocationUiLabel("cancel", language)}
        </Button>
      ) : null}
    </div>
  );
}
