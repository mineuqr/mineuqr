# PRODUCTION-MIGRATION-EXECUTION-0082 — Schema Validation Report

| Field | Value |
|---|---|
| **Program** | PRODUCTION-MIGRATION-EXECUTION-0082 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Objects

| Object | Status |
|--------|--------|
| `refund_document_sequences` | Present |
| `refund_document_numbers` | Present |
| PK `refund_document_sequences(restaurantId)` | Present |
| PK `refund_document_numbers(id)` | Present |
| UNIQUE `refund_document_numbers_record_unique(settlementRecordId)` | Present |
| UNIQUE `…_restaurant_sequence_unique(restaurantId, sequenceNumber)` | Present |
| KEY `refund_document_numbers_restaurant_id` | Present |

## Integrity

| Check | Result |
|-------|--------|
| Journal terminus | `0082_refund_document_numbering` |
| Journal entries (repo) | 83 |
| Hash recorded once | Yes |
| Partial execution | No |
| `pnpm db:verify-schema` | OK |

---

## Final Certification

**PRODUCTION CERTIFIED**
