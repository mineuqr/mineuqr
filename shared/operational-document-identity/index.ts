/**
 * OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 — shared platform barrel.
 */

export {
  OPERATIONAL_DOCUMENT_IDENTITY_STANDARD_ID,
  OPERATIONAL_DOCUMENT_TYPES,
  OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY,
  getOperationalDocumentSpec,
  listOperationalDocumentTypes,
  assertOperationalDocumentRegistered,
  type OperationalDocumentType,
  type OperationalDocumentOwner,
  type OperationalDocumentIdentitySpec,
} from "./registry";

export {
  formatOperationalIdentity,
  resolveSettlementOperationalIdentity,
  resolveReceiptOperationalIdentity,
  resolveSessionOperationalIdentity,
  resolveCheckOperationalIdentity,
  resolveTableOperationalIdentity,
  resolveKitchenTicketOperationalIdentity,
  isValidOperationalIdentityFormat,
  isPersistenceIdentityLeak,
  type OperationalIdentitySequenceInput,
  type ResolveSettlementOperationalIdentityInput,
} from "./provider";
