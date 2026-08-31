/**
 * CUSTOMER-FOUNDATION-1
 * Global Customer domain contract — country-agnostic, tenant-scoped.
 * Answers "who is this customer?" — not invoice type, taxability, or payment.
 */

export const CUSTOMER_FOUNDATION_PROGRAM_ID = "CUSTOMER-FOUNDATION-1" as const;

export const CUSTOMER_TYPES = ["individual", "business"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_STATUSES = ["active", "archived"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

/**
 * Optional free-text tax identifier at the Global Customer layer.
 * Never globally mandatory. Country-specific validation belongs to Compliance.
 */
export type Customer = Readonly<{
  id: number;
  restaurantId: number;
  displayName: string;
  customerType: CustomerType;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** Optional; not required for Individual or Business at Customer Foundation. */
  taxNumber: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}>;

export type CustomerCreateInput = Readonly<{
  restaurantId: number;
  displayName: string;
  customerType: CustomerType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
}>;

export type CustomerUpdateInput = Readonly<{
  id: number;
  restaurantId: number;
  displayName?: string;
  customerType?: CustomerType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  status?: CustomerStatus;
}>;

export type CustomerListFilter = Readonly<{
  restaurantId: number;
  customerType?: CustomerType;
  status?: CustomerStatus;
  query?: string;
  limit?: number;
}>;

/**
 * Display-only walk-in label when no Customer is selected (customerId = null).
 * NOT a persisted Customer. NOT a payment method.
 */
export const CASHIER_ANONYMOUS_CUSTOMER_LABEL = {
  ar: "العميل: نقدًا",
  en: "Customer: Cash",
} as const;

export function cashierCustomerDisplayLabel(
  customer: Pick<Customer, "displayName"> | null | undefined,
  language: "ar" | "en"
): string {
  if (customer == null) {
    return CASHIER_ANONYMOUS_CUSTOMER_LABEL[language];
  }
  return customer.displayName.trim();
}
