# DATABASE CONSTRAINT AUDIT

MineuQR restaurant children are **not** SQL `REFERENCES` / `ON DELETE CASCADE`. No `foreignKey()` in `drizzle/schema.ts`. DELETE-ARCH-1B is **application** cascade in one transaction.

`0091` / `0092` / `0093` create POS tables with indexes only.

## Smallest correct solution

**Application-level delete inside `deleteRestaurantCascadeTx`.** Same pattern as orders, menu, categories.

A new FK + `ON DELETE CASCADE` would be migration **0095**. That is **not** required and was **not** created (production migration sequence stays governed).
