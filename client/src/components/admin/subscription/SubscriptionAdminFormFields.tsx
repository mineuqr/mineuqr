import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillingCycle, SubscriptionPlanLike, SubscriptionStatus } from "@/lib/subscription";
import { formatAdminSubscriptionPrice } from "@/lib/admin/formatAdminCurrency";
import { formatSubscriptionPlanName } from "@/lib/subscription";
import { useSubscriptionFormPreview } from "@/lib/subscription";
import { computeConcessionEndsAt, type ConcessionUnit } from "@shared/commercial-concession";
import { SubscriptionCycleSelector } from "./SubscriptionCycleSelector";
import { SubscriptionSummaryPreview } from "./SubscriptionSummaryPreview";

export type AdminFreePeriodMode = "none" | ConcessionUnit;

type SubscriptionAdminFormFieldsProps = {
  plans: SubscriptionPlanLike[] | undefined;
  planId: string;
  onPlanIdChange: (id: string) => void;
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  locale: "ar" | "en";
  planLabel: string;
  billingCycleLabel: string;
  endDateLabel: string;
  status?: SubscriptionStatus | string;
  onStatusChange?: (status: SubscriptionStatus) => void;
  statusLabel?: string;
  showStatus?: boolean;
  freePeriodMode?: AdminFreePeriodMode;
  onFreePeriodModeChange?: (mode: AdminFreePeriodMode) => void;
  freePeriodDuration?: string;
  onFreePeriodDurationChange?: (value: string) => void;
  freePeriodReason?: string;
  onFreePeriodReasonChange?: (value: string) => void;
  showFreePeriod?: boolean;
};

export function SubscriptionAdminFormFields({
  plans,
  planId,
  onPlanIdChange,
  billingCycle,
  onBillingCycleChange,
  endDate,
  onEndDateChange,
  locale,
  planLabel,
  billingCycleLabel,
  endDateLabel,
  status,
  onStatusChange,
  statusLabel: statusFieldLabel,
  showStatus = false,
  freePeriodMode = "none",
  onFreePeriodModeChange,
  freePeriodDuration = "",
  onFreePeriodDurationChange,
  freePeriodReason = "",
  onFreePeriodReasonChange,
  showFreePeriod = false,
}: SubscriptionAdminFormFieldsProps) {
  const isAr = locale === "ar";

  const planOptions = useMemo(
    () =>
      (plans ?? []).map((p) => ({
        id: p.id.toString(),
        name: formatSubscriptionPlanName(p, locale),
        price: formatAdminSubscriptionPrice(p, billingCycle, locale),
      })),
    [plans, billingCycle, locale]
  );

  const freeUntil = useMemo(() => {
    if (freePeriodMode === "none") return null;
    const duration = Number.parseInt(freePeriodDuration, 10);
    if (!Number.isInteger(duration) || duration <= 0) return null;
    return computeConcessionEndsAt(new Date(), freePeriodMode, duration);
  }, [freePeriodMode, freePeriodDuration]);

  const preview = useSubscriptionFormPreview({
    plans,
    planId,
    billingCycle,
    status,
    endDate,
    locale,
  });

  return (
    <div className="space-y-4 py-1">
      <SubscriptionSummaryPreview
        locale={locale}
        planName={preview.planName}
        cycleLabel={preview.cycleLabel}
        priceDisplay={preview.priceDisplay}
        statusLabel={showStatus ? preview.statusLabel : undefined}
        formattedEndDate={preview.formattedEndDate}
        formattedSuggestedEnd={preview.formattedSuggestedEnd}
        onApplySuggestedEnd={() => onEndDateChange(preview.suggestedEndDateInput)}
        showStatus={showStatus}
      />

      <div>
        <Label className="text-foreground">{planLabel}</Label>
        <Select value={planId} onValueChange={onPlanIdChange}>
          <SelectTrigger className="mt-2 bg-background border-border">
            <SelectValue placeholder={isAr ? "اختر الباقة" : "Select plan"} />
          </SelectTrigger>
          <SelectContent>
            {planOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <span className="flex flex-wrap items-center gap-2">
                  <span>{opt.name}</span>
                  <span dir="ltr" className="unicode-bidi-plaintext text-muted-foreground tabular-nums">
                    {opt.price}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SubscriptionCycleSelector
        value={billingCycle}
        onChange={onBillingCycleChange}
        label={billingCycleLabel}
        locale={locale}
      />

      {showStatus && onStatusChange ? (
        <div>
          <Label className="text-foreground">{statusFieldLabel ?? (isAr ? "حالة الاشتراك" : "Status")}</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v as SubscriptionStatus)}>
            <SelectTrigger className="mt-2 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{isAr ? "فعال" : "Active"}</SelectItem>
              <SelectItem value="trial">{isAr ? "تجريبي" : "Trial"}</SelectItem>
              <SelectItem value="expired">{isAr ? "منتهي" : "Expired"}</SelectItem>
              <SelectItem value="canceled">{isAr ? "ملغي" : "Canceled"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div>
        <Label className="text-foreground">{endDateLabel}</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          placeholder="2026/06/16"
          className="subscription-date-input-ltr mt-2 bg-background border-border text-foreground tabular-nums"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {isAr ? "اتركه فارغاً لاستخدام المدة الافتراضية عند الحفظ." : "Leave empty to use server default on save."}
        </p>
      </div>

      {showFreePeriod && onFreePeriodModeChange ? (
        <div className="space-y-3 rounded-lg border border-border/60 p-3">
          <div>
            <Label className="text-foreground">{isAr ? "الفترة المجانية" : "Free period"}</Label>
            <Select
              value={freePeriodMode}
              onValueChange={(v) => onFreePeriodModeChange(v as AdminFreePeriodMode)}
            >
              <SelectTrigger className="mt-2 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? "بدون" : "None"}</SelectItem>
                <SelectItem value="day">{isAr ? "أيام" : "Days"}</SelectItem>
                <SelectItem value="month">{isAr ? "أشهر تقويمية" : "Calendar months"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {freePeriodMode !== "none" ? (
            <>
              <div>
                <Label className="text-foreground">{isAr ? "المدة" : "Duration"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={freePeriodDuration}
                  onChange={(e) => onFreePeriodDurationChange?.(e.target.value)}
                  className="mt-2 bg-background border-border tabular-nums"
                />
              </div>
              <div>
                <Label className="text-foreground">{isAr ? "السبب" : "Reason"}</Label>
                <Input
                  value={freePeriodReason}
                  onChange={(e) => onFreePeriodReasonChange?.(e.target.value)}
                  className="mt-2 bg-background border-border"
                />
              </div>
              <p className="text-sm text-foreground">
                {isAr ? "مجاني حتى" : "Free until"}:{" "}
                <span dir="ltr" className="tabular-nums">
                  {freeUntil ? freeUntil.toISOString().slice(0, 10) : "—"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "سعر الباقة للعرض فقط. الفترة المجانية ليست اشتراكاً مدفوعاً وليست تجريبية."
                  : "Plan price is display-only. A free period is not a paid commitment and is not a trial."}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
