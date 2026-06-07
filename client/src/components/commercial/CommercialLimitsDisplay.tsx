import { getLimitRows } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialEntitlements } from "@commercial/types";

type CommercialLimitsDisplayProps = {
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** Read-only account limits from canonical entitlements. */
export function CommercialLimitsDisplay({
  entitlements,
  language,
}: CommercialLimitsDisplayProps) {
  if (!entitlements) {
    return (
      <p className="text-sm text-muted-foreground">
        {language === "ar" ? "لا توجد بيانات" : "No data"}
      </p>
    );
  }

  const rows = getLimitRows(entitlements.limits, language);

  return (
    <dl className="grid gap-2 sm:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-lg border border-border bg-muted/30 px-3 py-2"
        >
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-lg font-semibold text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
