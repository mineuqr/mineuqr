import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShoppingCart, X, Plus, Minus, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartDrawerProps {
  slug: string;
  tableNumber: number;
  currencySymbol?: string;
  tableLabel?: "tables" | "rooms";
}

export default function CartDrawer({
  slug,
  tableNumber,
  currencySymbol = "ر.س",
  tableLabel = "tables",
}: CartDrawerProps) {
  const isRooms = tableLabel === "rooms";
  const unitAr = isRooms ? "غرفة" : "طاولة";
  const unitEn = isRooms ? "Room" : "Table";
  const { items, totalItems, totalAmount, isOpen, setIsOpen, updateQuantity, removeItem } =
    useCart();
  const { dir, language } = useLanguage();
  const [, setLocation] = useLocation();

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;
    setIsOpen(false);
    setLocation(`/menu/${slug}/table/${tableNumber}/checkout`);
  };

  return (
    <>
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

      {isOpen && (
        <div className="fixed inset-0 z-[100]" dir={dir}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
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
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>{language === "ar" ? "السلة فارغة" : "Cart is empty"}</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
                  >
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
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
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
                  onClick={handleProceedToCheckout}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-xl text-base"
                >
                  <span className="flex items-center gap-2 justify-center">
                    {language === "ar" ? "تأكيد الطلب" : "Confirm Order"}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
