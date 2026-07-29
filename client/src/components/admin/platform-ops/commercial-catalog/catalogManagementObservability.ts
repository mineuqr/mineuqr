/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1
 * Client-side management UX observability (presentation metrics).
 * Server mutations continue to own audit; this tracks UI outcomes only.
 */

export type CatalogManagementUiMetrics = {
  program: "COMMERCIAL-CATALOG-MANAGEMENT-UI-1";
  crudAttempts: number;
  crudSuccesses: number;
  crudFailures: number;
  validationRuns: number;
  validationFailures: number;
  publicationAttempts: number;
  publicationFailures: number;
  lastError: string | null;
};

class CatalogManagementUiObservability {
  crudAttempts = 0;
  crudSuccesses = 0;
  crudFailures = 0;
  validationRuns = 0;
  validationFailures = 0;
  publicationAttempts = 0;
  publicationFailures = 0;
  lastError: string | null = null;

  recordCrud(ok: boolean, error?: string) {
    this.crudAttempts += 1;
    if (ok) this.crudSuccesses += 1;
    else {
      this.crudFailures += 1;
      this.lastError = error ?? "crud_failed";
    }
  }

  recordValidation(ok: boolean) {
    this.validationRuns += 1;
    if (!ok) this.validationFailures += 1;
  }

  recordPublication(ok: boolean, error?: string) {
    this.publicationAttempts += 1;
    if (!ok) {
      this.publicationFailures += 1;
      this.lastError = error ?? "publication_failed";
    }
  }

  snapshot(): CatalogManagementUiMetrics & { crudSuccessRate: number } {
    const rate =
      this.crudAttempts === 0
        ? 1
        : this.crudSuccesses / this.crudAttempts;
    return {
      program: "COMMERCIAL-CATALOG-MANAGEMENT-UI-1",
      crudAttempts: this.crudAttempts,
      crudSuccesses: this.crudSuccesses,
      crudFailures: this.crudFailures,
      validationRuns: this.validationRuns,
      validationFailures: this.validationFailures,
      publicationAttempts: this.publicationAttempts,
      publicationFailures: this.publicationFailures,
      lastError: this.lastError,
      crudSuccessRate: rate,
    };
  }
}

export const catalogManagementUiObservability =
  new CatalogManagementUiObservability();
