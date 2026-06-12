/**
 * CUX-1A-POLISH-1 — customer order date/time display (CUSTOMER-UX only).
 * Uses Asia/Riyadh; does not change storage or global locale policy.
 */

import { APP_TIMEZONE, formatInRestaurantTimezone } from "@/lib/datetime";

export type CustomerUiLanguage = "ar" | "en";

export function customerOrderLocale(language: CustomerUiLanguage): string {
  return language === "ar" ? "ar-SA" : "en-US";
}

const CUSTOMER_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  calendar: "gregory",
  numberingSystem: "latn",
};

const CUSTOMER_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  numberingSystem: "latn",
};

export function formatCustomerOrderDate(
  value: string | Date | null | undefined,
  language: CustomerUiLanguage
): string {
  return formatInRestaurantTimezone(
    value,
    customerOrderLocale(language),
    CUSTOMER_DATE_OPTIONS,
    APP_TIMEZONE
  );
}

export function formatCustomerOrderTime(
  value: string | Date | null | undefined,
  language: CustomerUiLanguage
): string {
  return formatInRestaurantTimezone(
    value,
    customerOrderLocale(language),
    CUSTOMER_TIME_OPTIONS,
    APP_TIMEZONE
  );
}
