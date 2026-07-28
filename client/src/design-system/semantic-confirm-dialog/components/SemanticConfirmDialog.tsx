/**
 * SEMANTIC-CONFIRM-DIALOG-PLATFORM-1
 * Canonical confirmation chrome — presentation only.
 *
 * Features own onConfirm / loading / copy. Platform owns shell, icons,
 * button ordering, loading UI, and a11y structure (via Radix AlertDialog).
 */
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  SEMANTIC_CONFIRM_ICON,
  defaultIconForKind,
  semanticConfirmIconClass,
  semanticConfirmIconWellClass,
  type SemanticConfirmIconName,
  type SemanticConfirmKind,
} from "../tokens/confirmTone";

export type SemanticConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Extra body (plan summary, details) — presentation slot only. */
  children?: ReactNode;
  kind?: SemanticConfirmKind;
  icon?: SemanticConfirmIconName;
  cancelLabel: string;
  confirmLabel?: string;
  /** Feature-owned confirm handler — no domain logic inside platform. */
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  loadingLabel?: string;
  error?: ReactNode;
  success?: ReactNode;
  /** Hide primary confirm (e.g. success dialogs with custom actions). */
  hideConfirm?: boolean;
  /** Replace default footer actions entirely. */
  footer?: ReactNode;
  confirmDisabled?: boolean;
  dir?: "ltr" | "rtl";
  className?: string;
  contentClassName?: string;
};

export function SemanticConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  kind = "default",
  icon,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
  loadingLabel,
  error,
  success,
  hideConfirm = false,
  footer,
  confirmDisabled = false,
  dir,
  className,
  contentClassName,
}: SemanticConfirmDialogProps) {
  const iconName = icon ?? defaultIconForKind(kind);
  const Icon =
    iconName === "none" ? null : SEMANTIC_CONFIRM_ICON[iconName];
  const showConfirm = !hideConfirm && Boolean(confirmLabel) && Boolean(onConfirm);
  const busy = loading;
  const confirmLocked = busy || confirmDisabled;

  const confirmButtonClass =
    kind === "destructive"
      ? buttonVariants({ variant: "destructive" })
      : buttonVariants();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        dir={dir}
        data-slot="semantic-confirm-dialog"
        data-kind={kind}
        className={cn("bg-card border-border", contentClassName, className)}
        onCloseAutoFocus={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <AlertDialogHeader className="sm:text-start">
          {Icon ? (
            <div
              className={cn(
                "mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border sm:mx-0",
                semanticConfirmIconWellClass(kind)
              )}
              aria-hidden
            >
              <Icon
                className={cn("h-6 w-6", semanticConfirmIconClass(kind))}
              />
            </div>
          ) : null}
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-muted-foreground">
              {description}
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription className="sr-only">
              {typeof title === "string" ? title : "Confirmation"}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children ? <div className="space-y-3">{children}</div> : null}

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            {success}
          </div>
        ) : null}

        <AlertDialogFooter className="gap-2">
          {footer ? (
            footer
          ) : (
            <>
              <AlertDialogCancel
                disabled={busy}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-border text-foreground"
                )}
                onClick={() => onCancel?.()}
              >
                {cancelLabel}
              </AlertDialogCancel>
              {showConfirm ? (
                <AlertDialogAction
                  disabled={confirmLocked}
                  className={cn(confirmButtonClass, "inline-flex items-center gap-2")}
                  onClick={(event) => {
                    event.preventDefault();
                    if (confirmLocked) return;
                    onConfirm?.();
                  }}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      <span>{loadingLabel ?? confirmLabel}</span>
                    </>
                  ) : (
                    confirmLabel
                  )}
                </AlertDialogAction>
              ) : null}
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
