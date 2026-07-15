import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import {
  headerConnectionDotClass,
  headerConnectionLabel,
  resolveHeaderConnectionTone,
} from "@/lib/operational-screen/operationalScreenPresentation";
import { OperationalScreenOverflowMenu } from "./OperationalScreenOverflowMenu";
import { ScreenConnectionBanner } from "./ScreenConnectionBanner";
import { useRuntimeActions, useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { cn } from "@/lib/utils";

function HeaderConnectionStatus({
  tone,
  label,
}: {
  tone: ReturnType<typeof resolveHeaderConnectionTone>;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border/30 bg-[#12161f]/80 px-3 py-1.5"
      role="status"
    >
      <span
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", headerConnectionDotClass(tone))}
        aria-hidden
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function OperationalScreenShell({ children }: { children: React.ReactNode }) {
  const context = useRuntimeContext();
  const { unpair } = useRuntimeActions();

  if (!context) return null;

  const language = context.presentation.language;
  const isAr = language === "ar";
  const dir = context.presentation.direction;
  const connectionTone = resolveHeaderConnectionTone(context.screenState);
  const showConnection = connectionTone !== "live";
  const connectionLabel = headerConnectionLabel(connectionTone, isAr);
  /** Kiosk / waiter own full-bleed chrome; keep connection + unpair only. */
  const isChannelHost =
    context.identity.role === "self_ordering_kiosk" ||
    context.identity.role === "waiter_display";

  if (isChannelHost) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b0e14] text-foreground" dir={dir}>
        <ScreenConnectionBanner screenState={context.screenState} language={language} />
        {showConnection ? (
          <div className="flex items-center justify-end gap-2 px-3 py-2">
            <HeaderConnectionStatus tone={connectionTone} label={connectionLabel} />
            <OperationalScreenOverflowMenu onUnpair={unpair} isAr={isAr} />
          </div>
        ) : (
          <div className="absolute end-3 top-3 z-20">
            <OperationalScreenOverflowMenu onUnpair={unpair} isAr={isAr} />
          </div>
        )}
        <main className="relative flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e14] text-foreground" dir={dir}>
      <ScreenConnectionBanner screenState={context.screenState} language={language} />
      <header className="shrink-0 border-b border-border/30 bg-[#0f131a]/95 px-4 py-2 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {context.identity.displayName}
            </h1>
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {screenTypeLabel(context.identity.role, language)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {showConnection ? (
              <HeaderConnectionStatus tone={connectionTone} label={connectionLabel} />
            ) : null}
            <OperationalScreenOverflowMenu onUnpair={unpair} isAr={isAr} />
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-4">
        {children}
      </main>
    </div>
  );
}
