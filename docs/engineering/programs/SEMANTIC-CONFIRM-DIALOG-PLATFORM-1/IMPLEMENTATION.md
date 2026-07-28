# IMPLEMENTATION — SEMANTIC-CONFIRM-DIALOG-PLATFORM-1

**Date:** 2026-07-29  
**Type:** Presentation Platform Adoption  
**Status:** COMPLETE  
**Do not commit / push / deploy**

---

## 1. Platform

`client/src/design-system/semantic-confirm-dialog/`

| Export | Role |
|---|---|
| `SemanticConfirmDialog` | Canonical confirm chrome |
| `SemanticConfirmKind` | `default` · `destructive` · `warning` · `success` · `information` |
| `SemanticConfirmIconName` | Standardized icons (delete/close/archive/warning/success/question/information) |
| `SEMANTIC_CONFIRM_ICON` | Lucide icon map SSOT |

Built on Radix `AlertDialog` (focus trap, ESC, labelledby/describedby).

Features supply: `open`, copy, `onConfirm`, `loading`. Platform renders shell, icon, footer order (Cancel → Confirm), spinner, disabled states.

---

## 2. Migrated inventory

| Surface | Kind |
|---|---|
| `DiningSessionActionBar` | destructive / warning |
| `SessionRowQuickActions` | destructive / warning |
| `Dashboard` (restaurant/category/item/offer/settings delete) | destructive |
| `Pricing` (PayPal + Tap confirm) | information + body slot |
| `CustomerSuccessAccountsSection` | destructive |
| `CustomerSuccessTenantsSection` | destructive |
| `SecurityAccountControlsSection` | destructive |
| `MultiCheckAllocationPanel` | default / destructive |
| `SettlementSuccessDialog` | success + custom body actions |

---

## 3. Explicit non-migration

| Surface | Reason |
|---|---|
| `MarkPaidSettlementDialog` | Workflow form (tender lines) using AlertDialog shell — not a simple confirmation |

---

## 4. Constraints honored

No API / DB / domain / event / permission / routing changes. Confirm handlers remain in feature modules.
