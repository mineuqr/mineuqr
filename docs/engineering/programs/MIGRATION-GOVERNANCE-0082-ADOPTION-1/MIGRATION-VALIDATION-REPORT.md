# MIGRATION-GOVERNANCE-0082-ADOPTION-1 — Migration Validation Report

| Field | Value |
|---|---|
| **Program** | MIGRATION-GOVERNANCE-0082-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Governance guard

```
pnpm db:governance-check
```

```
Journal entries: 83
Last journal tag: 0082_refund_document_numbering
✓ Journal ↔ SQL lineage consistent (canonical migrations 0000–0082).
✓ No non-legacy orphan SQL files.
✓ Journal ordering valid.
[governance-guard] OK
```

---

## Preflight

```
pnpm db:preflight
```

```
Journal entries: 83
Last journal tag: 0082_refund_document_numbering
✓ No non-legacy orphan SQL files.
⚠ Pending journal migrations (1): 0082_refund_document_numbering
```

Pending apply is **expected**: this program adopts governance only. Production DB apply belongs to a separate production migration execution program.

---

## Unit tests

```
pnpm exec vitest run scripts/__tests__/migrationGovernance.test.ts
```

**Result:** 1 file / **10 tests passed**.

---

## Journal integrity

| Check | Result |
|-------|--------|
| Entry count | 83 |
| Contiguous idx 0…82 | Pass |
| Terminus tag | `0082_refund_document_numbering` |
| Prior tag idx 81 | `0081_crmp_financial_shift_number` |
| Matching SQL on disk | Pass |
| Non-legacy orphans | None |

---

## Final Certification

**PRODUCTION CERTIFIED**
