import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import {
  formatOperationalClock,
  headerConnectionDotClass,
  headerConnectionLabel,
  resolveHeaderConnectionTone,
} from "@/lib/operational-screen/operationalScreenPresentation";
import { ScreenConnectionBanner } from "./ScreenConnectionBanner";
import { useScreenRuntime } from "./OperationalScreenRuntimeProvider";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function HeaderConnectionStatus({
  tone,
  label,
}: {
  tone: ReturnType<typeof resolveHeaderConnectionTone>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/30 bg-[#12161f]/80 px-3 py-1.5">
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
  const { context, unpair } = useScreenRuntime();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!context) return null;

  const language = context.presentation.language;
  const isAr = language === "ar";
  const dir = context.presentation.direction;
  const connectionTone = resolveHeaderConnectionTone(context.screenState);
  const connectionLabel = headerConnectionLabel(connectionTone, isAr);
  const clock = formatOperationalClock(now, isAr);

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e14] text-foreground" dir={dir}>
      <ScreenConnectionBanner screenState={context.screenState} language={language} />
      <header className="shrink-0 border-b border-border/30 bg-[#0f131a]/95 px-4 py-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {context.identity.displayName}
            </h1>
            <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {screenTypeLabel(context.identity.role, language)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <HeaderConnectionStatus tone={connectionTone} label={connectionLabel} />
            <time
              className="hidden font-mono text-sm font-bold tabular-nums text-foreground/90 sm:block"
              dateTime={now.toISOString()}
            >
              {clock}
            </time>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-lg border border-border/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/20 active:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={unpair}
            >
              {isAr ? "إلغاء الربط" : "Unpair"}
            </button>
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        {children}
      </main>
    </div>
  );
}
