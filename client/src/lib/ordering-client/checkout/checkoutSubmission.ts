/**
 * ORDERING-CLIENT-CHECKOUT-1 — pure checkout submission helpers.
 * Notes validation uses Ordering Platform contracts only (no channel rules).
 */
import { TRPCClientError } from "@trpc/client";
import {
  validateItemNote,
  validateOrderNote,
} from "@shared/ordering-platform/orderingNotesContract";
import type { OrderingCartItem } from "../cart/cartTypes";
import type {
  CheckoutDraftSnapshot,
  CheckoutOrderSummaryLine,
  CheckoutSubmitError,
} from "./checkoutTypes";

export function buildOrderSummaryLines(
  items: OrderingCartItem[]
): CheckoutOrderSummaryLine[] {
  return items.map((item) => ({
    menuItemId: item.menuItemId,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    price: item.price,
    quantity: item.quantity,
    notes: item.notes,
    lineTotal: parseFloat(item.price) * item.quantity,
  }));
}

export function validateCheckoutNotes(input: {
  orderNotes: string;
  items: OrderingCartItem[];
  maxOrderNoteLength: number;
  maxItemNoteLength: number;
}):
  | {
      ok: true;
      orderNotes: string | null;
      items: CheckoutDraftSnapshot["items"];
    }
  | { ok: false; error: CheckoutSubmitError } {
  const orderNoteResult = validateOrderNote(
    input.orderNotes,
    input.maxOrderNoteLength
  );
  if (!orderNoteResult.ok) {
    return {
      ok: false,
      error: {
        code: "ORDER_NOTE_INVALID",
        message: orderNoteResult.message,
      },
    };
  }

  const items: Array<CheckoutDraftSnapshot["items"][number]> = [];
  for (const item of input.items) {
    const itemNoteResult = validateItemNote(
      item.notes,
      input.maxItemNoteLength
    );
    if (!itemNoteResult.ok) {
      return {
        ok: false,
        error: {
          code: "ITEM_NOTE_INVALID",
          message: itemNoteResult.message,
        },
      };
    }
    items.push({
      menuItemId: item.menuItemId,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      price: item.price,
      quantity: item.quantity,
      notes: itemNoteResult.value,
      modifiers: item.modifiers,
    });
  }

  return {
    ok: true,
    orderNotes: orderNoteResult.value,
    items,
  };
}

export function mapCheckoutSubmitError(
  error: unknown,
  language: "ar" | "en"
): CheckoutSubmitError {
  const sessionEnded =
    error instanceof TRPCClientError &&
    error.message.includes("انتهت جلسة الطاولة");

  if (sessionEnded) {
    return {
      code: "SESSION_ENDED",
      message:
        language === "ar"
          ? "انتهت جلسة الطاولة. للطلب مجدداً امسح رمز الطاولة."
          : "This table session has ended. Scan the table QR to start a new session.",
    };
  }

  return {
    code: "SUBMIT_FAILED",
    message:
      language === "ar"
        ? "حدث خطأ أثناء إرسال الطلب"
        : "Error submitting order",
  };
}

export function presentOrderNoteError(
  message: string,
  language: "ar" | "en"
): string {
  return language === "ar" ? "ملاحظة الطلب طويلة جداً" : message;
}
