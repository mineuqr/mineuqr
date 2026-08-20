export {
  PAYMENT_COLLECTION_FACT_PROGRAM_ID,
  COLLECTION_FACT_SCHEMA_VERSION,
  COLLECTION_FACT_KIND,
  COLLECTION_FACT_PURPOSES,
  type CollectionFactKind,
  type CollectionFactPurpose,
  type CollectionFactTender,
  type CollectionFactCompositionLine,
  type CollectionFact,
  type CollectionFactCommitContext,
  type CommitCollectionFactCommand,
  type CommitCollectionFactResult,
} from "./collectionFactContract";

export {
  CollectionFactError,
  type CollectionFactErrorCode,
} from "./collectionFactErrors";

export {
  isCollectionFactPurpose,
  assertCollectionFactAppendOnly,
  assertCopiedMoneyField,
  sumTenderAmounts,
  assertTendersReconcileToAmount,
  assertCollectionFactCommitContext,
  assertCommitCollectionFactCommand,
  buildCollectionFactId,
  collectionFactKind,
  collectionFactSchemaVersion,
  assertFingerprintsMatch,
  assertSameIntentIdentity,
} from "./collectionFactInvariants";

export { collectionFactFingerprintPayload } from "./collectionFactFingerprint";

export {
  deriveShadowCollectionFactCommand,
  compareCollectionFactToFreeze,
  type CollectionFactFreezeSource,
  type CollectionFactShadowMismatch,
} from "./shadowCollectionFact";
