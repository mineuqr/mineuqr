/**
 * Shared Commercial Catalog error type (no circular imports).
 */

export class CommercialCatalogError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "CommercialCatalogError";
  }
}
