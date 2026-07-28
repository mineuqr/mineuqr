/**
 * SEMANTIC-CONFIRM-DIALOG-PLATFORM-1
 * Semantic confirm kinds + icon tokens — presentation only.
 */
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Trash2,
  XCircle,
} from "lucide-react";

export type SemanticConfirmKind =
  | "default"
  | "destructive"
  | "warning"
  | "success"
  | "information";

export type SemanticConfirmIconName =
  | "delete"
  | "close"
  | "archive"
  | "warning"
  | "success"
  | "question"
  | "information"
  | "none";

export const SEMANTIC_CONFIRM_ICON: Record<
  Exclude<SemanticConfirmIconName, "none">,
  LucideIcon
> = {
  delete: Trash2,
  close: XCircle,
  archive: Archive,
  warning: AlertTriangle,
  success: CheckCircle2,
  question: HelpCircle,
  information: Info,
};

export function defaultIconForKind(
  kind: SemanticConfirmKind
): SemanticConfirmIconName {
  switch (kind) {
    case "destructive":
      return "delete";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "information":
      return "information";
    case "default":
    default:
      return "question";
  }
}

export function semanticConfirmIconClass(kind: SemanticConfirmKind): string {
  switch (kind) {
    case "destructive":
      return "text-destructive";
    case "warning":
      return "text-amber-400";
    case "success":
      return "text-emerald-500";
    case "information":
      return "text-sky-400";
    case "default":
    default:
      return "text-cyan-400";
  }
}

export function semanticConfirmIconWellClass(kind: SemanticConfirmKind): string {
  switch (kind) {
    case "destructive":
      return "border-destructive/30 bg-destructive/10";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10";
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "information":
      return "border-sky-500/30 bg-sky-500/10";
    case "default":
    default:
      return "border-cyan-500/30 bg-cyan-500/10";
  }
}
