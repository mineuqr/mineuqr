# UUID-VS-CODE-DECISION

## Candidates

| | A. `commercial_plans.id` | B. `commercial_plans.code` |
|--|--------------------------|----------------------------|
| Form | UUID (`randomUUID()`) | `basic` / `professional` / `enterprise` |
| Uniqueness | Primary key | Unique index |
| Mutability | Immutable in `saveLive` | Currently preserved in `saveLive` |
| Generation | System-generated | Administrator / bootstrap supplied |
| Human readable | No | Yes |
| Independent of name/price/capabilities/limits | Yes | Yes (label, not those attributes) |
| Already referenced internally | Bindings, prices, offering.planId | Bootstrap, bridge, `planCode` APIs |
| Across catalog wipe | New UUID (new row) | Same code re-seeded |

## Evaluation

### Uniqueness

Both are unique **within one catalog deployment**. Code uniqueness is one-row-per-code. UUID uniqueness is the row PK.

### Mutability

`saveLive` cannot change `id` or `code`. Code is still a **business label**. A future admin “rename code” feature would be conceivable; renaming a UUID PK is not. Canonical internal identity must be the system-generated PK.

### API suitability

Public catalog already exposes both: `planId` (UUID) and `planCode`. Checkout still accepts the integer. UUID is already the public catalog identity field name.

### Internal reference suitability

Bindings and prices already store UUID. Subscription still stores integer. The existing commercial graph already treats UUID as the row pointer.

### Human readability

Code wins. That is why it remains the business/catalog key, not why it should become the PK substitute.

### Security

Identity is not authorization. Tenant/RBAC/entitlement enforcement remains authoritative. Code is guessable (`professional`); UUID is not a capability grant. Exposing UUID is already public-catalog practice.

### Migration stability

Bootstrap is idempotent **by code**. A clean catalog reset creates new UUIDs for the same codes. That is a **new catalog instance**, not two concurrent identities for one plan (code unique index forbids concurrent duplicates).

Subscriptions today store integers, not old UUIDs. A future cutover maps:

```
legacy integer → LEGACY_PLAN_BRIDGE.code → current commercial_plans.id
```

That writes the **current** UUID. Wipe-stability of historical UUIDs is therefore not a prerequisite for choosing UUID as the identity type. It is an ops rule: do not wipe catalog rows that remaining UUID FKs still need.

### Database indexing

UUID varchar(36) PK is already indexed. Bindings already index `planId`. Suitable.

### Tenant boundaries

Catalog is platform-global. No composite tenant+plan identity is required.

### Provider integration

Providers do not own a MineuQR plan product id. They echo checkout metadata (currently integer). They can later echo UUID. Provider transaction IDs stay Class F.

### Historical references

Charged Terms already carry `planId` (UUID) as the catalog template pointer. Historical **amount** is Charged Terms, not the UUID.

## Verdict

**UUID is architecturally suitable.** Code is not a replacement.

```
UUID  = canonical internal Commercial Plan identity
Code  = stable business / catalog key
```

Code is not rejected as a key. It is rejected as the canonical internal ID because:

1. It is a human business label, not a system-generated row identity.
2. Bindings and prices already use UUID.
3. Bootstrap uses code for idempotency — that is lookup, not identity.
4. The program forbids inventing a third id and forbids replacing UUID unless UUID is unsuitable. It is not.
