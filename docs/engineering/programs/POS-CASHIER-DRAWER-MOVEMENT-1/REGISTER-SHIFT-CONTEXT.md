# REGISTER / SHIFT CONTEXT

Reuse of POS-REGISTER-SHIFT-IMPLEMENTATION-1 and POS-CASHIER-CRMP-OPERATIONS-1.

1. Client may supply `registerId` as a routing selector (same as `pos.cashier.register.open`).
2. POS loads the Register in **server** restaurant scope and rejects terminal/register device mismatch.
3. CRMP independently loads the Register and resolves the **active** Financial Shift.
4. Optional `financialShiftId` is a hint only. Mismatch is a CRMP conflict (`shift_mismatch`). Closed/missing Shift is CRMP not-found (`shift_required`).

POS does not:

- create `pos_registers` / `pos_shifts`
- invent a second resolver
- pre-validate CRMP duty/shift state beyond terminal binding
- pass client Register/Shift identity as authority
