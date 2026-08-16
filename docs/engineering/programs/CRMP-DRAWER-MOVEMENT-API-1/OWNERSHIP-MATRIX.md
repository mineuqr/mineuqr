# OWNERSHIP MATRIX

| Concern | Owner |
|---|---|
| Authenticated user identity | Existing Auth (`users.id`) |
| Restaurant access | Existing `assertRestaurantAccess` |
| Register | CRMP |
| Financial Shift | CRMP |
| Drawer / cash movements | CRMP (Drawer on Financial Shift) |
| Opening float | CRMP (shift open) |
| Expected cash formula | CRMP `computeExpectedCash` |
| Check | Check Domain |
| Settlement | Financial Settlement / Check |
| Settlement cash attribution | CRMP custody association (not this API) |
| Revenue | Paid Check `grandTotal` / Reporting Platform |
| POS access / permissions | POS (unchanged; not consumed here) |
| POS Terminal | POS |
| REGISTER_ADJUST catalog key | POS permission catalog — not enforced here |
| Reporting | Existing Reporting / Shift views (expected cash already includes movements) |
| Tax / ZATCA | Unchanged / future |

Decision **B**: implement the missing CRMP public API. Do not create a POS cash owner.
