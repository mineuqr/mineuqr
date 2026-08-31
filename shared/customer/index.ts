/**
 * CUSTOMER-FOUNDATION-1 — Global Customer shared surface.
 */

export {
  CASHIER_ANONYMOUS_CUSTOMER_LABEL,
  CUSTOMER_FOUNDATION_PROGRAM_ID,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  cashierCustomerDisplayLabel,
  type Customer,
  type CustomerCreateInput,
  type CustomerListFilter,
  type CustomerStatus,
  type CustomerType,
  type CustomerUpdateInput,
} from "./customerContract";

export {
  normalizeOptionalText,
  parseCustomerStatus,
  parseCustomerType,
  validateCustomerCreate,
  validateCustomerUpdate,
  type CustomerValidationIssue,
} from "./customerValidation";
