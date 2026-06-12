import { useRoute, useLocation } from "wouter";
import { CheckCircle2, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRiyadhDateTime } from "@/lib/datetime";
import {
  loadOrderConfirmationSnapshot,
  type OrderConfirmationSnapshot,
} from "@/lib/orderConfirmationStorage";
import { formatOrderStatusLabel } from "@/lib/orderStatusDisplay";
import {
  buildWhatsAppOrderMessage,
  openWhatsAppOrderMessage,
} from "@/lib/orderWhatsApp";
import { trpc } from "@/lib/trpc";

export default function OrderConfirmationPage() {
  const { language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/menu/:slug/order/:trackingToken/confirmed");
  const slug = params?.slug ?? "";
  const trackingToken = params?.trackingToken ?? "";

  const { data: restaurant } = trpc.restaurant.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const snapshot: OrderConfirmationSnapshot | null = trackingToken
    ? loadOrderConfirmationSnapshot(trackingToken)
    : null;

  const isRooms = snapshot?.tableLabel === "rooms";
  const unitLabel =
    language === "ar"
      ? isRooms
        ? "غرفة"
        : "طاولة"
      : isRooms
        ? "Room"
        : "Table";

  const whatsapp = (restaurant as { whatsapp?: string | null } | undefined)?.whatsapp;

  const handleWhatsApp = () => {
    if (!whatsapp || !snapshot) return;
    const message = buildWhatsAppOrderMessage({
      language: language === "ar" ? "ar" : "en",
      restaurantName: snapshot.restaurantName,
      orderNumber: snapshot.orderNumber,
      tableNumber: snapshot.tableNumber,
      tableLabel: snapshot.tableLabel,
      currencySymbol: snapshot.currencySymbol,
      totalAmount: snapshot.totalAmount,
      customerName: snapshot.customerName,
      customerPhone: snapshot.customerPhone,
      orderNotes: snapshot.orderNotes,
      items: snapshot.items,
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

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir={dir}>
        <div className="max-w-md text-center space-y-4">
          <p className="text-muted-foreground">
            {language === "ar"
              ? "تعذر تحميل تفاصيل الطلب. إذا أكملت الطلب للتو، ارجع من قائمة الطعام وحاول مرة أخرى."
              : "Unable to load order details. If you just placed this order, return from the menu and try again."}
          </p>
          <Button variant="outline" onClick={() => setLocation(`/menu/${slug}`)}>
            {language === "ar" ? "العودة للمنيو" : "Back to menu"}
          </Button>
        </div>
      </div>
    );
  }

  const formattedWhen = formatRiyadhDateTime(
    snapshot.createdAt,
    language === "ar" ? "ar-SA" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 px-4 py-10"
      dir={dir}
    >
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">
              {language === "ar" ? "تم تأكيد طلبك" : "Order Confirmed"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {snapshot.restaurantName}
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">
                {language === "ar" ? "رقم الطلب" : "Order Number"}
              </dt>
              <dd className="font-mono font-bold text-primary">{snapshot.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">
                {language === "ar" ? "التاريخ والوقت" : "Date & Time"}
              </dt>
              <dd className="text-end font-medium" dir="ltr">
                {formattedWhen}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {unitLabel}
              </dt>
              <dd className="font-semibold">{snapshot.tableNumber}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">
                {language === "ar" ? "الحالة" : "Status"}
              </dt>
              <dd className="font-semibold text-amber-600 dark:text-amber-400">
                {formatOrderStatusLabel(snapshot.status, language === "ar" ? "ar" : "en")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">
                {language === "ar" ? "عدد الأصناف" : "Items"}
              </dt>
              <dd className="font-semibold">{snapshot.itemCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {language === "ar" ? "الإجمالي" : "Total"}
              </dt>
              <dd className="text-lg font-bold text-orange-600">
                {snapshot.totalAmount} {snapshot.currencySymbol}
              </dd>
            </div>
          </dl>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-6"
              onClick={() =>
                setLocation(`/menu/${slug}/order/${trackingToken}`)
              }
            >
              {language === "ar" ? "تتبع الطلب" : "Track Order"}
            </Button>
            {whatsapp && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-bold py-6"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                {language === "ar" ? "إرسال نسخة عبر واتساب" : "Send Copy via WhatsApp"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
