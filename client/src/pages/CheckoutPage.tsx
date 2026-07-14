import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DiningSessionBanner } from "@/components/customer/DiningSessionBanner";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDiningSessionRecovery } from "@/hooks/useDiningSessionRecovery";
import { isDiningSessionOrderingEnabled } from "@/lib/diningSessionRecovery";
import { saveOrderConfirmationSnapshot } from "@/lib/orderConfirmationStorage";
import { markOrderWelcomeReceived } from "@/lib/orderWelcomeStorage";
import { saveDiningSession } from "@/lib/diningSessionStorage";
import { markCustomerJourneyTracking } from "@/lib/customerJourneyStorage";
import { trpc } from "@/lib/trpc";
import { usePostSubmissionGuard } from "@/hooks/usePostSubmissionGuard";
import { PostSubmissionLockedScreen } from "@/components/customer/PostSubmissionLockedScreen";
import { useQrOrderingRuntime } from "@/hooks/useQrOrderingRuntime";
import {
  validateItemNote,
  validateOrderNote,
} from "@shared/ordering-platform/orderingNotesContract";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — Checkout consumes OrderingRuntimeContext.
 * Place-order mutation authority unchanged (order.create).
 */
export default function CheckoutPage() {
  const [, params] = useRoute("/menu/:slug/table/:tableNumber/checkout");
  const slug = params?.slug ?? "";
  const tableNumber = params?.tableNumber ? parseInt(params.tableNumber, 10) : 0;
  const { language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const lang = language === "ar" ? "ar" : "en";
  const utils = trpc.useUtils();

  const { items, totalAmount, clearCart } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuPath = `/menu/${slug}/table/${tableNumber}`;

  const {
    restaurant,
    isLoading: restaurantLoading,
    gates,
  } = useQrOrderingRuntime(slug);

  const { data: tableData } = trpc.table.getByNumber.useQuery(
    { restaurantId: restaurant?.id ?? 0, tableNumber },
    { enabled: !!restaurant?.id && tableNumber > 0, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const { recovery, recoveryDone } = useDiningSessionRecovery({
    slug,
    tableNumber,
    restaurantId: restaurant?.id,
    client: {
      getByToken: (input) => utils.client.session.getByToken.query(input),
      getActiveByTable: (input) => utils.client.session.getActiveByTable.query(input),
    },
  });

  const sessionAllowsOrder = isDiningSessionOrderingEnabled(recovery);
  const postSubmission = usePostSubmissionGuard({
    slug,
    tableNumber,
    recovery,
    recoveryDone,
  });

  const canPlaceOrder =
    tableNumber > 0 &&
    gates.platformCanPlaceOrder &&
    sessionAllowsOrder &&
    recoveryDone &&
    !postSubmission.blocked &&
    items.length > 0;

  const createOrderMutation = trpc.order.create.useMutation();

  const currencySymbol = (restaurant as { currencySymbol?: string } | undefined)?.currencySymbol ?? "ر.س";
  const restaurantName = restaurant?.nameAr ?? "";
  const tableLabel = ((restaurant as { tableLabel?: string } | undefined)?.tableLabel ?? "tables") as
    | "tables"
    | "rooms";
  const isRooms = tableLabel === "rooms";
  const unitLabel =
    language === "ar" ? (isRooms ? "غرفة" : "طاولة") : isRooms ? "Room" : "Table";
  const bannerStatus = recovery.session?.status ?? recovery.endedStatus;
  const showSessionBanner = recoveryDone && bannerStatus != null;

  useEffect(() => {
    if (!recoveryDone || !postSubmission.blocked || !postSubmission.trackingPath) return;
    setLocation(postSubmission.trackingPath, { replace: true });
  }, [recoveryDone, postSubmission.blocked, postSubmission.trackingPath, setLocation]);

  useEffect(() => {
    if (!recoveryDone || postSubmission.blocked) return;
    if (items.length === 0) {
      setLocation(menuPath);
    }
  }, [items.length, recoveryDone, postSubmission.blocked, menuPath, setLocation]);

  useEffect(() => {
    if (!recoveryDone || restaurantLoading) return;
    if (!canPlaceOrder && items.length > 0) {
      setLocation(menuPath);
    }
  }, [canPlaceOrder, recoveryDone, restaurantLoading, items.length, menuPath, setLocation]);

  const handleSubmitOrder = async () => {
    if (!restaurant?.id || !tableData?.id || items.length === 0 || !canPlaceOrder) return;
    setIsSubmitting(true);
    try {
      const orderNoteResult = validateOrderNote(orderNotes, gates.notes.maxOrderNoteLength);
      if (!orderNoteResult.ok) {
        toast.error(
          language === "ar" ? "ملاحظة الطلب طويلة جداً" : orderNoteResult.message
        );
        return;
      }

      const cartItems = items.map((item) => {
        const itemNoteResult = validateItemNote(item.notes, gates.notes.maxItemNoteLength);
        if (!itemNoteResult.ok) {
          throw new Error(itemNoteResult.message);
        }
        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: itemNoteResult.value,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          price: item.price,
        };
      });

      const result = await createOrderMutation.mutateAsync({
        restaurantId: restaurant.id,
        tableId: tableData.id,
        tableNumber,
        sessionToken: recovery.session?.sessionToken,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: orderNoteResult.value ?? undefined,
        items: cartItems.map(({ menuItemId, quantity, notes }) => ({
          menuItemId,
          quantity,
          notes,
        })),
      });

      if (!result.trackingToken) {
        throw new Error("Missing tracking token");
      }

      if (result.sessionToken) {
        saveDiningSession({
          sessionToken: result.sessionToken,
          slug,
          tableNumber,
        });
      }

      saveOrderConfirmationSnapshot({
        orderId: result.orderId ?? 0,
        orderNumber: result.orderNumber ?? "",
        trackingToken: result.trackingToken,
        tableNumber: result.tableNumber ?? tableNumber,
        totalAmount: result.totalAmount ?? totalAmount.toFixed(2),
        itemCount: result.itemCount ?? items.reduce((s, i) => s + i.quantity, 0),
        createdAt: result.createdAt ?? new Date().toISOString(),
        status: "pending",
        currencySymbol,
        restaurantName,
        tableLabel,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        orderNotes: orderNotes || undefined,
        items: cartItems.map((item) => ({
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      markOrderWelcomeReceived(result.trackingToken);
      markCustomerJourneyTracking({
        slug,
        tableNumber,
        trackingToken: result.trackingToken,
        sessionToken: result.sessionToken ?? recovery.session?.sessionToken,
      });
      clearCart();
      setLocation(`/menu/${slug}/order/${result.trackingToken}`, { replace: true });
    } catch (error) {
      const sessionEnded =
        error instanceof TRPCClientError && error.message.includes("انتهت جلسة الطاولة");
      toast.error(
        sessionEnded
          ? language === "ar"
            ? "انتهت جلسة الطاولة. للطلب مجدداً امسح رمز الطاولة."
            : "This table session has ended. Scan the table QR to start a new session."
          : language === "ar"
            ? "حدث خطأ أثناء إرسال الطلب"
            : "Error submitting order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (restaurantLoading || !recoveryDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (postSubmission.blocked) {
    return (
      <PostSubmissionLockedScreen
        language={lang}
        trackingPath={postSubmission.trackingPath}
        onOpenTracking={
          postSubmission.trackingPath
            ? () => setLocation(postSubmission.trackingPath!, { replace: true })
            : undefined
        }
      />
    );
  }

  if (!restaurant || items.length === 0) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 pb-28"
      dir={dir}
    >
      {showSessionBanner && bannerStatus && (
        <DiningSessionBanner language={lang} status={bannerStatus} />
      )}

      <header className="sticky top-0 z-10 border-b border-orange-200/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setLocation(menuPath)}
            aria-label={language === "ar" ? "العودة للمنيو" : "Back to menu"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-lg truncate">
              {language === "ar" ? "مراجعة الطلب" : "Review Order"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {restaurantName} · {unitLabel} {tableNumber}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="font-semibold">
              {language === "ar" ? "ملخص الطلب" : "Order summary"}
            </h2>
          </div>
          <ul className="divide-y divide-border/40">
            {items.map((item) => (
              <li key={item.menuItemId} className="px-4 py-3 flex justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {language === "ar" ? item.nameAr : item.nameEn || item.nameAr}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-orange-600 shrink-0">
                  {(parseFloat(item.price) * item.quantity).toFixed(2)} {currencySymbol}
                </p>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-border/40 flex justify-between items-center bg-orange-50/50 dark:bg-orange-950/20">
            <span className="font-bold">
              {language === "ar" ? "الإجمالي" : "Total"}
            </span>
            <span className="font-bold text-xl text-orange-600">
              {totalAmount.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">
            {language === "ar" ? "اختياري" : "Optional"}
          </h2>
          <Input
            placeholder={language === "ar" ? "الاسم (اختياري)" : "Name (optional)"}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            placeholder={language === "ar" ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            dir="ltr"
          />
          <Textarea
            placeholder={
              language === "ar" ? "ملاحظات على الطلب (اختياري)" : "Order notes (optional)"
            }
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-orange-200/60 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          <Button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting || !canPlaceOrder}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-6 rounded-xl text-base"
          >
            {isSubmitting ? (
              <span className="animate-pulse">
                {language === "ar" ? "جاري الإرسال..." : "Submitting..."}
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <Send className="w-4 h-4" />
                {language === "ar" ? "إرسال الطلب" : "Submit Order"}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
