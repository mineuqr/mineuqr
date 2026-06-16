import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { MapPin, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomerOrderDateTimeFields } from "@/components/customer/CustomerOrderDateTimeFields";
import { CustomerSoundAlertsEnable } from "@/components/customer/CustomerSoundAlertsEnable";
import { OrderReceivedHero } from "@/components/customer/OrderReceivedHero";
import { OrderStatusStepper } from "@/components/customer/OrderStatusStepper";
import { ReadyStatusAttention } from "@/components/customer/ReadyStatusAttention";
import {
  formatOrderStatusHeadline,
  formatOrderStatusLabel,
  type OrderLifecycleStatus,
} from "@/lib/orderStatusDisplay";
import { loadOrderConfirmationSnapshot } from "@/lib/orderConfirmationStorage";
import { consumeOrderWelcomeReceived } from "@/lib/orderWelcomeStorage";
import {
  buildWhatsAppOrderMessage,
  openWhatsAppOrderMessage,
} from "@/lib/orderWhatsApp";
import { CUSTOMER_ORDER_STATUS_POLL_MS } from "@/lib/queryRuntime";
import { useReadyStatusAlerts } from "@/hooks/useReadyStatusAlerts";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export default function OrderStatusPage() {
  const { language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/menu/:slug/order/:trackingToken");
  const slug = params?.slug ?? "";
  const trackingToken = params?.trackingToken ?? "";
  const lang = language === "ar" ? "ar" : "en";
  const [showWelcomeHero, setShowWelcomeHero] = useState(false);

  useEffect(() => {
    if (!trackingToken) return;
    setShowWelcomeHero(consumeOrderWelcomeReceived(trackingToken));
  }, [trackingToken]);

  const { data: restaurant } = trpc.restaurant.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

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

  const { notificationDeliveredHint } = useReadyStatusAlerts({
    trackingToken,
    status: data?.status as OrderLifecycleStatus | undefined,
    orderNumber: data?.orderNumber,
    language: lang,
    enabled: !!trackingToken && !!slug && !!data && !isLoading && !isError,
  });

  const orderSnapshot = trackingToken ? loadOrderConfirmationSnapshot(trackingToken) : null;
  const whatsapp = (restaurant as { whatsapp?: string | null } | undefined)?.whatsapp;

  const handleWhatsApp = () => {
    if (!whatsapp) return;
    const snapshot = orderSnapshot;
    const message = buildWhatsAppOrderMessage({
      language: lang,
      restaurantName: snapshot?.restaurantName ?? data?.restaurantName ?? "",
      orderNumber: snapshot?.orderNumber ?? data?.orderNumber ?? "",
      tableNumber: snapshot?.tableNumber ?? data?.tableNumber ?? 0,
      tableLabel: snapshot?.tableLabel ?? data?.tableLabel ?? "tables",
      currencySymbol: snapshot?.currencySymbol ?? data?.currencySymbol ?? "",
      totalAmount: snapshot?.totalAmount ?? data?.totalAmount ?? "",
      customerName: snapshot?.customerName,
      customerPhone: snapshot?.customerPhone,
      orderNotes: snapshot?.orderNotes,
      items: snapshot?.items ?? [],
    });
    openWhatsAppOrderMessage(whatsapp, message);
  };

  if (!trackingToken || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <p className="text-muted-foreground">
          {language === "ar" ? "رابط الطلب غير صالح" : "Invalid order link"}
        </p>
      </div>
    );
  }

  if (isLoading && !(showWelcomeHero && orderSnapshot)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <p className="text-muted-foreground animate-pulse">
          {language === "ar" ? "جاري تحميل حالة الطلب..." : "Loading order status..."}
        </p>
      </div>
    );
  }

  if ((isError || !data) && !orderSnapshot && !isLoading) {
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

  const status = (data?.status ?? orderSnapshot?.status ?? "pending") as OrderLifecycleStatus;
  const isRooms = (data?.tableLabel ?? orderSnapshot?.tableLabel) === "rooms";
  const unitLabel =
    language === "ar" ? (isRooms ? "غرفة" : "طاولة") : isRooms ? "Room" : "Table";
  const restaurantName =
    lang === "ar"
      ? data?.restaurantName ?? orderSnapshot?.restaurantName ?? ""
      : data?.restaurantNameEn || data?.restaurantName || orderSnapshot?.restaurantName || "";
  const isCancelled = status === "cancelled";
  const isServed = status === "served";
  const isReady = status === "ready";

  const orderNumber = data?.orderNumber ?? orderSnapshot?.orderNumber ?? "";
  const createdAt = data?.createdAt ?? orderSnapshot?.createdAt ?? "";
  const tableNumber = data?.tableNumber ?? orderSnapshot?.tableNumber ?? 0;
  const itemCount = data?.itemCount ?? orderSnapshot?.itemCount ?? 0;
  const totalAmount = data?.totalAmount ?? orderSnapshot?.totalAmount ?? "";
  const currencySymbol = data?.currencySymbol ?? orderSnapshot?.currencySymbol ?? "";

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 px-4 py-10"
      dir={dir}
    >
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8 space-y-6">
          {showWelcomeHero ? (
            <OrderReceivedHero
              language={lang}
              orderNumber={orderNumber}
              restaurantName={restaurantName}
              createdAt={createdAt}
              tableNumber={tableNumber}
              unitLabel={unitLabel}
            />
          ) : (
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">
                {language === "ar" ? "تتبع الطلب" : "Order Tracking"}
              </h1>
              <p className="text-sm text-muted-foreground">{restaurantName}</p>
            </div>
          )}

          <div
            className={cn(
              "rounded-xl p-4 text-center transition-shadow",
              isCancelled
                ? "bg-red-50 dark:bg-red-950/30 border border-red-200/60"
                : isServed
                  ? "bg-green-50 dark:bg-green-950/25 border border-green-200/60"
                  : isReady
                    ? "bg-green-50 dark:bg-green-950/25 border-2 border-green-400/70 shadow-green-200/40 shadow-md ring-2 ring-green-400/30"
                    : "bg-orange-50 dark:bg-orange-950/20 border border-orange-200/40"
            )}
          >
            {isReady && <ReadyStatusAttention language={lang} className="mb-3" />}
            <p className="text-lg font-bold text-foreground">
              {formatOrderStatusHeadline(status, lang)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatOrderStatusLabel(status, lang)}
            </p>
            {isReady && notificationDeliveredHint && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                {language === "ar" ? "تم إرسال تنبيه لك" : "We sent you an alert"}
              </p>
            )}
            {isLoading && (
              <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                {language === "ar" ? "جاري تحميل الحالة..." : "Loading status..."}
              </p>
            )}
          </div>

          {!isServed && !isCancelled && (
            <CustomerSoundAlertsEnable language={lang} />
          )}

          {!isLoading && data && (
            <OrderStatusStepper status={status} language={lang} dir={dir} />
          )}

          {!showWelcomeHero && (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
                <dt className="text-muted-foreground">
                  {language === "ar" ? "رقم الطلب" : "Order Number"}
                </dt>
                <dd className="font-mono font-bold text-primary">{orderNumber}</dd>
              </div>
              <CustomerOrderDateTimeFields createdAt={createdAt} language={lang} />
              <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {unitLabel}
                </dt>
                <dd className="font-semibold">{tableNumber}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
                <dt className="text-muted-foreground">
                  {language === "ar" ? "عدد الأصناف" : "Items"}
                </dt>
                <dd className="font-semibold">{itemCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {language === "ar" ? "الإجمالي" : "Total"}
                </dt>
                <dd className="text-lg font-bold text-orange-600">
                  {totalAmount} {currencySymbol}
                </dd>
              </div>
            </dl>
          )}

          {showWelcomeHero && (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
                <dt className="text-muted-foreground">
                  {language === "ar" ? "عدد الأصناف" : "Items"}
                </dt>
                <dd className="font-semibold">{itemCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {language === "ar" ? "الإجمالي" : "Total"}
                </dt>
                <dd className="text-lg font-bold text-orange-600">
                  {totalAmount} {currencySymbol}
                </dd>
              </div>
            </dl>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {whatsapp && (orderSnapshot || data) && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-bold py-5"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-4 w-4 ml-2" aria-hidden />
                {language === "ar" ? "إرسال نسخة عبر واتساب" : "Send Copy via WhatsApp"}
              </Button>
            )}
            {isFetching && !isLoading && (
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                {language === "ar" ? "جاري التحديث..." : "Updating..."}
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => refetch()}>
              {language === "ar" ? "تحديث الحالة" : "Refresh status"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
