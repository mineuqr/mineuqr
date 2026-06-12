import {
  formatCustomerOrderDate,
  formatCustomerOrderTime,
  type CustomerUiLanguage,
} from "@/lib/customerOrderDateTime";

type CustomerOrderDateTimeFieldsProps = {
  createdAt: string;
  language: CustomerUiLanguage;
};

/** Separate date + time rows for CUSTOMER-UX pages (CUX-1A-POLISH-1). */
export function CustomerOrderDateTimeFields({
  createdAt,
  language,
}: CustomerOrderDateTimeFieldsProps) {
  const date = formatCustomerOrderDate(createdAt, language);
  const time = formatCustomerOrderTime(createdAt, language);
  const htmlLang = language === "ar" ? "ar" : "en";

  return (
    <>
      <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
        <dt className="text-muted-foreground shrink-0">
          {language === "ar" ? "التاريخ" : "Date"}
        </dt>
        <dd
          className="font-medium text-end leading-snug tabular-nums [unicode-bidi:isolate]"
          dir="auto"
          lang={htmlLang}
        >
          {date}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
        <dt className="text-muted-foreground shrink-0">
          {language === "ar" ? "الوقت" : "Time"}
        </dt>
        <dd
          className="font-medium text-end leading-snug tabular-nums [unicode-bidi:isolate]"
          dir="auto"
          lang={htmlLang}
        >
          {time}
        </dd>
      </div>
    </>
  );
}
