import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";

export function OperationalScreenOverflowMenu({
  onUnpair,
  isAr,
  className,
}: {
  onUnpair: () => void;
  isAr: boolean;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border/30 text-muted-foreground transition-colors duration-150 hover:bg-muted/20 active:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            className
          )}
          aria-label={isAr ? "إجراءات الشاشة" : "Screen actions"}
        >
          <MoreVertical className="h-5 w-5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem] border-border/40 bg-[#12161f]">
        <DropdownMenuItem
          className="min-h-11 cursor-pointer text-sm font-medium focus:bg-muted/30"
          onClick={onUnpair}
        >
          {isAr ? "إلغاء ربط الشاشة" : "Unpair screen"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
