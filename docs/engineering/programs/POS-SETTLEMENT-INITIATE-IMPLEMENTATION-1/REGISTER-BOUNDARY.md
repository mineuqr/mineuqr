# REGISTER BOUNDARY

Register and Shift are **not** prerequisites.

This command does not accept or derive:

- `registerId`
- `shiftId`
- cashier shift
- register ownership

POS Terminal attribution remains the existing POS Terminal identity from PosAccessContext.

`StaffCounterPickupSettlementService` is not used because that façade requires Register + Shift.

Settlement Context remains fail-open on the existing Check path. This program does not pass Register/Shift hints.
