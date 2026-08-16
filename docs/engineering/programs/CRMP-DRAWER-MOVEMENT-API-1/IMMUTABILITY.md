# IMMUTABILITY

Historical `crmp_drawer_movements` rows are not exposed for UPDATE or DELETE.

The public API is append-only `recordDrawerMovement`.

Closed/archived shifts throw `CrmpImmutabilityError`.

Corrections use a new `manual_adjustment` or compensating `paid_in` / `paid_out` with a new idempotency key.

`opening_float` is not publicly recordable; it remains a shift-open fact.
