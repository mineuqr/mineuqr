# 13 — PRODUCTION PROOF

**Queried:** `2026-08-15T14:43:59.042Z`  
**Access:** PRODUCTION (`tidbcloud_prod` / `mineuqr` / TLS / 4000 / gateway01)  
**Mutation:** NONE  
**Provider APIs:** NONE  
**Script:** `_readonly-proof.mjs`

## commercial_plans

| id | code | name | hidden | bundle | limits | trial |
|----|------|------|--------|--------|--------|-------|
| `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | basic | Basic | 0 | yes | yes | yes |
| `0ade795a-02fa-4d3e-b9b5-262515bade09` | professional | Professional | 0 | yes | yes | yes |
| `d836bd10-9d9f-4408-a076-f921354d785a` | enterprise | Enterprise | 0 | yes | yes | **no** |

Duplicates: **0**. Missing expected codes: **0**. Hidden: **0**. Visible: **3**.

Schema matches ORM: `id`, `code`, `name`, `description`, `sortOrder`, `isHidden`, timestamps, composition FKs. No price columns on the plan table.

## Prices / currency

10 price rows; 0 orphans. Global USD for all three plans. Regional SAR for professional + enterprise only (basic has no SAR row). Cycles: monthly / yearly.

## Subscriptions / bindings

- `planId` shape: UUID × 6, digit_string × 0  
- Orphan planId: **0**  
- Bindings: 2 (basic 1, enterprise 1); professional subscriptions **unbound**  
- Binding vs subscription planId disagreement: **0**  
- Charged Terms complete on both bindings; USD monthly  

## leftover `subscription_plans`

Exists; 30001–30003 active; **no FKs**.

## Identity consistency

Production `user_subscriptions.planId` values join exactly to the three Live Plan UUIDs (same UUIDs as OD-3 certification). `planCode` consistency holds.

## Observational (not mutated by this SELECT)

Binding coverage 2/6. Professional `updatedAt` `2026-08-15T11:41:05.000Z` (catalog edit after create). Subscription count 6 vs OD-3 cert 7 — organic/unrelated; this program issued no DML.
