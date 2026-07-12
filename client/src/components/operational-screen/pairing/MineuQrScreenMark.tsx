import { cn } from "@/lib/utils";

export function MineuQrScreenMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)} aria-hidden={false}>
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-lg font-bold tracking-tight text-primary"
        aria-hidden
      >
        MQ
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">MineuQR</span>
    </div>
  );
}
