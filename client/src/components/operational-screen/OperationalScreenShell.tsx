import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { ScreenConnectionBanner } from "./ScreenConnectionBanner";
import { useScreenRuntime } from "./OperationalScreenRuntimeProvider";
import { cn } from "@/lib/utils";

export function OperationalScreenShell({ children }: { children: React.ReactNode }) {
  const { context, phase, degraded, unpair } = useScreenRuntime();

  if (!context) return null;

  const language = context.presentation.language;
  const isAr = language === "ar";
  const dir = context.presentation.direction;

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e14] text-foreground" dir={dir}>
      <ScreenConnectionBanner phase={phase} degraded={degraded} language={language} />
      <header className="flex items-center justify-between gap-4 border-b border-border/40 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{context.identity.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {screenTypeLabel(context.identity.role, language)}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
          onClick={unpair}
        >
          {isAr ? "إلغاء الربط" : "Unpair"}
        </button>
      </header>
      <main className={cn("flex-1 overflow-auto p-4")}>{children}</main>
    </div>
  );
}
