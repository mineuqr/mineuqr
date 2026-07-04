import { cn } from "@/lib/utils";
import type { SavedFilterPreset } from "@/lib/operational-workspace/useSavedFilters";

export function WorkspaceFilters({
  presets,
  activeId,
  onSelect,
  language,
}: {
  presets: SavedFilterPreset[];
  activeId: string;
  onSelect: (id: string) => void;
  language: string;
}) {
  const isAr = language === "ar";
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border/40 bg-muted/10 p-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          className={cn(
            "min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium transition-all touch-manipulation",
            activeId === preset.id
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          )}
        >
          {isAr ? preset.labelAr : preset.labelEn}
        </button>
      ))}
    </div>
  );
}
