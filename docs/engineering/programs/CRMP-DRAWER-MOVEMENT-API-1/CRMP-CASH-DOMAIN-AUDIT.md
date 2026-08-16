# CRMP CASH DOMAIN AUDIT

| Capability | Owner | Persistence | Public API | Idempotency | Status |
|------------|-------|-------------|------------|-------------|--------|
| Register duty open/close | CRMP Register | `crmp_registers` | `crmp.register.*` | Terminal-state replay | Production |
| Financial Shift open | CRMP Shift | `crmp_financial_shifts` | `crmp.financialShift.open` | By `financialShiftId` | Production |
| Financial Shift close + final count | CRMP Shift | counts + shift | `crmp.financialShift.close` | Close replay; final count once | Production |
| Opening float | CRMP Shift | shift + first movement | Via shift open | Tied to shift id | Production |
| `paid_in` / `paid_out` / `safe_drop` / `manual_adjustment` | CRMP Drawer on Shift | `crmp_drawer_movements` | This program: `crmp.financialShift.recordDrawerMovement` | Derived `movementId` | Public API |
| Interim count | CRMP Drawer | `crmp_drawer_counts` | None | None | Domain only — **out of scope** |
| Handover | CRMP Shift | `crmp_shift_handovers` | None | Partial | Domain only — **out of scope** |
| Expected cash | Derived | None | Shift view / close / archive | N/A | Production read |
| Settlement cash attribution | CRMP custody | `crmp_settlement_attributions` | Internal post-commit | By `settlementRecordId` | Production internal |
| Deposit / withdrawal / expense types | — | — | — | — | Not separate types. Map to `paid_in` / `paid_out` |
| Register-level cash balance | — | — | — | — | **Does not exist.** Cash is Shift-owned. |

## REGISTER_ADJUST

POS permission catalog key only (`shared/pos/permissions.ts`). No CRMP or POS mutation. Not wired in this program. Future POS consumption program may map it onto this CRMP API.
