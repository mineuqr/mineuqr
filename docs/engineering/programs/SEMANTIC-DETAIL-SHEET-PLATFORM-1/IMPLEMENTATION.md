# IMPLEMENTATION — SEMANTIC-DETAIL-SHEET-PLATFORM-1

**Date:** 2026-07-29  
**Type:** Presentation Platform Adoption  
**Status:** Implemented — awaiting Architecture Authority review  
**Constraints:** Presentation only · No commit / push / deploy

---

## 1. Platform package

`client/src/design-system/semantic-detail-sheet/`

| Primitive | Role |
|---|---|
| `SemanticDetailSheet` | Canonical Sheet shell (width, scroll, header, body, footer) |
| `SemanticDetailHeader` | Title / subtitle / icon / status |
| `SemanticDetailSection` | Section grouping |
| `SemanticDetailGroup` | Fact grid (1–2 columns) |
| `SemanticDetailFact` | Label / value / optional badge / icon |
| `SemanticDetailFooter` | Sticky action / meta footer |
| `SemanticDetailLoading` | Loading slot |
| `SemanticDetailEmpty` | Empty slot |
| `SemanticDetailError` | Error + optional retry |
| `SemanticDetailDivider` | Separator |

**Widths:** `sm` · `md` · `lg` · `xl` → `SEMANTIC_DETAIL_SHEET_SIZE_CLASS`

Barrel exported from `design-system/index.ts`.

---

## 2. Migrated Sheets

| Surface | Notes |
|---|---|
| `SettlementDetailSheet` | Field → `SemanticDetailFact`; loading/error/footer via platform |
| `AuditEventDetailSheet` | Renamed from Drawer (alias kept); facts standardized |
| `OperationalDetailsSheet` | Renamed from Drawer (alias kept); chrome + footer actions |
| `ScreenDetailsSheet` | Chrome only; tabs feature-owned |
| `ScreenCredentialLifecycleSheet` | Chrome only |
| `DiningSessionWorkspaceSheet` | Chrome only; responsive bottom/right side |
| `OperationalActivityFeedSection` expand sheet | Activity log chrome |

---

## 3. Intentionally not migrated

| Surface | Reason |
|---|---|
| `ScreenSettingsSheet` | Settings editor — feature-owned |
| `ui/sidebar` Sheet | Nav chrome, not detail |
| `CartDrawer` | Cart / checkout interaction (not a detail Sheet) |
| Mark Paid / payment / allocation flows | Workflow ownership |

---

## 4. Accessibility

Radix Sheet provides focus trap, ESC dismiss, and labelled content via `SheetTitle` / `SheetDescription` rendered by `SemanticDetailHeader`. Scroll is centralized on the platform body slot (`overflow-y-auto` + `overscroll-contain`). Close control remains the shared Sheet X button.

---

## 5. Architecture guards

`client/src/design-system/semantic-detail-sheet/__tests__/semanticDetailSheetPlatform.architecture.guards.test.ts`

---

## 6. Validation command

```bash
npx vitest run client/src/design-system/semantic-detail-sheet/__tests__/semanticDetailSheetPlatform.architecture.guards.test.ts
```

**Result:** 7/7 PASS (run from repo root).