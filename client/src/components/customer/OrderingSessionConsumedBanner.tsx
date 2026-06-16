import { Link } from "wouter";
import {
  getOrderingSessionConsumedLines,
  getOrderingSessionTrackingLinkLabel,
} from "@/lib/orderingSessionCopy";
import { cn } from "@/lib/utils";

type OrderingSessionConsumedBannerProps = {
  language: "ar" | "en";
  slug: string;
  trackingToken: string;
  className?: string;
};

export function OrderingSessionConsumedBanner({
  language,
  slug,
  trackingToken,
  className,
}: OrderingSessionConsumedBannerProps) {
  const lines = getOrderingSessionConsumedLines(language);
  const trackingHref = `/menu/${slug}/order/${trackingToken}`;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[89] px-4 py-3 text-center text-sm bg-amber-500/95 text-amber-950 shadow-md",
        className
      )}
      role="status"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-lg space-y-1">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {trackingToken && (
          <p className="pt-1">
            <Link
              href={trackingHref}
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              {getOrderingSessionTrackingLinkLabel(language)}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
