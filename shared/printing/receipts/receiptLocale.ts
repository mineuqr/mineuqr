/**
 * THERMAL-PRINTING-13B — locale and direction foundation (architecture only).
 *
 * Arabic shaping, RTL layout, and bidi processing are deferred to post-13B programs.
 */
import {
  PRINT_TICKET_LOCALE,
  type PrintTicketLocale,
} from "../types";

export type ReceiptLocale = PrintTicketLocale;

export const RECEIPT_LOCALE_VALUES = [
  PRINT_TICKET_LOCALE.EN,
  PRINT_TICKET_LOCALE.AR,
  PRINT_TICKET_LOCALE.BILINGUAL,
] as const;

export type LayoutDirection = "ltr" | "rtl";

export type TextDirection = "ltr" | "rtl" | "inherit";

export type ReceiptDirectionProfile = {
  locale: ReceiptLocale;
  layoutDirection: LayoutDirection;
  defaultTextDirection: TextDirection;
};

export function resolveReceiptDirectionProfile(
  locale: ReceiptLocale
): ReceiptDirectionProfile {
  switch (locale) {
    case PRINT_TICKET_LOCALE.AR:
      return {
        locale,
        layoutDirection: "rtl",
        defaultTextDirection: "rtl",
      };
    case PRINT_TICKET_LOCALE.BILINGUAL:
      return {
        locale,
        layoutDirection: "ltr",
        defaultTextDirection: "inherit",
      };
    case PRINT_TICKET_LOCALE.EN:
    default:
      return {
        locale: PRINT_TICKET_LOCALE.EN,
        layoutDirection: "ltr",
        defaultTextDirection: "ltr",
      };
  }
}

export function isReceiptLocale(value: string): value is ReceiptLocale {
  return (RECEIPT_LOCALE_VALUES as readonly string[]).includes(value);
}
