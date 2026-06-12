import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ReadyStatusAttentionProps = {
  language: "ar" | "en";
  className?: string;
};

/** HOTFIX-1D: in-page visual fallback when order is READY. */
export function ReadyStatusAttention({ language, className }: ReadyStatusAttentionProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border border-green-400/50 bg-green-100/70 dark:bg-green-900/30 dark:border-green-600/40 px-3 py-2 text-sm font-medium text-green-800 dark:text-green-200 animate-pulse",
        className
      )}
      role="status"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        {language === "ar"
          ? "طلبك جاهز — يمكنك استلامه الآن"
          : "Your order is ready — you can pick it up now"}
      </span>
    </div>
  );
}
