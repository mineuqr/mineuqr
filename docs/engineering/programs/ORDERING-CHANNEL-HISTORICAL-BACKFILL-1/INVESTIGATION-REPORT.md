# ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 — Investigation Report (Phase 1)

| Field | Value |
|-------|--------|
| **Program** | ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 |
| **Phase** | **1 — Investigation (read-only)** |
| **Date** | 2026-07-28 |
| **Database** | `mineuqr` (production audit connection) |
| **Phase 2** | **Not executed** |

## Headline metrics

| Metric | Value |
|--------|-------|
| Total orders | **21** |
| Missing `ordering_channel` | **21 (100%)** |
| Already stamped | **0** |
| Order Read missing channel | **21 / 21** |
| Age of corpus | **0–7 days** (2026-07-24 → 2026-07-27) |
| Restaurants | **1** (`720007`) |

All orders predate production column apply / channel stamp enforcement (0083 + governance). No post-stamp orders yet in this corpus.

## Distribution by Business Identity scope

| identityScope | Count | Missing channel |
|---------------|-------|-----------------|
| TABLE | 11 | 11 |
| KIOSK | 9 | 9 |
| WAITER | 1 | 1 |

## Distribution by fulfilment (missing only)

| Anchor | Mode | Scope | N |
|--------|------|-------|---|
| table | table_service | TABLE | 11 |
| station | counter | KIOSK | 9 |
| table | table_service | WAITER | 1 |

## Session linkage (missing)

| Session | Scope | N |
|---------|-------|---|
| has_session | TABLE | 11 |
| no_session | KIOSK | 9 |
| has_session | WAITER | 1 |

## Confidence summary (classifier)

| Confidence | N | Eligible |
|------------|---|----------|
| CERTAIN | **0** | **0** |
| LIKELY | **10** (9 KIOSK-signature + 1 WAITER-signature) | **0** |
| UNKNOWN | **11** (TABLE / QR vs table_session) | **0** |

## Verdict (Phase 1)

**C. Investigation complete — execution not recommended**

Reason: **zero CERTAIN-eligible records**. Updating LIKELY/UNKNOWN would violate absolute-certainty rules and ORDERING-CHANNEL-GOVERNANCE-1 (no identityScope channel inference).
