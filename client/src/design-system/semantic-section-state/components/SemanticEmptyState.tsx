/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — empty / success / offline.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Inbox, WifiOff, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { semanticPanel } from "@/design-system/semantic-card/tokens/panel";
import { SEMANTIC_TONE } from "@/design-system/semantic-card/tokens/semanticTone";
import {
  SemanticStateActions,
  SemanticStateIllustration,
} from "./SemanticStateSlots";

export type SemanticEmptyVariant = "panel" | "premium" | "admin" | "page";

export function SemanticEmptyState({
  title,
  message,
  description,
  footnote,
  icon: Icon = Inbox,
  action,
  className,
  variant = "panel",
  ariaLabel,
}: {
  title?: string;
  /** Primary body copy (panel / premium). */
  message?: string;
  /** Alias for admin / page description. */
  description?: string;
  footnote?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  variant?: SemanticEmptyVariant;
  ariaLabel?: string;
}) {
  const body = message ?? description ?? "";

  if (variant === "premium") {
    return (
      <div
        data-slot="semantic-empty-state"
        data-variant="premium"
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/90 px-6 py-12 text-center sm:px-10 sm:py-14",
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel ?? title}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, #2dd4bf, transparent 45%), radial-gradient(circle at 70% 80%, #38bdf8, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
          <SemanticStateIllustration icon={Icon} tone="info" size="lg" className="mb-0" />
          <div className="space-y-2">
            {title ? (
              <p className="text-base font-semibold text-white sm:text-lg">{title}</p>
            ) : null}
            {body ? (
              <p className="text-sm leading-relaxed text-slate-400">{body}</p>
            ) : null}
          </div>
          {footnote ? (
            <p className="inline-flex items-center gap-2 text-xs text-slate-500">
              {footnote}
            </p>
          ) : null}
          {action ? <SemanticStateActions className="mt-0">{action}</SemanticStateActions> : null}
        </div>
      </div>
    );
  }

  if (variant === "admin") {
    return (
      <div
        data-slot="semantic-empty-state"
        data-variant="admin"
        role="status"
        aria-label={ariaLabel ?? title}
        className={cn("p-6 text-center sm:p-8", className)}
      >
        <SemanticStateIllustration icon={Icon} tone="info" size="sm" />
        {title ? (
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        ) : null}
        {body ? (
          <p className="mx-auto mt-1.5 max-w-md text-xs text-cyan-300/80">{body}</p>
        ) : null}
        {action ? <SemanticStateActions>{action}</SemanticStateActions> : null}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div
        data-slot="semantic-empty-state"
        data-variant="page"
        data-app-state="empty"
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center sm:py-16",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <SemanticStateIllustration icon={Icon} tone="neutral" size="lg" />
        {title ? (
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        ) : null}
        {body ? (
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
        ) : null}
        {action ? <SemanticStateActions className="mt-6">{action}</SemanticStateActions> : null}
      </div>
    );
  }

  return (
    <div
      data-slot="semantic-empty-state"
      data-variant="panel"
      className={cn(semanticPanel.empty, "rounded-2xl", className)}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? title}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600/40 bg-slate-900/60">
        <Icon className={cn("h-6 w-6", SEMANTIC_TONE.icon.neutral)} aria-hidden />
      </div>
      {title ? (
        <p className="mb-1 text-sm font-semibold text-slate-200">{title}</p>
      ) : null}
      {body ? (
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">{body}</p>
      ) : null}
      {footnote ? (
        <p className="mt-3 text-xs text-slate-500">{footnote}</p>
      ) : null}
      {action ? <SemanticStateActions>{action}</SemanticStateActions> : null}
    </div>
  );
}

/** Convenience — executive premium empty with default utensils icon. */
export function SemanticExecutiveEmptyState(
  props: Omit<Parameters<typeof SemanticEmptyState>[0], "variant" | "icon"> & {
    icon?: LucideIcon;
  }
) {
  return (
    <SemanticEmptyState
      {...props}
      variant="premium"
      icon={props.icon ?? UtensilsCrossed}
    />
  );
}

export function SemanticSuccessState({
  title,
  description,
  action,
  icon: Icon = CheckCircle2,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-success-state"
      className={cn(semanticPanel.empty, "rounded-2xl", className)}
      role="status"
      aria-live="polite"
    >
      <SemanticStateIllustration icon={Icon} tone="success" />
      <p className="mb-1 text-sm font-semibold text-slate-200">{title}</p>
      {description ? (
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <SemanticStateActions>{action}</SemanticStateActions> : null}
    </div>
  );
}

export function SemanticOfflineState({
  title,
  description,
  action,
  icon: Icon = WifiOff,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-offline-state"
      className={cn(semanticPanel.error, "rounded-2xl", className)}
      role="status"
      aria-live="polite"
    >
      <SemanticStateIllustration icon={Icon} tone="warning" />
      <p className="mb-1 text-sm font-semibold text-slate-200">{title}</p>
      {description ? (
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <SemanticStateActions>{action}</SemanticStateActions> : null}
    </div>
  );
}
