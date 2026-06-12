import { useRoute, useLocation } from "wouter";
import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomerOrderDateTimeFields } from "@/components/customer/CustomerOrderDateTimeFields";
import { OrderStatusStepper } from "@/components/customer/OrderStatusStepper";
import {
  formatOrderStatusHeadline,
  formatOrderStatusLabel,
  type OrderLifecycleStatus,
} from "@/lib/orderStatusDisplay";
import { CUSTOMER_ORDER_STATUS_POLL_MS } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export default function OrderStatusPage() {
  const { language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/menu/:slug/order/:trackingToken");
  const slug = params?.slug ?? "";
  const trackingToken = params?.trackingToken ?? "";
  const lang = language === "ar" ? "ar" : "en";

  const { data, isLoading, isError, isFetching, refetch } =
    trpc.order.getPublicStatus.useQuery(
      { trackingToken, slug },
      {
        enabled: !!trackingToken && !!slug,
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          if (status === "served" || status === "cancelled") return false;
          return CUSTOMER_ORDER_STATUS_POLL_MS;
        },
      }
    );

  if (!trackingToken || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <p className="text-muted-foreground">
          {language === "ar" ? "رابط الطلب غير صالح" : "Invalid order link"}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <p className="text-muted-foreground animate-pulse">
          {language === "ar" ? "جاري تحميل حالة الطلب..." : "Loading order status..."}
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <div className="max-w-md text-center space-y-4">
          <p className="text-muted-foreground">
            {language === "ar"
              ? "تعذر العثور على هذا الطلب. تحقق من الرابط أو تواصل مع المطعم."
              : "We could not find this order. Check the link or contact the restaurant."}
          </p>
          <Button variant="outline" onClick={() => setLocation(`/menu/${slug}`)}>
            {language === "ar" ? "العودة للمنيو" : "Back to menu"}
          </Button>
        </div>
      </div>
    );
  }

  const isRooms = data.tableLabel === "rooms";
  const unitLabel =
    language === "ar" ? (isRooms ? "غرفة" : "طاولة") : isRooms ? "Room" : "Table";
  const restaurantName =
    lang === "ar"
      ? data.restaurantName
      : data.restaurantNameEn || data.restaurantName;
  const status = data.status as OrderLifecycleStatus;
  const isCancelled = status === "cancelled";
  const isServed = status === "served";

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 px-4 py-10"
      dir={dir}
    >
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              {language === "ar" ? "تتبع الطلب" : "Order Tracking"}
            </h1>
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          </div>

          <div
            className={cn(
              "rounded-xl p-4 text-center",
              isCancelled
                ? "bg-red-50 dark:bg-red-950/30 border border-red-200/60"
                : isServed
                  ? "bg-green-50 dark:bg-green-950/25 border border-green-200/60"
                  : "bg-orange-50 dark:bg-orange-950/20 border border-orange-200/40"
            )}
          >
            <p className="text-lg font-bold text-foreground">
              {formatOrderStatusHeadline(status, lang)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatOrderStatusLabel(status, lang)}
            </p>
          </div>

          <OrderStatusStepper status={status} language={lang} dir={dir} />

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">
                {language === "ar" ? "رقم الطلب" : "Order Number"}
              </dt>
              <dd className="font-mono font-bold text-primary">{data.orderNumber}</dd>
            </div>
            <CustomerOrderDateTimeFields createdAt={data.createdAt} language={lang} />
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {unitLabel}
              </dt>
              <dd className="font-semibold">{data.tableNumber}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">
                {language === "ar" ? "عدد الأصناف" : "Items"}
              </dt>
              <dd className="font-semibold">{data.itemCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {language === "ar" ? "الإجمالي" : "Total"}
              </dt>
              <dd className="text-lg font-bold text-orange-600">
                {data.totalAmount} {data.currencySymbol}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 pt-2">
            {isFetching && !isLoading && (
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {language === "ar" ? "جاري التحديث..." : "Updating..."}
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => refetch()}>
              {language === "ar" ? "تحديث الحالة" : "Refresh status"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                setLocation(`/menu/${slug}/order/${trackingToken}/confirmed`)
              }
            >
              {language === "ar" ? "عرض تأكيد الطلب" : "View order confirmation"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
