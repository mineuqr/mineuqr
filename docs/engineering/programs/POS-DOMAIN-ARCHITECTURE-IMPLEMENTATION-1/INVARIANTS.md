# INVARIANTS

1. POS Terminal ≠ Operational Device ≠ Cashier ≠ Register ≠ Shift.
2. POS quantity is Live Plan limit `posTerminals` via `checkLimit`.
3. POS quantity ≠ `devices` capability/limit.
4. Missing `posTerminals` fail-closes to 0 for non-admin.
5. Provisioned terminals (`registered` + `active`) cannot exceed effective quantity.
6. Every POS operation is restaurant-scoped.
7. Historical terminal identity survives replacement.
8. Owner / authenticated user is not automatically a cashier.
9. `order.settlePaid` is not POS authorization.
10. `cashier_pos` is a canonical registry channel.
11. Table/QR channel is not rewritten on cashier settlement.
12. POS does not own Order, Check, Settlement, Register, Reporting, or Charged Terms.
13. POS remains country-neutral and cloud-authoritative.
14. No POS add-on billing in this program.
15. Terminal same-code registration is idempotent.
