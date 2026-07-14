import { CheckCircle2, MapPin } from "lucide-react";
import { CustomerOrderDateTimeFields } from "@/components/customer/CustomerOrderDateTimeFields";

type OrderReceivedHeroProps = {
  language: "ar" | "en";
  /** Server-resolved Business Display Identity (e.g. "T #001" / "K #001"). */
  displayReference: string;
  restaurantName: string;
  createdAt: string;
  tableNumber: number;
  unitLabel: string;
};

export function OrderReceivedHero({
  language,
  displayReference,
  restaurantName,
  createdAt,
  tableNumber,
  unitLabel,
}: OrderReceivedHeroProps) {
  return (
    <section
      className="rounded-xl border border-green-200/70 bg-green-50/80 dark:bg-green-950/20 dark:border-green-800/50 p-4 sm:p-5 space-y-4"
      aria-label={language === "ar" ? "تم استلام الطلب" : "Order received"}
    >
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold">
            {language === "ar" ? "تم استلام طلبك" : "Order Received"}
          </h1>
          <p className="text-sm font-mono font-bold text-primary">{displayReference}</p>
          {restaurantName ? (
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          ) : null}
        </div>
        <p className="text-sm text-foreground/90">
          {language === "ar"
            ? "تم استلام طلبك بنجاح. سنُعلمك عندما يصبح جاهزاً."
            : "Your order has been received successfully. We will notify you when it is ready."}
        </p>
      </div>

      <dl className="space-y-2 text-sm border-t border-green-200/50 dark:border-green-800/40 pt-3">
        <CustomerOrderDateTimeFields createdAt={createdAt} language={language} />
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {unitLabel}
          </dt>
          <dd className="font-semibold">{tableNumber}</dd>
        </div>
      </dl>
    </section>
  );
}
