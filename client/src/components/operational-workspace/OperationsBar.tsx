import { cn } from "@/lib/utils";

export type OperationsBarItem = {
  id: string;
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger" | "success";
};

export function OperationsBar({ items }: { items: OperationsBarItem[] }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
      role="region"
      aria-label="Operations summary"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "rounded-xl border px-4 py-3 min-h-[56px] flex flex-col justify-center",
            item.tone === "danger" && "border-destructive/40 bg-destructive/5",
            item.tone === "warning" && "border-amber-500/40 bg-amber-500/5",
            item.tone === "success" && "border-emerald-500/40 bg-emerald-500/5",
            (!item.tone || item.tone === "default") && "border-border/50 bg-muted/20"
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
