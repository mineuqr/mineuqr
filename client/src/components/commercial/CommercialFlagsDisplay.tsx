import { Badge } from "@/components/ui/badge";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialEntitlements } from "@commercial/types";

type CommercialFlagsDisplayProps = {
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

const FLAG_DEFS: Array<{
  key: keyof CommercialEntitlements["commercial"];
  labelEn: string;
  labelAr: string;
}> = [
  { key: "isTrial", labelEn: "Trial", labelAr: "تجريبي" },
  { key: "isPaid", labelEn: "Paid", labelAr: "مدفوع" },
  { key: "isEnterprise", labelEn: "Enterprise", labelAr: "مؤسسي" },
  { key: "isAdmin", labelEn: "Admin", labelAr: "مسؤول" },
  { key: "countsInMrr", labelEn: "Counts in MRR", labelAr: "يُحسب في MRR" },
  { key: "countsInRevenue", labelEn: "Counts in revenue", labelAr: "يُحسب في الإيرادات" },
  { key: "invoiceEligible", labelEn: "Invoice eligible", labelAr: "مؤهل للفوترة" },
];

/** Read-only commercial participation flags. */
export function CommercialFlagsDisplay({
  entitlements,
  language,
}: CommercialFlagsDisplayProps) {
  if (!entitlements) {
    return (
      <p className="text-sm text-muted-foreground">
        {language === "ar" ? "لا توجد بيانات" : "No data"}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FLAG_DEFS.map((flag) => {
        const active = entitlements.commercial[flag.key];
        return (
          <Badge
            key={flag.key}
            variant={active ? "default" : "outline"}
            className={active ? "" : "opacity-60"}
          >
            {language === "ar" ? flag.labelAr : flag.labelEn}
            {": "}
            {active
              ? language === "ar"
                ? "نعم"
                : "Yes"
              : language === "ar"
                ? "لا"
                : "No"}
          </Badge>
        );
      })}
    </div>
  );
}
