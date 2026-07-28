/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Customer dining session banner — status strip uses filled semantic badge tones.
 */
import {
  mapTableSessionStatusToBadgeTone,
  semanticBadgeToneClass,
} from "@/design-system/semantic-badge";
import {
  getDiningSessionBannerLines,
  getDiningSessionBannerTitle,
  type DiningSessionStatus,
} from "@/lib/diningSessionCopy";
import { cn } from "@/lib/utils";

type DiningSessionBannerProps = {
  language: "ar" | "en";
  status: DiningSessionStatus;
  className?: string;
};

export function DiningSessionBanner({
  language,
  status,
  className,
}: DiningSessionBannerProps) {
  const lines = getDiningSessionBannerLines(status, language);
  const title = getDiningSessionBannerTitle(status, language);
  const tone =
    status === "closed"
      ? "neutral"
      : mapTableSessionStatusToBadgeTone(status);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[89] px-4 py-3 text-center text-sm shadow-md",
        semanticBadgeToneClass(tone, "filled"),
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
