# IDEMPOTENCY RACES

## Where it exists

POS `register` with an explicit code: `resolveExisting` under the occupancy lock returns the non-replaced terminal. Duplicate code insert maps to the winner.

## TiDB

Same logical key, two concurrent creates:

| Fulfilled | Idempotency rows | Provisioned COUNT |
|-----------|------------------|-------------------|
| 2 (second is replay) | 1 | 1 |

Conflicting fingerprint: throw `idempotency_fingerprint_conflict`, COUNT=0.

## Where it does not exist

Restaurant / category / item create have **no** idempotency keys. G-08 did not invent them.

## Verdict

**A. PASS** where idempotency exists. **D. G-12** for catalog keys.
