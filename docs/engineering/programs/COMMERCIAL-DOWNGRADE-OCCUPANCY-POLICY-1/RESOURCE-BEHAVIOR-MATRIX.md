# RESOURCE BEHAVIOR MATRIX

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

Example numbers are illustrative. Enforcement is always live COUNT vs live cap.

## restaurants

| Field | Value |
|-------|-------|
| LIMIT KEY | `restaurants` |
| OLD CAP / NEW CAP | e.g. 5 → 3 |
| OCCUPANCY | `COUNT(*)` restaurants for `userId` (all non-deleted rows; `isActive` does not release) |
| DOWNGRADE RESULT | Rows remain. No freeze. Occupancy may be 5 > 3. |
| CREATE | Denied while occupancy ≥ new cap. Owner/admin/internal same. |
| UPDATE | Allowed. No `checkLimit`. |
| DELETE | Allowed. COUNT drops. |
| DEACTIVATE | `isActive=false` still occupies (G-10). |
| REACTIVATE | Flag flip. Does not consume a new slot. |
| REPLACE | N/A |
| OPERATIONAL | Existing restaurants remain usable. |
| ERROR | Create → `CommercialLimitExceededError` → FORBIDDEN |

## categories

| Field | Value |
|-------|-------|
| LIMIT KEY | `categories` |
| OCCUPANCY | `COUNT(*)` categories for `restaurantId` |
| DOWNGRADE RESULT | Rows remain, including inactive. |
| CREATE | Denied while occupancy ≥ new cap. Owner and admin same helper. |
| UPDATE | Allowed (name / `isActive`). |
| DELETE | Allowed. COUNT drops. |
| DEACTIVATE | Still occupies. Hiding two categories does **not** reduce occupancy to the new cap. |
| REACTIVATE | Not a new slot. |
| OPERATIONAL | Existing categories remain usable. |
| ERROR | Create → limit exceeded / FORBIDDEN |

## menu items

| Field | Value |
|-------|-------|
| LIMIT KEY | `items` |
| OCCUPANCY | `COUNT(*)` menu items for `restaurantId` |
| DOWNGRADE RESULT | Rows remain, including `isAvailable=false`. |
| CREATE | Denied while occupancy ≥ new cap. |
| UPDATE / DELETE | Allowed. Delete reduces COUNT. |
| DEACTIVATE / REACTIVATE | G-10: unavailable still occupies; reactivate is not a slot. |
| OPERATIONAL | Existing items remain usable. |
| ERROR | Create → limit exceeded / FORBIDDEN |

## POS terminals

| Field | Value |
|-------|-------|
| LIMIT KEY | `posTerminals` |
| OCCUPANCY | provisioned (`registered` + `active`) only |
| DOWNGRADE RESULT | Active/registered terminals remain operational. No POS freeze. |
| CREATE / PROVISION | Denied while provisioned occupancy ≥ new cap. |
| UPDATE | Domain fields; no extra Commercial consume. |
| DELETE | Domain/cascade. COUNT follows remaining provisioned rows. |
| DEACTIVATE | Releases occupancy (G-10). |
| REACTIVATE | Consumes a slot. Denied while occupancy ≥ new cap. |
| REPLACE | `occupancyDelta = 0`. Allowed at over-cap if entitled. Occupancy unchanged. |
| OPERATIONAL | Existing provisioned terminals remain usable. |
| ERROR | New provision / reactivate → limit exceeded / FORBIDDEN |

## staffAccounts / branches / devices / screens

Catalog limit keys exist (`staffAccounts`, `branches`, `devices`). `screens` is not a Commercial limit key.

**No live occupancy primitive.** G-11 does not invent COUNT paths, freeze, or a downgrade engine for them.

## Independence

Each limit key is enforced independently. Restaurant leftover capacity cannot pay for categories. No global Commercial occupancy counter.
