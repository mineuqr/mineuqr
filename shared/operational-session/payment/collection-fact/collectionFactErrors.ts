/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 — Collection Fact errors.
 */

export type CollectionFactErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "TENANT"
  | "IMMUTABLE"
  | "STORAGE"
  | "DUPLICATE";

export class CollectionFactError extends Error {
  readonly code: CollectionFactErrorCode;

  constructor(code: CollectionFactErrorCode, message: string) {
    super(message);
    this.name = "CollectionFactError";
    this.code = code;
  }
}
