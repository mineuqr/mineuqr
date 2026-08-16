# OWNERSHIP DECISION

**Decision:** REUSE EXISTING REGISTER/SHIFT DOMAIN (CRMP).

| Concern | Owner after this program |
|---------|--------------------------|
| Register | CRMP `CashRegister` |
| Financial Shift | CRMP `FinancialShift` |
| Drawer / cash movements | CRMP Financial Shift |
| POS Terminal | POS |
| POS cashier permission | POS `pos_permission_grants` |
| Order | Order Domain (`cashier_pos`) |
| Check / money | Check Domain |
| Settlement Record | Settlement Platform |
| Attribution | CRMP association after Check commit |
| Reporting | Existing read-side |

**Rejected:**

| Alternative | Why |
|-------------|-----|
| `pos_registers` / `pos_shifts` / `pos_cashboxes` | Second domain — STOP |
| Reuse `StaffCounterPickupSettlementService` | Wrong auth contract |
| Put `registerId` on `PosAccessContext` | POS would look like Register owner |
| POS open/close Register APIs | Duplicates CRMP; would change cashier vs owner auth |
| New Production migration | Existing tables suffice |
| Hard-require Register for POS Sale/Intake | Invents a rule those commands never had |

**Gap accepted (not implemented):** POS cashiers still cannot open/close Register/Shift unless they already can via CRMP (`assertRestaurantAccess`). Wiring `SHIFT_OPEN` onto CRMP mutations is a future program, not a new POS Register domain.
