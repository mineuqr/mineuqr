# TEST CONTRACT

Implementation is incomplete until these tests exist. UI tests do not replace server negative tests.

## Per capability (all four keys)

| Case | Must prove |
|------|------------|
| ON | Gated mutation succeeds (auth + restaurant + lifecycle OK) |
| OFF | Same mutation denied `COMMERCIAL_ENTITLEMENT_DENIED` / FORBIDDEN; no persist |
| Direct API | tRPC caller with OFF cannot succeed |
| Alternate path | Twin write procedures in the matrix also deny |
| UI | Card / nav hidden or disabled; `hasFeature` false |
| Existing data | Rows still present after OFF |
| Plan A → B (ON → OFF) | Next resolve denies |
| Plan B → A (OFF → ON) | Access returns; data still there |
| FROZEN / expired | Existing expiry policy wins even if capability ON |
| PLATFORM_OWNER / FULL_PLATFORM | Allowed when capability would be OFF on a customer plan |
| Ordinary customer | Cannot obtain FULL_PLATFORM by plan-key manipulation |

## Capability-specific negatives

**sessionTableManagement OFF**

- Deny: `session.markPaid`, `markComplimentary`, `close`, `getOwnerTimeline`, `getOwnerWorkspace`
- Allow: `session.getActiveByTable`, `session.getByToken`
- Do not deny `table.*` (that is `smartQr`)
- Do not deny order/check/register

**menuManagement OFF**

- Deny: `category` / `menuItem` / `offer` mutations and editor lists
- Allow: `category.listPublic`, `menuItem.listByRestaurant`, `offer.listActive`
- Quota still independent: ON + over quota = quota deny

**menuDesign OFF**

- Deny: `restaurant.updateTemplate`, `updateCustomColors`, `updateCustomFonts`, `uploadImage`, `deleteImage`
- Admin role must **not** grant these
- Public menu still returns stored template/colors/fonts
- Stored design columns unchanged

**smartQr OFF**

- Deny: `table.create`, `createMultiple`, `update`, `delete`, `list`, `getById`
- Allow: `table.getByNumber` and public QR/menu resolution
- Table rows remain
- FROZEN public-menu suspend is a separate test (must not be implemented as `smartQr` OFF)

## Catalog / Plan Editor

- Admin can enable/disable each of the four independently
- `alwaysEnabled` no longer locks them
- `assertCommercialCapabilityFilterKeys` accepts the four keys
- Saving omitted key = OFF; saving included key = ON; repeat save idempotent
- Audit `commercial_catalog_updated` includes before/after feature sets

## Cutover

- After seed, existing Live Plan bundles include all four keys
- Missing key after cutover = fail-closed deny
- Seed does not write Charged Terms / prices / MRR

## Forbidden test patterns

- `if (plan === "basic")` in production code under test
- Client-supplied enabled flag as authority
- UI-only “gate” without server deny
