import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, X, Plus, Minus, Trash2, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CartDrawerProps {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  whatsapp?: string | null;
  currencySymbol?: string;
  restaurantName?: string;
  tableLabel?: 'tables' | 'rooms';
}

export default function CartDrawer({
  restaurantId,
  tableId,
  tableNumber,
  whatsapp,
  currencySymbol = "ر.س",
  restaurantName,
  tableLabel = 'tables',
}: CartDrawerProps) {
  const isRooms = tableLabel === 'rooms';
  const unitAr = isRooms ? 'غرفة' : 'طاولة';
  const unitEn = isRooms ? 'Room' : 'Table';
  const { items, totalItems, totalAmount, isOpen, setIsOpen, updateQuantity, removeItem, clearCart } = useCart();
  const { t, dir, language } = useLanguage();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const createOrderMutation = trpc.order.create.useMutation();

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await createOrderMutation.mutateAsync({
        restaurantId,
        tableId,
        tableNumber,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: orderNotes || undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });

      // Send WhatsApp message
      if (whatsapp) {
        sendWhatsAppOrder(whatsapp, result.orderNumber || "");
      }

      setOrderSuccess(result.orderNumber || "");
      clearCart();
      toast.success(language === "ar" ? "تم إرسال طلبك بنجاح!" : "Your order has been submitted!");
    } catch (error) {
      toast.error(language === "ar" ? "حدث خطأ أثناء إرسال الطلب" : "Error submitting order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppOrder = (phone: string, orderNumber: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const itemsList = items
      .map((item) => `• ${language === "ar" ? item.nameAr : item.nameEn || item.nameAr} x${item.quantity} - ${item.price} ${currencySymbol}`)
      .join("\n");

    const message = language === "ar"
      ? `🍽️ طلب جديد - ${restaurantName || ""}\n\n📋 رقم الطلب: ${orderNumber}\n🪑 ${unitAr} رقم: ${tableNumber}\n${customerName ? `👤 الاسم: ${customerName}\n` : ""}${customerPhone ? `📞 الهاتف: ${customerPhone}\n` : ""}\n📝 الطلب:\n${itemsList}\n\n💰 الإجمالي: ${totalAmount.toFixed(2)} ${currencySymbol}${orderNotes ? `\n\n📌 ملاحظات: ${orderNotes}` : ""}`
      : `🍽️ New Order - ${restaurantName || ""}\n\n📋 Order #: ${orderNumber}\n🪑 ${unitEn}: ${tableNumber}\n${customerName ? `👤 Name: ${customerName}\n` : ""}${customerPhone ? `📞 Phone: ${customerPhone}\n` : ""}\n📝 Items:\n${itemsList}\n\n💰 Total: ${totalAmount.toFixed(2)} ${currencySymbol}${orderNotes ? `\n\n📌 Notes: ${orderNotes}` : ""}`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (orderSuccess) {
    return (
      <>
        {/* Floating button */}
        <button
          onClick={() => { setOrderSuccess(null); setIsOpen(true); }}
          className="fixed bottom-6 left-6 z-50 bg-green-500 text-white rounded-full p-4 shadow-lg"
          dir={dir}
        >
          <ShoppingCart className="w-6 h-6" />
        </button>

        {/* Success overlay */}
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setOrderSuccess(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {language === "ar" ? "تم إرسال طلبك!" : "Order Submitted!"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {language === "ar" ? "رقم الطلب:" : "Order #:"} <span className="font-mono font-bold">{orderSuccess}</span>
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {language === "ar" ? "سيتم تحضير طلبك قريباً" : "Your order will be prepared soon"}
            </p>
            <Button onClick={() => setOrderSuccess(null)} className="w-full">
              {language === "ar" ? "حسناً" : "OK"}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Floating cart button */}
      {totalItems > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
          dir={dir}
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
            {totalItems}
          </span>
        </button>
      )}

      {/* Cart drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100]" dir={dir}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          {/* Drawer */}
          <div className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300`}>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b dark:border-gray-700 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-lg">
                  {language === "ar" ? "سلة الطلبات" : "Cart"}
                </h3>
                <span className="text-sm text-gray-500">
                  ({language === "ar" ? `${unitAr} ${tableNumber}` : `${unitEn} ${tableNumber}`})
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>{language === "ar" ? "السلة فارغة" : "Cart is empty"}</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.menuItemId} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {language === "ar" ? item.nameAr : item.nameEn || item.nameAr}
                      </p>
                      <p className="text-orange-500 text-sm font-bold">
                        {item.price} {currencySymbol}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center hover:bg-orange-200"
                      >
                        <Plus className="w-3.5 h-3.5 text-orange-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <>
                {/* Customer info */}
                <div className="px-4 pb-3 space-y-2">
                  <Input
                    placeholder={language === "ar" ? "الاسم (اختياري)" : "Name (optional)"}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder={language === "ar" ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="text-sm"
                    dir="ltr"
                  />
                  <Textarea
                    placeholder={language === "ar" ? "ملاحظات على الطلب (اختياري)" : "Order notes (optional)"}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>

                {/* Total & Submit */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {language === "ar" ? "الإجمالي:" : "Total:"}
                    </span>
                    <span className="font-bold text-xl text-orange-500">
                      {totalAmount.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-xl text-base"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">{language === "ar" ? "جاري الإرسال..." : "Submitting..."}</span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        <Send className="w-4 h-4" />
                        {language === "ar" ? "إرسال الطلب" : "Submit Order"}
                      </span>
                    )}
                  </Button>
                  {whatsapp && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const orderNumber = `ORD-${Date.now()}`;
                        sendWhatsAppOrder(whatsapp, orderNumber);
                      }}
                      className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-bold py-3 rounded-xl text-base"
                    >
                      <MessageCircle className="w-4 h-4 ml-2" />
                      {language === "ar" ? "إرسال عبر واتساب" : "Send via WhatsApp"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
