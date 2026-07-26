# REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-DOCUMENT-NUMBERING-ADOPTION-1 |
| **Phase** | Production Financial Document Identity |
| **Mode** | Constitutional Adoption |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-027 · ADR-ARCH-032 · OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Refund documents now own an independent operational identity with prefix **RF**, allocated from a restaurant-scoped sequence and distinct from Settlement **ST** numbers.

- Registry: `refund` → `RF-######`
- Publish-time allocation binds `settlementRecordId` → immutable sequence
- Ledger / Detail / Receipt display **Document Number** + **Document Type**
- Refund references **Origin Settlement** (`ST-…`) without sharing identity
- Search accepts RF / ST / Check number
- Settlement Record money fields, Refund Domain, Reporting, and Register unchanged

---

## 2. Files Changed

### Identity standard

- `shared/operational-document-identity/registry.ts` — register `refund` / `RF`
- `shared/operational-document-identity/provider.ts` — resolve/parse RF + ledger search
- `docs/architecture/standards/OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md`

### Persistence (identity plane)

- `drizzle/0082_refund_document_numbering.sql` + journal entry
- `drizzle/schema.ts` — `refund_document_sequences`, `refund_document_numbers`
- `server/.../refundDocumentNumberRepository.ts` — allocate / lookup
- `checkRefundIntegration.ts` — allocate after compensating SR insert (idempotent)

### Read / presentation

- `settlementRecordDocumentIdentity.ts`, API mapper/DTOs/read service
- Repository search via `parseLedgerDocumentSearch`
- Ledger / Detail / Receipt UI + copy + view models

### Tests / docs

- Identity + mapper + integration + architecture guards
- This program folder

---

## 3. Tests Executed

```
pnpm exec vitest run shared/operational-document-identity \
  server/operational-session/check/api/__tests__/settlementRecordApiMapper.test.ts \
  server/operational-session/check/api/__tests__/settlementRecordDocumentIdentity.test.ts \
  server/operational-session/check/__tests__/checkRefundIntegration.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/refundDocumentNumbering.architecture.guards.test.ts
```

**Result:** 7 files / 30 tests passed.

---

## 4. Migration note

`0082_refund_document_numbering` is journalized. Production apply follows MineuQR migration governance (separate execution program). Historical refunds are backfilled to RF sequences; until apply, unbound refunds fall back to legacy ST-generation display.

---

## 5. Architectural Deviations

**NONE.**

---

## Final Certification

**PRODUCTION CERTIFIED**
