import { getDiningSessionBannerLines, getDiningSessionBannerTitle, type DiningSessionStatus } from "@/lib/diningSessionCopy";
import { cn } from "@/lib/utils";

type DiningSessionBannerProps = {
  language: "ar" | "en";
  status: DiningSessionStatus;
  className?: string;
};

const STATUS_STYLES: Record<DiningSessionStatus, string> = {
  open: "bg-teal-500/95 text-teal-950",
  bill_requested: "bg-amber-500/95 text-amber-950",
  payment_pending: "bg-orange-500/95 text-orange-950",
  closed: "bg-slate-600/95 text-white",
};

export function DiningSessionBanner({
  language,
  status,
  className,
}: DiningSessionBannerProps) {
  const lines = getDiningSessionBannerLines(status, language);
  const title = getDiningSessionBannerTitle(status, language);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[89] px-4 py-3 text-center text-sm shadow-md",
        STATUS_STYLES[status],
        className
      )}
      role="status"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-lg space-y-1">
        <p className="font-semibold">{title}</p>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
