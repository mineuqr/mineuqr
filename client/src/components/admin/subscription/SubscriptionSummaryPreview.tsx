import { Button } from "@/components/ui/button";
import { SubscriptionPriceDisplay } from "./SubscriptionPriceDisplay";

type SubscriptionSummaryPreviewProps = {
  locale: "ar" | "en";
  planName: string;
  cycleLabel: string;
  priceDisplay: string;
  statusLabel?: string;
  formattedEndDate: string;
  formattedSuggestedEnd: string;
  onApplySuggestedEnd?: () => void;
  showStatus?: boolean;
};

export function SubscriptionSummaryPreview({
  locale,
  planName,
  cycleLabel,
  priceDisplay,
  statusLabel,
  formattedEndDate,
  formattedSuggestedEnd,
  onApplySuggestedEnd,
  showStatus = true,
}: SubscriptionSummaryPreviewProps) {
  const isAr = locale === "ar";

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {isAr ? "معاينة الاشتراك" : "Subscription preview"}
      </p>

      <dl className="grid gap-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "الباقة" : "Plan"}</dt>
          <dd className="font-medium text-foreground">{planName}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "دورة الفوترة" : "Billing cycle"}</dt>
          <dd className="font-medium text-foreground">{cycleLabel}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "السعر" : "Price"}</dt>
          <dd>
            <SubscriptionPriceDisplay priceDisplay={priceDisplay} />
          </dd>
        </div>
        {showStatus && statusLabel ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الحالة" : "Status"}</dt>
            <dd className="font-medium text-foreground">{statusLabel}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "تاريخ الانتهاء" : "Period end"}</dt>
          <dd dir="ltr" className="font-medium text-foreground tabular-nums">
            {formattedEndDate}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
          <dt className="text-muted-foreground">{isAr ? "مقترح للدورة" : "Suggested for cycle"}</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-medium text-primary tabular-nums">
              {formattedSuggestedEnd}
            </span>
            {onApplySuggestedEnd ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs border-primary/40"
                onClick={onApplySuggestedEnd}
              >
                {isAr ? "تطبيق" : "Apply"}
              </Button>
            ) : null}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {isAr
          ? "المعاينة للعرض فقط — لن تُحفظ التغييرات حتى الضغط على حفظ."
          : "Preview only — changes are saved when you submit."}
      </p>
    </div>
  );
}
