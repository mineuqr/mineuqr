/** PR-CUX-1A — WhatsApp order copy helper (notification only; never creates orders). */

export type WhatsAppOrderMessageInput = {
  language: "ar" | "en";
  restaurantName: string;
  orderNumber: string;
  tableNumber: number;
  tableLabel: "tables" | "rooms";
  currencySymbol: string;
  totalAmount: string;
  customerName?: string;
  customerPhone?: string;
  orderNotes?: string;
  items: Array<{
    nameAr: string;
    nameEn?: string;
    price: string;
    quantity: number;
  }>;
};

export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  const isRooms = input.tableLabel === "rooms";
  const unitAr = isRooms ? "غرفة" : "طاولة";
  const unitEn = isRooms ? "Room" : "Table";
  const itemsList = input.items
    .map((item) => {
      const label =
        input.language === "ar"
          ? item.nameAr
          : item.nameEn || item.nameAr;
      return `• ${label} x${item.quantity} - ${item.price} ${input.currencySymbol}`;
    })
    .join("\n");

  if (input.language === "ar") {
    return `🍽️ طلب جديد - ${input.restaurantName}\n\n📋 رقم الطلب: ${input.orderNumber}\n🪑 ${unitAr} رقم: ${input.tableNumber}\n${input.customerName ? `👤 الاسم: ${input.customerName}\n` : ""}${input.customerPhone ? `📞 الهاتف: ${input.customerPhone}\n` : ""}\n📝 الطلب:\n${itemsList}\n\n💰 الإجمالي: ${input.totalAmount} ${input.currencySymbol}${input.orderNotes ? `\n\n📌 ملاحظات: ${input.orderNotes}` : ""}`;
  }

  return `🍽️ New Order - ${input.restaurantName}\n\n📋 Order #: ${input.orderNumber}\n🪑 ${unitEn}: ${input.tableNumber}\n${input.customerName ? `👤 Name: ${input.customerName}\n` : ""}${input.customerPhone ? `📞 Phone: ${input.customerPhone}\n` : ""}\n📝 Items:\n${itemsList}\n\n💰 Total: ${input.totalAmount} ${input.currencySymbol}${input.orderNotes ? `\n\n📌 Notes: ${input.orderNotes}` : ""}`;
}

export function openWhatsAppOrderMessage(phone: string, message: string): void {
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}
