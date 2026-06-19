import { getDiningSessionBannerLines, getDiningSessionBannerTitle, type DiningSessionStatus } from "@/lib/diningSessionCopy";
import { cn } from "@/lib/utils";

type DiningSessionBannerProps = {
  language: "ar" | "en";
  status: DiningSessionStatus;
  className?: string;
};

const STATUS_STYLES: Record<DiningSessionStatus, string> = {
  open: "bg-teal-500/95 text-teal-950",
  paid: "bg-emerald-500/95 text-emerald-950",
  complimentary: "bg-violet-500/95 text-violet-950",
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
