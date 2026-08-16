# REGISTER / SHIFT DATABASE MAP

| Table | Drizzle | Owns |
|-------|---------|------|
| `crmp_registers` | `crmpRegisters` | Register identity, catalog, duty, optional device, assigned operator |
| `crmp_financial_shifts` | `crmpFinancialShifts` | Financial Shift identity, operator, drawerId, lifecycle |
| `crmp_register_shift_sequences` | `crmpRegisterShiftSequences` | Human shift numbers |
| `crmp_drawer_movements` | `crmpDrawerMovements` | Cash movements |
| `crmp_drawer_counts` | `crmpDrawerCounts` | Counts |
| `crmp_shift_handovers` | `crmpShiftHandovers` | Handover |
| `crmp_settlement_attributions` | `crmpSettlementAttributions` | Post-commit SR → register/shift association |

Migrations: `0077_crmp.sql` … `0081_crmp_financial_shift_number.sql`.

POS tables (`pos_terminals`, `pos_permission_grants`, `pos_sale_idempotency`) are **not** Register/Shift.

Production journal terminus remains **`0093_pos_sale_idempotency`**. No `0094`.
