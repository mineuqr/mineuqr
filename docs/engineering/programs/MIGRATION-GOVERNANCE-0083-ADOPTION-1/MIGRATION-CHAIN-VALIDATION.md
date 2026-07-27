# MIGRATION-GOVERNANCE-0083-ADOPTION-1 — Migration Chain Validation

| Position | Tag |
|----------|-----|
| … | … |
| 81 | `0081_crmp_financial_shift_number` |
| 82 | `0082_refund_document_numbering` |
| **83** | **`0083_order_ordering_channel`** |

## Continuity

- No skipped numbers in journal tags 0000→0083 for canonical lineage
- No duplicate 0083
- No 0084 created
- Prior hashes for 0000–0082 **unchanged** (SQL files not rewritten)

## 0083 SQL hash

| State | SHA-256 |
|-------|---------|
| Pre-corruption-fix (orphan era) | `516ff6198aed958fa0c10b37c781bec779c312126979e860e18df514698e6e5d` |
| Post-adoption (AFTER identityScope) | `6e3187d2953c61ef44774092c91f25f7760ebf3760451339e832a831b830749d` |

Hash change is **expected and audited** — only the `AFTER` identifier was corrected; DDL intent (nullable `ordering_channel` varchar(32) on both tables) unchanged.
