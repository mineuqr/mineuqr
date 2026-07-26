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
  resolveRefundOperationalIdentity,
  resolveReceiptOperationalIdentity,
  resolveSessionOperationalIdentity,
  resolveCheckOperationalIdentity,
  resolveTableOperationalIdentity,
  resolveKitchenTicketOperationalIdentity,
  isValidOperationalIdentityFormat,
  isPersistenceIdentityLeak,
  parseSettlementOperationalIdentity,
  parseRefundOperationalIdentity,
  parseLedgerDocumentSearch,
  type OperationalIdentitySequenceInput,
  type ResolveSettlementOperationalIdentityInput,
  type ResolveRefundOperationalIdentityInput,
  type ParsedSettlementOperationalIdentity,
  type ParsedRefundOperationalIdentity,
  type ParsedLedgerDocumentSearch,
} from "./provider";
