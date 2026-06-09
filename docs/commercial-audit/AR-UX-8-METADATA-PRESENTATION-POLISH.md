# AR-UX-8 — Metadata Presentation Polish

**Program:** Commercial Overview V1  
**Date:** 2026-06-07  
**Status:** Complete  
**Scope:** Presentation only — no CRS, metrics, or data contract changes

---

## 1. Executive Summary

Commercial Overview metadata was technically correct but operator-hostile: developer labels, raw internal codes (`S1_CANONICAL`), and incomplete field coverage. AR-UX-8 polishes labels, timestamps, visual hierarchy, and fallback handling while preserving snapshot semantics.

---

## 2. AR-UX-8A — Metadata Readability Audit

### Pre-change display

| Field (contract) | Shown in UI? | Label (before) | Value shown (before) | Issue |
|------------------|--------------|----------------|----------------------|-------|
| `authorityVersion` | Yes | "Authority" | `S1_CANONICAL` | Developer code exposed |
| `commercialAuthoritySource` | No | — | — | Duplicate of authorityVersion; omitted |
| `asOf` | Yes | "As Of" | Formatted UTC timestamp | Acceptable label; buried with same weight as authority |
| `generatedAt` | Yes | "Generated At" | Formatted UTC timestamp | Developer wording |
| `schemaVersion` | No | — | — | Hidden from operators |
| `metricsSource` | No | — | — | Hidden from operators |
| `assembledBy` | No | — | — | Internal only (correct to hide) |

### Findings

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| Raw codes (`S1_CANONICAL`, `CANONICAL_OWNER`) shown | High | Map known codes to operator labels |
| "Snapshot Metadata" section title | Medium | Rename to "About This Report" |
| Missing schema/metrics fields | Medium | Show as secondary tier |
| `commercialAuthoritySource` duplicate | Low | Prefer `commercialAuthoritySource`, fallback `authorityVersion` |
| Invalid date returned `—` | Medium | Use "Not available" / "Unknown" |
| Loaded snapshot without metadata showed skeleton forever | Medium | Show unavailable message |
| UTC-only timestamps | Low | Use Riyadh timezone via `formatRiyadhDateTime` for admin consistency |
| Equal visual weight on all rows | Medium | Primary vs secondary hierarchy |

---

## 3. AR-UX-8B — Operator-Friendly Labels

| Before (EN) | After (EN) | Value handling |
|-------------|------------|----------------|
| Snapshot Metadata | About This Report | — |
| Authority | Commercial Authority | `S1_CANONICAL` → "Unified commercial authority" |
| Generated At | Report Generated | Timestamp formatted |
| As Of | Data As Of | Timestamp formatted (secondary) |
| *(hidden)* | Report Version | `EXEC-7C.1` → "Commercial overview (v1)" |
| *(hidden)* | Metrics Source | `CANONICAL_OWNER` → "Owner subscription records" |

Arabic equivalents added in `ar.json` under `admin.commercial.*`.

**Semantics preserved:** underlying snapshot values unchanged; presentation layer maps known codes only.

---

## 4. AR-UX-8C — Timestamp Presentation

| Requirement | Implementation |
|-------------|----------------|
| Locale-aware | `ar-SA` / `en-US` via `Intl.DateTimeFormat` |
| Human-readable | `month: short`, `day`, `year`, `hour`, `minute` |
| Consistent with admin | `formatRiyadhDateTime` (Asia/Riyadh) |
| No raw ISO | Formatter strips ISO from display; tests assert no `T`/`Z` leakage |
| Missing/invalid | "Not available" / "Unknown" (never `null`, `undefined`, `Invalid Date`) |

---

## 5. AR-UX-8D — Visual Hierarchy

```
┌─ About This Report ─────────────────────┐
│ PRIMARY (text-sm label, semibold value) │
│   Commercial Authority                    │
│   Report Generated                        │
│ ───────────────────────────────────────── │
│ SECONDARY (text-xs, muted)                │
│   Data As Of                              │
│   Report Version                          │
│   Metrics Source                          │
└───────────────────────────────────────────┘
```

No new cards, charts, or layout redesign — same `Card` with tiered `dl` sections.

---

## 6. AR-UX-8E — Empty / Missing Metadata Handling

| Condition | Display |
|-----------|---------|
| `loading` | Skeleton (primary + secondary rows) |
| `metadata` undefined after load | "Report details are not available." |
| Empty string field | "Not available" / "غير متاح" |
| Invalid timestamp | "Unknown" / "غير معروف" |
| Unknown authority/metrics code | Raw value preserved (not hidden) |

---

## 7. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/admin/formatCommercialOverviewDisplay.ts` | Operator label maps, Riyadh timestamps, fallbacks |
| `client/src/lib/admin/formatCommercialOverviewDisplay.test.ts` | AR-UX-8 coverage |
| `client/src/components/admin/commercial/CommercialOverviewMetadataPanel.tsx` | Hierarchy, all metadata fields, unavailable state |
| `client/src/pages/admin/AdminCommercialPage.tsx` | Updated label props |
| `client/src/locales/en.json` | Operator-facing strings |
| `client/src/locales/ar.json` | Operator-facing strings |

**Unchanged:** `CommercialOverviewSnapshot` contract, `CanonicalMetricsService`, CRS, tRPC handlers.

---

## 8. Validation

```bash
npm run check
pnpm exec vitest run client/src/lib/admin/formatCommercialOverviewDisplay.test.ts
```

### Manual — `/admin/commercial`

- [ ] Section titled "About This Report"
- [ ] Commercial Authority shows friendly label (not `S1_CANONICAL`)
- [ ] Report Generated shows readable date/time (no ISO)
- [ ] Secondary rows visible but visually subdued
- [ ] No `null`, `undefined`, or `Invalid Date` in UI

---

## 9. Success Criteria

A non-technical operator can answer:

| Question | Where in UI |
|----------|-------------|
| What generated the report? | Commercial Authority + Metrics Source |
| When was it generated? | Report Generated |
| What data snapshot time? | Data As Of |

…without knowledge of CRS, schema versions, or internal implementation codes.

---

## 10. Related Documents

- [EXEC-7C.3-COMMERCIAL-OVERVIEW-UI-FOUNDATION.md](./EXEC-7C.3-COMMERCIAL-OVERVIEW-UI-FOUNDATION.md) — original metadata panel
- [AUTHORITY-CLEANUP-1-SUBSCRIPTION-AUTHORITY-UNIFICATION.md](./AUTHORITY-CLEANUP-1-SUBSCRIPTION-AUTHORITY-UNIFICATION.md) — authority stabilization (unchanged by AR-UX-8)
