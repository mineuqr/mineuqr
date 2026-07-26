# PRODUCTION-MIGRATION-EXECUTION-0082 — Refund Numbering Validation Report

| Field | Value |
|---|---|
| **Program** | PRODUCTION-MIGRATION-EXECUTION-0082 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Allocation / backfill

| Fact | Value |
|------|--------|
| Historical refund SRs | 1 |
| Bound RF rows | 1 |
| Unbound refunds | 0 |
| Restaurant | `720007` |
| Sequence | `1` |
| Operational identity | **RF-000001** |
| Origin Settlement | **ST-570003** (`checkId` 570003) |
| Sequence cursor `lastNumber` | `1` |
| Next allocate | `2` |

## Independence

| Series | Status |
|--------|--------|
| Settlement ST | Unchanged (13 settlement SRs) |
| Refund RF | Independent (`RF-000001` ≠ `ST-570003`) |
| Order / Session / Check numbering | Not touched by migration |

## Search (DB)

| Token path | Result |
|------------|--------|
| RF sequence → `refund_document_numbers` | Hit |
| Check id → settlement SR | Hit |

---

## Final Certification

**PRODUCTION CERTIFIED**
