/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Platform-reusable empty / premium empty states for card surfaces.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { semanticPanel } from "../tokens/panel";
import { SEMANTIC_TONE } from "../tokens/semanticTone";

export function SemanticEmptyState({
  title,
  message,
  footnote,
  icon: Icon = Inbox,
  className,
  variant = "panel",
}: {
  title?: string;
  message: string;
  footnote?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  /** panel = standard emptyPanel; premium = executive-style empty */
  variant?: "panel" | "premium";
}) {
  if (variant === "premium") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/90 px-6 py-12 text-center sm:px-10 sm:py-14",
          className
        )}
        role="status"
        aria-live="polite"
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-500/10">
            <Icon className="h-8 w-8 text-teal-300" aria-hidden />
          </div>
          <div className="space-y-2">
            {title ? (
              <p className="text-base font-semibold text-white sm:text-lg">
                {title}
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-slate-400">{message}</p>
          </div>
          {footnote ? (
            <p className="inline-flex items-center gap-2 text-xs text-slate-500">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(semanticPanel.empty, "rounded-2xl", className)}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600/40 bg-slate-900/60">
        <Icon className={cn("h-6 w-6", SEMANTIC_TONE.icon.neutral)} aria-hidden />
      </div>
      {title ? (
        <p className="mb-1 text-sm font-semibold text-slate-200">{title}</p>
      ) : null}
      <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
        {message}
      </p>
      {footnote ? (
        <p className="mt-3 text-xs text-slate-500">{footnote}</p>
      ) : null}
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
