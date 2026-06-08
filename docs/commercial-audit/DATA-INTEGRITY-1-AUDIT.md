# DATA-INTEGRITY-1 — Phase A — Schema Integrity Inventory

**Program:** Data Integrity (DATA-INTEGRITY-1)  
**Phase:** A — Schema integrity discovery  
**Date:** 2026-06-07  
**Status:** Complete — read-only documentation  

**Mode:** Repository audit only. No code, schema, database, migration, or data changes.

**ORM:** Drizzle (`drizzle/schema.ts`). **Prisma:** not present in this repository.

**Migration history:** `drizzle/meta/_journal.json` — 20 applied migrations (`0000_shiny_blizzard` → `0019_users_email_unique`). Additional duplicate-named SQL files exist in `drizzle/` from prior branches; journal is authoritative for applied chain.

**Relations file:** `drizzle/relations.ts` — **empty** (no Drizzle relation declarations).

**Database FK constraints:** **None** found in `drizzle/*.sql` (`FOREIGN KEY` / `REFERENCES` absent). All parent-child integrity is **application-enforced** plus optional cascade helpers in `server/db/cascadeDeletes.ts`.

**Soft delete:** **No** entity uses `deletedAt`, `isDeleted`, or equivalent tombstone columns.

---

## 1. Executive Summary

MineuQR persists data across **16 MySQL tables** defined in `drizzle/schema.ts`, grouped into identity, commercial, restaurant, menu, ordering, operations (notifications), and reference data. Media and files are **not** modeled as rows — URLs are stored on parent entities; blobs live on local disk (dev) or Cloudflare R2 (production).

### Headline findings

| Finding | Severity (schema-level) |
|---------|-------------------------|
| **No database foreign keys** | High — orphan rows possible if app bypassed |
| **No soft delete** | Medium — deletes are hard; recovery requires backups |
| **Empty Drizzle relations** | Low — ownership documented only in application code |
| **`user_subscriptions.restaurantId` scope tag** | Medium — dual ownership semantics (ASN documented) |
| **No persisted audit/ops tables** | Info — ops events are log-stream only |
| **Slug uniqueness drift risk** | Medium — early migration had `UNIQUE(slug)`; current schema uses non-unique `index` name |
| **Entitlements not persisted** | Info — computed from plan catalog in code |

### Success criteria (preview)

| Question | Answer |
|----------|--------|
| Are all major entities mapped? | **Yes** — 16 tables + non-table auth/session/storage patterns |
| Are ownership chains identifiable? | **Yes** — primarily `users` → `restaurants` → child rows |
| Are any ownership boundaries unclear? | **Yes** — subscriptions (user vs restaurant scope), orders (no user FK), notifications (nullable subscription) |
| Schema-level integrity concerns before data inspection? | **Yes** — no FKs, no soft delete, scope column on subscriptions, duplicate migration artifacts |

---

## 2. Identity Domain Inventory

### 2.1 Entity summary

| Entity | Table / pattern | In schema? |
|--------|-----------------|------------|
| Users | `users` | Yes |
| Accounts (separate) | — | **No** — `users` is the account |
| Sessions | Cookie JWT + `users.sessionValidAfter` | **No session table** |
| Email verification tokens | `auth_tokens` (`type = email_verify`) | Yes |
| Password reset tokens | `auth_tokens` (`type = password_reset`) | Yes |

---

### 2.2 `users`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Primary account identity: auth, role, profile, session revocation boundary |
| **Primary key** | `id` (auto-increment) |
| **Foreign keys (logical)** | None |
| **Ownership model** | Root owner for restaurants, subscriptions, invoices, notifications, auth tokens |
| **Cascade behavior** | `deleteUserCascade` (`cascadeDeletes.ts`): deletes owned restaurants (full restaurant cascade each), then `invoices`, `renewal_notifications`, `user_subscriptions`, `auth_tokens`, then `users`. Protected user IDs cannot delete (`PROTECTED_USER_IDS`) |
| **Soft delete** | **None** — hard delete only |

**Notable columns:** `openId` (external/local identity key), `email` (unique index `users_email_unique`), `passwordHash`, `emailVerifiedAt`, `sessionValidAfter`, `role` (`user` \| `admin`).

**Indexes:** `users_openId_unique` (index), `users_email_unique` (unique).

---

### 2.3 `auth_tokens`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | One-time tokens for password reset and email verification (hashed) |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `userId` → `users.id` (not enforced in DB) |
| **Ownership model** | Owned by user |
| **Cascade behavior** | Deleted in `deleteUserCascade`; **not** deleted on standalone restaurant delete |
| **Soft delete** | **None** — `usedAt` marks consumption, row remains until delete |

**Migration:** `0017_auth_tokens.sql` (2026 auth hardening).

---

### 2.4 Sessions (non-table)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Authenticated request context |
| **Storage** | HTTP-only cookie; verified in `server/_core/sdk.ts` (`createSessionToken`, `verifySessionDetailed`) |
| **Revocation** | `users.sessionValidAfter` — sessions issued before timestamp rejected (`0018_session_valid_after.sql`) |
| **Foreign keys** | N/A |
| **Ownership model** | Session maps to `users` via `openId` lookup |
| **Cascade behavior** | N/A — no rows to cascade |
| **Soft delete** | N/A |

---

## 3. Commercial Domain Inventory

### 3.1 Entity summary

| Entity | Table | Persisted entitlements? |
|--------|-------|-------------------------|
| Subscription plans (catalog) | `subscription_plans` | Plan limits in columns + `features` text |
| User subscriptions | `user_subscriptions` | Status/periods only |
| Invoices | `invoices` | — |
| Entitlements (runtime) | — | **No table** — `resolveCommercialEntitlements()` / `planFeatureMatrix.ts` |

---

### 3.2 `subscription_plans`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Global plan catalog: pricing, limits, Stripe price ids, feature text |
| **Primary key** | `id` |
| **Foreign keys (logical)** | None — reference data |
| **Ownership model** | **System/global** — not user or restaurant owned |
| **Cascade behavior** | **No application cascade** — deleting a plan would orphan `user_subscriptions.planId` |
| **Soft delete** | **None** — `isActive` flag only |

---

### 3.3 `user_subscriptions`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Per-user subscription state: plan, status, billing cycle, Stripe ids, periods |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `userId` → `users.id`; `planId` → `subscription_plans.id`; `restaurantId` → scope tag (`0` = account, `>0` = restaurant tag — **not a DB FK**) |
| **Ownership model** | **User-owned row** with optional restaurant scope column (ASN canonical: account `restaurantId = 0`) |
| **Cascade behavior** | `deleteSubscriptionCascade`: invoices → renewal_notifications → subscription row. `deleteUserCascade`: all user subscriptions. `deleteRestaurantCascade`: only subscriptions where `restaurantId = deletedRestaurantId` (account-scoped `restaurantId = 0` **survives** restaurant delete) |
| **Soft delete** | **None** — `status` (`trial`, `active`, `canceled`, `expired`) |

**Schema note:** `restaurantId` added in `0004_wooden_anthem.sql`; immutable after insert in application code.

---

### 3.4 `invoices`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Billing documents linked to user and subscription |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `userId` → `users.id`; `subscriptionId` → `user_subscriptions.id` |
| **Ownership model** | User + subscription (dual reference; no consistency trigger) |
| **Cascade behavior** | Deleted with subscription cascade or user cascade |
| **Soft delete** | **None** — `status` enum (`pending`, `paid`, `failed`, `refunded`) |

---

### 3.5 Entitlements (non-table)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Feature flags and limits (`features.ordering`, `limits.restaurants`, etc.) |
| **Source** | `buildCommercialContextFromDb` → `pickUserLevelSubscription` → `resolveCommercialEntitlements` |
| **Persistence** | **None** — derived at runtime from subscription row + plan catalog |
| **ASN note** | Post-ASN-5, guest ordering reads entitlements; subscription row remains source input |

---

## 4. Restaurant Domain Inventory

### 4.1 Entity summary

| Entity | Table |
|--------|-------|
| Restaurants | `restaurants` |
| Holidays / closures | `restaurant_holidays` |
| Dining tables / QR | `restaurant_tables` |
| Country/currency reference | `countries_currencies` |
| Separate settings table | **None** — settings columns on `restaurants` |
| Location entities | **None** — `address`, `locationUrl` on `restaurants` |

---

### 4.2 `restaurants`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Tenant venue: menu host, branding, hours, slug-based public URL |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `userId` → `users.id` (owner) |
| **Ownership model** | **Owned by user** (`restaurants.userId`). Commercial rights inherited from owner account (ASN) |
| **Cascade behavior** | `deleteRestaurantCascade`: order_items → orders → tables → holidays → offers → menu_items → categories → scoped subscriptions (+ invoices/notifications for those subs) → restaurant |
| **Soft delete** | **None** — `isActive` flag |

**Notable columns:** `slug`, `menuTemplate`, `customColors`, `customFonts`, `workingHours`, `temporaryClosure`, `logoUrl`, `coverUrl`.

**Integrity note:** `restaurants_slug_unique` in current schema is a **named index**, not `uniqueIndex` — verify DB constraint matches intended uniqueness (data-integrity check R3).

---

### 4.3 `restaurant_holidays`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Scheduled closure / modified hours per date |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `restaurantId` → `restaurants.id` |
| **Ownership model** | Restaurant child |
| **Cascade behavior** | Deleted in `deleteRestaurantCascade` |
| **Soft delete** | **None** |

---

### 4.4 `restaurant_tables`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Physical tables/rooms for QR ordering |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `restaurantId` → `restaurants.id` |
| **Ownership model** | Restaurant child |
| **Cascade behavior** | Deleted in `deleteRestaurantCascade`; orders referencing table may become invalid if deleted outside cascade (check O2) |
| **Soft delete** | **None** — `isActive` flag |

---

### 4.5 `countries_currencies`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Reference catalog for country/currency picker |
| **Primary key** | `id` |
| **Foreign keys (logical)** | None |
| **Ownership model** | **System/global** |
| **Cascade behavior** | None |
| **Soft delete** | **None** — `isActive` flag |

---

## 5. Menu Domain Inventory

### 5.1 Entity summary

| Entity | Table |
|--------|-------|
| Menus (aggregate) | **No table** — restaurant + categories + items |
| Categories | `categories` |
| Menu items | `menu_items` |
| Promotional offers | `offers` |
| Item images | **URL columns** on `menu_items`, `offers`, `restaurants` — no media table |

---

### 5.2 `categories`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Menu section grouping per restaurant |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `restaurantId` → `restaurants.id` |
| **Ownership model** | Restaurant → category |
| **Cascade behavior** | Deleted in `deleteRestaurantCascade` (after menu_items) |
| **Soft delete** | **None** — `isActive` flag |

---

### 5.3 `menu_items`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Priced menu entries |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `restaurantId` → `restaurants.id`; `categoryId` → `categories.id` (dual parent — must align; check M3) |
| **Ownership model** | Restaurant → category → item (implicit); `restaurantId` duplicated on item for query convenience |
| **Cascade behavior** | Deleted in `deleteRestaurantCascade` |
| **Soft delete** | **None** — `isAvailable` flag |

**Media:** `imageUrl` text — external URL or `/uploads/...` / R2 public URL.

---

### 5.4 `offers`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Time-bound promotional pricing |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `restaurantId` → `restaurants.id` |
| **Ownership model** | Restaurant child |
| **Cascade behavior** | Deleted in `deleteRestaurantCascade` |
| **Soft delete** | **None** — `isActive` + date range |

---

## 6. Ordering Domain Inventory

### 6.1 Entity summary

| Entity | Table |
|--------|-------|
| Orders | `orders` |
| Order line items | `order_items` |
| Order lifecycle history | **No separate table** — `orders.status` enum only |

---

### 6.2 `orders`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Guest table orders (public flow, no auth required) |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `restaurantId` → `restaurants.id`; `tableId` → `restaurant_tables.id` (must match restaurant; check O2) |
| **Ownership model** | **Restaurant child** — no `userId`; guest identity in `customerName` / `customerPhone` only |
| **Cascade behavior** | Deleted in `deleteRestaurantCascade` (order_items first) |
| **Soft delete** | **None** — `status` includes `cancelled` |

**Lifecycle:** `pending` → `preparing` → `ready` → `served` \| `cancelled`.

---

### 6.3 `order_items`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Snapshot line items (name/price copied at order time) |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `orderId` → `orders.id`; `menuItemId` → `menu_items.id` (reference; item may be deleted later) |
| **Ownership model** | Order child |
| **Cascade behavior** | Deleted before order in restaurant cascade |
| **Soft delete** | **None** |

**Integrity note:** Denormalized `nameAr`, `price` on line — intentional snapshot; menu item deletion does not cascade to historical orders (orphan reference possible on `menuItemId`).

---

## 7. Operations Domain Inventory

### 7.1 Entity summary

| Entity | Persisted? |
|--------|------------|
| User notifications | `renewal_notifications` |
| Audit logs | **No table** — `opsLog`, `sessionAudit`, `AuthAudit` console/log pipeline |
| Ops/monitoring events | **No table** — structured stderr via `server/_core/opsLog.ts` |
| Webhook dedup | **In-memory / code** (`webhookDedup.ts`) — not schema inventory |

---

### 7.2 `renewal_notifications`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | In-app notifications: billing, subscription lifecycle, role changes, **new orders** |
| **Primary key** | `id` |
| **Foreign keys (logical)** | `userId` → `users.id`; `subscriptionId` → `user_subscriptions.id` (**nullable**) |
| **Ownership model** | User-owned; optionally linked to subscription |
| **Cascade behavior** | By `subscriptionId` on subscription delete; by `userId` on user delete. **Not** deleted on restaurant-only delete unless tied to scoped subscription |
| **Soft delete** | **None** — `isRead`, `isSent` flags |

**Cross-domain:** `notificationType` includes `new_order` — bridges ordering → operations.

---

### 7.3 Audit / ops (non-table)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Security, tenant boundary, admin, payment, webhook telemetry |
| **Storage** | Log events (`OpsEvent` in `opsLog.ts`) — categories: AUTH, TENANT, ADMIN, RUNTIME, SYSTEM, PAYMENT, WEBHOOK, ORDER, EMAIL |
| **Persistence** | **Not in MySQL schema** |
| **Cascade** | N/A |
| **Soft delete** | N/A |

---

## 8. Storage Domain Inventory

### 8.1 Entity summary

| Entity | In schema? |
|--------|------------|
| Uploads / files table | **No** |
| Image references | URL/text columns on entities |
| R2 object metadata | **No** — key + public URL returned at upload time |

---

### 8.2 URL-based media references

| Location | Columns | Purpose |
|----------|---------|---------|
| `restaurants` | `logoUrl`, `coverUrl` | Branding |
| `menu_items` | `imageUrl` | Item photo |
| `offers` | `imageUrl` | Offer image |
| `restaurant_tables` | `qrCodeUrl` | Table QR asset |
| `invoices` | `pdfUrl` | Generated PDF location |

| Attribute | Detail |
|-----------|--------|
| **Primary key** | N/A — not row-based |
| **Foreign keys** | N/A |
| **Ownership model** | Implicit via parent entity's `restaurantId` / `userId` chain |
| **Cascade behavior** | **No blob cleanup** in `cascadeDeletes` — deleting DB rows does not delete R2/local files |
| **Soft delete** | N/A |

---

### 8.3 Storage backends (application)

| Environment | Backend | Entry |
|-------------|---------|-------|
| Development | Local disk `uploads/` | `server/local-uploads.ts` → `putFileLocal` |
| Production | Cloudflare R2 (S3 API) | `server/storage.ts` → `storage/r2-provider.ts` |

**Key structure:** Relative key string (`relKey`) passed to `putUploadedFile` / `storagePut`; public URL stored on entity. **No referential link** from URL back to object key in DB beyond string match.

---

## 9. ASN Ownership Mapping

Canonical ASN chain (post-ASN-5):

```text
Owner Account (users)
    → Subscription (user_subscriptions, restaurantId = 0)
    → Plan (subscription_plans via planId)
    → Commercial Entitlements (runtime — not persisted)
    → Restaurant (restaurants.userId)
    → Child Records (menu, tables, orders, offers, holidays)
```

### 9.1 Per-entity ownership classification

| Entity | Explicit path | Implicit path | Missing path | Ambiguous path |
|--------|---------------|---------------|--------------|----------------|
| `users` | Root account | — | — | — |
| `auth_tokens` | `users` → `auth_tokens` | — | — | — |
| `user_subscriptions` | `users` → subscription | `restaurantId` tags venue (legacy) | No FK to `restaurants` | **Ambiguous** — user-owned vs restaurant-scoped semantics |
| `subscription_plans` | Global catalog | — | — | — |
| `invoices` | `users` + `user_subscriptions` | — | No enforcement `invoice.userId = sub.userId` | Dual parent without DB constraint |
| `restaurants` | `users` → `restaurants` | Inherits commercial from owner | No `subscriptionId` on restaurant | — |
| `categories` | `users` → `restaurants` → `categories` | — | — | — |
| `menu_items` | `users` → `restaurants` → `categories` → `menu_items` | `restaurantId` duplicate | — | **Ambiguous** if `menu_items.restaurantId ≠ categories.restaurantId` (M3) |
| `offers` | `users` → `restaurants` → `offers` | — | — | — |
| `restaurant_tables` | `users` → `restaurants` → `tables` | — | — | — |
| `restaurant_holidays` | `users` → `restaurants` → `holidays` | — | — | — |
| `orders` | `restaurants` → `orders` | Owner via `restaurants.userId` | **No `userId`** on order | Guest orders not tied to accounts |
| `order_items` | `orders` → `order_items` | Restaurant via order | Menu item may be deleted | Snapshot vs live menu |
| `renewal_notifications` | `users` → notifications | Optional `subscriptionId` | — | Nullable subscription link |
| `countries_currencies` | System | — | — | — |
| Media URLs | Parent entity chain | — | **No orphan file tracking** | Blob lifecycle independent of DB |

### 9.2 ASN vs schema tension (documented, not remediated)

| Tension | Schema evidence |
|---------|-----------------|
| Restaurant does not own subscription row | `user_subscriptions.userId` is owner; `restaurantId` is scope tag only |
| Restaurant delete does not remove account subscription | Cascade filters `restaurantId = deletedId` only |
| Entitlements not stored | Cannot audit historical feature state from DB alone |
| Orders lack owner FK | Commercial gate uses `restaurantId` → owner lookup at runtime |

---

## 10. Initial Risks Observed (schema-level, pre-data)

| ID | Risk | Domain | Schema evidence |
|----|------|--------|-----------------|
| DI-01 | **No FK constraints** | All | Zero `FOREIGN KEY` in migrations |
| DI-02 | **Orphan rows possible** | All | Deletes outside `cascadeDeletes` leave dangling FK columns |
| DI-03 | **No soft delete** | All | Hard delete only; no recovery column |
| DI-04 | **Subscription scope ambiguity** | Commercial | `restaurantId` not FK; `0` vs `>0` semantics |
| DI-05 | **Invoice dual parent** | Commercial | `userId` + `subscriptionId` without DB consistency |
| DI-06 | **Menu item dual restaurant key** | Menu | `restaurantId` + `categoryId` cross-check required (M3) |
| DI-07 | **Order guest anonymity** | Ordering | No user FK; PII in optional name/phone only |
| DI-08 | **Order item menu reference** | Ordering | `menuItemId` may dangle after item delete |
| DI-09 | **Storage orphan blobs** | Storage | URL in DB; no cascade to R2/local files |
| DI-10 | **Slug uniqueness uncertainty** | Restaurant | Schema `index` vs historical `UNIQUE` constraint — verify live DB |
| DI-11 | **Duplicate migration filenames** | Meta | Multiple `0000_*`, `0001_*` files; journal selects one chain |
| DI-12 | **Empty Drizzle relations** | Meta | No ORM-level relation graph |
| DI-13 | **Plan delete unsafe** | Commercial | No cascade from `subscription_plans` |
| DI-14 | **Notifications without subscription** | Operations | `subscriptionId` nullable — intentional but complicates billing notification queries |

**Planned data checks (Phase B reference):** `scripts/data-integrity-audit-phase2-readonly.mjs` defines rules S4–S10, R1–R3, O1–O4, M1–M3 (not executed in Phase A).

---

## 11. Phase A Conclusion

### 11.1 Inventory completeness

All **16 persisted tables** and major **non-table patterns** (sessions, entitlements, ops logs, object storage) are inventoried and grouped by domain. Prisma is not used. Drizzle is the single schema source of truth.

### 11.2 Ownership chains

The dominant chain is:

```text
users.id
  ├─ user_subscriptions.userId
  ├─ invoices.userId
  ├─ renewal_notifications.userId
  ├─ auth_tokens.userId
  └─ restaurants.userId
        ├─ categories.restaurantId
        ├─ menu_items.restaurantId
        ├─ offers.restaurantId
        ├─ restaurant_tables.restaurantId
        ├─ restaurant_holidays.restaurantId
        └─ orders.restaurantId
              └─ order_items.orderId
```

Commercial authority per ASN maps to `users` → account subscription → plan → runtime entitlements → restaurant features.

### 11.3 Unclear boundaries

1. **`user_subscriptions.restaurantId`** — scope tag, not ownership FK.  
2. **`menu_items`** — duplicate restaurant reference vs category parent.  
3. **`orders`** — restaurant-scoped without account linkage.  
4. **Media URLs** — no storage entity or cascade.

### 11.4 Schema-level concerns (before data inspection)

Integrity depends heavily on **application cascades** and **runtime validation**. The schema permits structurally invalid states that Phase B data audits are designed to detect. No remediation proposed in Phase A.

### 11.5 Phase B handoff

Recommended next step: execute readonly data audit (`data-integrity-audit-phase2-readonly.mjs`) per environment and map findings to DI-01–DI-14.

---

## Appendix A — Full table list

| # | Table | Domain |
|---|-------|--------|
| 1 | `users` | Identity |
| 2 | `auth_tokens` | Identity |
| 3 | `subscription_plans` | Commercial |
| 4 | `user_subscriptions` | Commercial |
| 5 | `invoices` | Commercial |
| 6 | `restaurants` | Restaurant |
| 7 | `restaurant_holidays` | Restaurant |
| 8 | `restaurant_tables` | Restaurant |
| 9 | `countries_currencies` | Restaurant (reference) |
| 10 | `categories` | Menu |
| 11 | `menu_items` | Menu |
| 12 | `offers` | Menu |
| 13 | `orders` | Ordering |
| 14 | `order_items` | Ordering |
| 15 | `renewal_notifications` | Operations |
| 16 | *(none)* | Entitlements — code only |

---

## Appendix B — Application cascade matrix

| Delete entry point | Children removed (order) |
|--------------------|--------------------------|
| `deleteUserCascade` | Each owned restaurant (full restaurant cascade) → user invoices → user notifications → user subscriptions → auth_tokens → user |
| `deleteRestaurantCascade` | order_items → orders → tables → holidays → offers → menu_items → categories → scoped subs (+ invoices/notifications) → restaurant |
| `deleteSubscriptionCascade` | invoices → renewal_notifications → subscription |

**Not cascaded:** R2/local files; account-scoped subscriptions on restaurant delete; `countries_currencies`; `subscription_plans`.

---

## Appendix C — Related documents

| Document | Relationship |
|----------|--------------|
| `COMMERCIAL-DATA-MODEL-AUDIT.md` | PG-1A.3 ownership chain |
| `SUBSCRIPTION-SCOPE-AUDIT.md` | `restaurantId` scope semantics |
| `ASN-FINAL-EXECUTIVE-REPORT.md` | Canonical authority model |
| `scripts/data-integrity-audit-phase2-readonly.mjs` | Phase B data rules |

---

*End of DATA-INTEGRITY-1 Phase A. Read-only schema inventory. No remediation.*

---

# DATA-INTEGRITY-1 — Phase E — Legacy Data Audit

**Program:** Data Integrity (DATA-INTEGRITY-1)  
**Phase:** E — Legacy footprint classification  
**Date:** 2026-06-08  
**Status:** Complete — read-only documentation  

**Mode:** Documentation and classification only. No code, schema, database, migration, or cleanup execution.

**Audit target:** MineuQR launch database — `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr` (ENV-DRIFT resolved; not workspace Monu legacy).

**Inputs:**

- DATA-INTEGRITY-1R automated run (`scripts/data-integrity-1r-mineuqr-readonly.mjs`, `2026-06-08T15:37:15.849Z`)
- DATA-INTEGRITY Phase 2 readonly suite (`scripts/data-integrity-audit-phase2-readonly.mjs`, same session)
- ASN-5 execution record (`ASN-5-AUTHORITY-NORMALIZATION-EXECUTION.md`)
- ASN-4C legacy backfill planning (`ASN-4C-LEGACY-SUBSCRIPTION-BACKFILL-PLAN.md`)

**Verified inventory baseline:**

| Entity | Count |
|--------|------:|
| users | 2 |
| restaurants | 5 |
| user_subscriptions | 4 |
| categories | 2 |
| menu_items | 4 |
| orders | 3 |
| order_items | 3 |
| invoices | 1 |
| renewal_notifications | 91 |
| auth_tokens | 4 |

---

## E.0 Executive summary

The MineuQR launch dataset is **small and structurally intact** (zero orphan FK columns per 1R probes) but carries a **clear pre-ASN commercial data footprint**: all four subscription rows are **restaurant-scoped** (`restaurantId > 0`); **zero** account-scoped rows (`restaurantId = 0`) exist. Runtime code after ASN-5 expects account-scoped trials for `pickUserLevelSubscription` / `getCommercialEntitlements`, so **legacy scoped rows are invisible to the canonical commercial chain** even when `status = active`.

Parallel legacy signals:

| Signal | Severity (legacy) | Count / evidence |
|--------|-------------------|------------------|
| Restaurant-scoped subscriptions only | **High** — ASN data gap | 4 scoped, 0 account |
| Test/demo restaurant shells | **Medium** | 4 of 5 restaurants empty (no categories/items) |
| Test owner account | **Medium** | User `14760004` owns 4 `sam*` slug venues |
| Restaurant without subscription (R2) | **Medium** | Restaurant `720002` — Phase 2 medium finding |
| Stale auth token | **Low** | 1 expired unused token |
| High notification volume | **Low–Medium** | 91 rows vs 3 orders — ops noise / dev activity |
| Pre-ASN registration pattern | **Info** | Test user created `2026-06-07` with scoped subs (admin or pre-cutover paths) |

**Phase E verdict:** Legacy artifacts **present** but **bounded**. They do **not** indicate data corruption; they indicate **pre-normalization commercial rows** and **development/test clutter**. Launch can proceed **without mandatory cleanup** if operators accept ASN backfill as a follow-on program item and treat test venues as non-production.

---

## E.1 Deliverable A — User Legacy Audit

### A.1 User inventory

| User ID | Role | Login method | Email verified | Created (UTC) | Classification | Commercial relevance |
|---------|------|--------------|----------------|---------------|----------------|----------------------|
| **1** | `admin` | `email` | Yes | `2026-04-01T19:12:37` | **active**, **admin** | Operator / seed owner; owns production-like demo venue `720007` |
| **14760004** | `user` | `email` | Yes | `2026-06-07T16:45:56` | **test**, **legacy** (pre-ASN data pattern) | Multi-venue test owner; 4 empty restaurant shells; scoped subscriptions |

*Emails omitted from this document (non-secret classification only).*

### A.2 Per-user classification

| User ID | active | admin | test | legacy | removable later |
|---------|:------:|:-----:|:----:|:------:|:---------------:|
| 1 | ✓ | ✓ | — | partial (scoped sub) | **No** — preserve |
| 14760004 | ✓ | — | ✓ | ✓ (scoped subs) | **Yes** — after commercial sign-off |

### A.3 User legacy notes

| ID | Finding |
|----|---------|
| **1** | Oldest account; predates ASN-5. Uses supported `email` login (no Manus/U3 artifacts). Admin role is intentional governance identity. |
| **14760004** | Created day before/during ASN-5 rollout window. Owns restaurants with `sam*` / `saaa` slug patterns — heuristic **test account**. Not `admin`; not protected by `PROTECTED_USER_IDS` cascade guard (verify before any future delete). |

**Deliverable A conclusion:** One **preserve** admin, one **test/legacy** owner. No duplicate emails, no Manus login artifacts (Phase 2 U3 = 0).

---

## E.2 Deliverable B — Restaurant Legacy Audit

### B.1 Restaurant inventory

| Restaurant ID | Owner | Slug (public URL key) | isActive | Categories | Menu items | Scoped sub | Classification |
|---------------|-------|----------------------|:--------:|:----------:|:----------:|:----------:|----------------|
| **720002** | 14760004 | `sam672-Y7Y0ac` | 1 | 0 | 0 | **None** | **test**, empty, **investigate** (R2) |
| **720003** | 14760004 | `sam-1WloHC` | 1 | 0 | 0 | 630001 | **test**, empty shell, **removable later** |
| **720005** | 14760004 | `sam12-Y6ldJq` | 1 | 0 | 0 | 630002 | **test**, empty shell, **removable later** |
| **720006** | 14760004 | `saaa-Ei7D02` | 1 | 0 | 0 | 600002 | **test**, empty shell, **removable later** |
| **720007** | 1 | `خالد-Zx0OcD` | 1 | 2 | 4 | 600001 | **preserve** — seed/demo venue with live menu |

### B.2 Legacy pattern matrix

| Pattern | Restaurants | Notes |
|---------|-------------|-------|
| **Test restaurants** | 720002–720006 | Slug/name heuristics; owned by test user |
| **Abandoned restaurants** | 720002–720006 | `isActive = 1` but zero menu content — configured shells only |
| **Empty restaurants** | 720002–720006 | No categories, no menu_items |
| **Restaurants without menus** | 720002–720006 | Public menu pages would be empty |
| **Restaurants without subscriptions** | **720002 only** | Phase 2 **R2** medium finding (count = 1) |
| **Historical artifacts** | — | None identified beyond scoped subscription pairing |

### B.3 Ownership map

```text
User 1 (admin)
└─ Restaurant 720007 (خالد) — full menu, scoped BASIC sub

User 14760004 (test)
├─ 720002 sam672 — NO subscription (R2 gap)
├─ 720003 sam — scoped BASIC sub
├─ 720005 sam12 — scoped BASIC sub
└─ 720006 saaa — scoped PROFESSIONAL sub
```

**Deliverable B conclusion:** **4 of 5** restaurants are test shells — **removable later** after owner account review. **720007** is the only venue with commercial/menu substance — **preserve**.

---

## E.3 Deliverable C — Subscription Legacy Audit

### C.1 Subscription inventory

| Sub ID | User | restaurantId | Status | planId | Catalog plan | Scope class |
|--------|------|-------------|--------|--------|--------------|-------------|
| **600001** | 1 | 720007 | `active` | 30001 | BASIC | **Restaurant-scoped (legacy)** |
| **600002** | 14760004 | 720006 | `active` | 30002 | PROFESSIONAL | **Restaurant-scoped (legacy)** |
| **630001** | 14760004 | 720003 | `active` | 30001 | BASIC | **Restaurant-scoped (legacy)** |
| **630002** | 14760004 | 720005 | `active` | 30001 | BASIC | **Restaurant-scoped (legacy)** |

### C.2 Scope summary

| Metric | Count |
|--------|------:|
| Total rows | 4 |
| Account-scoped (`restaurantId = 0`) | **0** |
| Restaurant-scoped (`restaurantId > 0`) | **4** |
| `trial` status | 0 |
| `active` status | 4 |
| Owner mismatch (S9) | 0 |
| Orphan (S4) | 0 |
| Duplicate entitled per (user, restaurant) (S6) | 0 |

### C.3 Legacy subscription findings

| Finding | Classification | Detail |
|---------|----------------|--------|
| **100% scoped rows** | **legacy**, **investigate** | ASN canonical model expects account row per owner; ASN-4C backfill not executed on this DB |
| **Test subscriptions** | **legacy**, **removable later** | 600002, 630001, 630002 on empty test venues |
| **Admin scoped BASIC on 720007** | **legacy**, **preserve** | Pre-ASN admin onboarding pattern; entitlements not visible to `pickUserLevelSubscription` |
| **Redundant subscriptions** | **investigate** | Test user holds **3 active scoped rows** for **3 empty venues** — redundant vs single account trial |
| **Trial leftovers** | **None** | No `trial` status rows |
| **Inactive commercial artifacts** | **None** | All four rows `active` |
| **Ownership anomalies** | **None** | `subscription_owner_mismatch = 0` (1R) |
| **Venue without sub** | **investigate** | Restaurant 720002 has no row — commercial gap, not orphan sub |

**Deliverable C conclusion:** Subscription table is entirely **pre-ASN scoped footprint**. Not corrupt; **requires ASN-4C/5A-style backfill** before account-level entitlements match stored billing state. Test-user scoped rows are **removal candidates** after billing review.

---

## E.4 Deliverable D — Ordering Legacy Audit

### D.1 Ordering inventory (counts)

| Entity | Count | Notes |
|--------|------:|-------|
| orders | 3 | All structurally linked (O1–O4 = 0 in Phase 2) |
| order_items | 3 | 1:1 with orders — no orphan line items |
| restaurant_tables | *not in 1R script* | Implied by orders with `tableId`; column-level detail not captured in 1R export |

### D.2 Structural integrity (Phase 2)

| Check | Result |
|-------|--------|
| O1 — orders without restaurant | 0 |
| O2 — orders with invalid table/restaurant pairing | 0 |
| O3 — orphan order_items | 0 |
| O4 — totalAmount mismatch vs lines | 0 |

### D.3 Legacy ordering classification

| Finding | Classification | Rationale |
|---------|----------------|-----------|
| **3 orders on small dataset** | **test** / **investigate** | Volume consistent with manual QA, not production traffic |
| **Orders vs menu concentration** | **investigate** | All menu content on `720007`; orders likely tied to admin demo venue (ID-level join not in 1R export) |
| **Abandoned orders** | **None confirmed** | No `pending` backlog classification without status export — defer to Phase F or extended readonly query |
| **Invalid historical states** | **None detected** | Phase 2 ordering checks clean |
| **Development-only records** | **probable** | Co-located with test user creation date and demo menu |

**Deliverable D conclusion:** Ordering data is **minimal and structurally sound**. Treat as **development/test artifacts** unless order timestamps prove production guest traffic. **No launch-blocking ordering integrity defects.**

---

## E.5 Deliverable E — Authentication Legacy Audit

### E.1 Auth token inventory

| Metric | Count |
|--------|------:|
| Total `auth_tokens` | 4 |
| Expired and unused | **1** (1R `qualityChecks.expired_unused_tokens`) |
| Used tokens | *not exported* — remainder presumed consumed or valid |

### E.2 Session model (non-table)

| Artifact | Legacy status |
|----------|---------------|
| JWT cookie sessions | **Current** — no session table |
| `users.sessionValidAfter` | **Current** — post-0018 auth policy |
| Manus/OAuth legacy users (U3) | **0** — no Manus artifacts in user table |

### E.3 Authentication legacy findings

| Finding | Classification | Recommendation |
|---------|----------------|----------------|
| **1 stale unused token** | **legacy**, **Safe Later Removal** | Expired `auth_tokens` row with `usedAt IS NULL` — housekeeping only |
| **No session table remnants** | **resolved** | N/A |
| **No obsolete auth provider users** | **resolved** | Both users on `email` login |
| **Pre-auth-policy leftovers** | **None identified** | Migrations 0017–0019 applied; users email-verified |

**Deliverable E conclusion:** Auth surface is **clean** except **one expired token** — low-risk housekeeping candidate. No legacy provider accounts.

---

## E.6 Deliverable F — ASN Legacy Audit

### F.1 Code vs data alignment

| Dimension | Status | Evidence |
|-----------|--------|----------|
| **ASN ownership model in code** | **resolved** | `registerOwner.ts` inserts `buildTrialSubscriptionForUser(userId, 0)` (ASN-5) |
| **Guest ordering authority** | **resolved** | `resolveGuestOrderingAllowed` → account entitlements only |
| **Legacy ordering fallbacks F-W1-03/04** | **resolved** | Removed per ASN-5 |
| **Legacy data on launch DB** | **investigate** | **0** account-scoped subs; **4** scoped subs |
| **Legacy resolver remnants in code** | **future cleanup** | `getSubscriptionForRestaurant`, `restaurantAllowsTableOrdering` deprecated but present |
| **Old subscription creation paths** | **future cleanup** | Admin `createRestaurantSubscription` still inserts scoped rows (ASN-4C C-05) |

### F.2 Remaining legacy ownership assumptions

| Assumption | Where it lives | Data impact on `mineuqr` |
|------------|----------------|--------------------------|
| Scoped row = venue authority | `getSubscriptionForRestaurant`, admin stats fallbacks | Admin UI may still **display** scoped sub for 720007 |
| Account row = commercial authority | `pickUserLevelSubscription`, `getCommercialEntitlements` | **No row matches** → `plan: NONE` for **both** users |
| `restaurantId` immutable after insert | Application code | Backfill must **create** account rows, not UPDATE scope |

### F.3 Commercial correctness gap (legacy data + new code)

```text
Stored state:     4 × user_subscriptions.restaurantId > 0
Canonical read:   pickUserLevelSubscription filters restaurantId === 0
Result:           No entitled account subscription for either owner
Guest ordering:   resolveGuestOrderingAllowed → features.ordering === false (NONE path)
```

**Important:** Three orders exist — consistent with orders placed **before ASN-5 guest gate** or via paths that did not enforce account entitlements. Orders are **historical evidence**, not proof that current entitlements match scoped rows.

### F.4 ASN classification summary

| Item | Classification |
|------|----------------|
| ASN-5 code execution | **resolved** |
| ASN-4C data backfill on `mineuqr` | **investigate** — required for entitlement alignment |
| Scoped subscription rows | **future cleanup** / backfill migrate |
| Deprecated resolver functions | **future cleanup** (code-only, post-backfill) |
| Test user multi-scoped subs | **removable later** after backfill or cascade delete |

**Deliverable F conclusion:** ASN is **fully adopted in runtime code** but **not reflected in persisted subscriptions**. This is the **primary legacy footprint** on the launch database.

---

## E.7 Deliverable G — Removal Candidate Register

| ID | Entity | Reason | Risk | Recommendation |
|----|--------|--------|------|----------------|
| **RC-01** | User `14760004` | Test owner; `sam*` restaurant pattern; created during dev window | **Medium** — cascades 4 restaurants, 3 subs, possible notifications | **Investigate** → **Safe Later Removal** after billing/ops sign-off |
| **RC-02** | Restaurants `720002`–`720006` | Empty test shells; 4/5 total venues | **Low–Medium** — scoped subs on 720003/005/006; 720002 lacks sub (R2) | **Safe Later Removal** with test user (RC-01) |
| **RC-03** | Subscriptions `600002`, `630001`, `630002` | Scoped legacy rows on test venues | **Medium** if Stripe-linked | **Investigate** billing linkage → **Safe Later Removal** |
| **RC-04** | Subscription `600001` | Scoped legacy on admin demo venue | **High** if deleted without backfill | **Preserve** until account-scoped row created (ASN backfill) |
| **RC-05** | Auth token (1 expired unused) | Stale `email_verify` or `password_reset` row | **Low** | **Safe Later Removal** |
| **RC-06** | Orders (3) + order_items (3) | Probable QA / pre-gate test orders | **Low** | **Investigate** timestamps → **Safe Later Removal** if confirmed test-only |
| **RC-07** | Notifications (91) | High volume vs tiny entity count; likely dev/order/billing noise | **Low** | **Investigate** by `notificationType` → **Safe Later Removal** for test user subset |
| **RC-08** | Invoice (1) | Commercial artifact | **High** — billing record | **Preserve** |
| **RC-09** | Restaurant `720007` + menu | Only substantive launch venue | **High** | **Preserve** |
| **RC-10** | User `1` (admin) | Governance + seed owner | **Critical** | **Preserve** |

**No execution authorized in Phase E.**

---

## E.8 Deliverable H — Commercial Readiness Impact

| # | Question | Answer |
|---|----------|--------|
| **1** | Are legacy artifacts present? | **Yes** — scoped subscriptions (100%), test user + 4 empty venues, 1 stale auth token, probable test orders, notification noise |
| **2** | Do they affect launch readiness? | **Partially** — clutter and ASN data gap affect **confidence**, not infrastructure. Environment and structural integrity are sound (1R orphans = 0). |
| **3** | Do they affect commercial correctness? | **Yes** — account entitlements do not reflect stored scoped `active` rows; guest ordering gate reads **NONE** for both owners under current code |
| **4** | Must anything be cleaned before launch? | **No mandatory delete** — **ASN account-scoped backfill** (or admin creation of `restaurantId = 0` rows) is **recommended** before relying on entitlements/ordering gates. Test data cleanup is **optional** hygiene. |
| **5** | Can launch proceed without cleanup? | **Yes, with documented caveats** — launch can proceed if operators (a) accept demo/test rows as non-customer data, (b) execute ASN backfill before enforcing commercial gates in production, (c) preserve admin venue `720007` and invoice `RC-08` |

### H.1 Launch readiness classification

| Area | Verdict |
|------|---------|
| Structural integrity | **PASS** |
| Legacy footprint bounded | **PASS** |
| ASN data normalization | **INVESTIGATE** — backfill pending |
| Test data isolation | **INVESTIGATE** |
| Auth hygiene | **PASS WITH WARNINGS** (1 stale token) |

**Phase E overall:** **PASS WITH WARNINGS** — legacy footprint documented; no cleanup executed.

---

## E.9 Phase E conclusion

### E.9.1 Legacy footprint summary

| Category | Volume | Disposition |
|----------|--------|-------------|
| Pre-ASN scoped subscriptions | 4 rows | Backfill → account scope; do not hard-delete with invoice |
| Test/demo restaurants | 4 venues | Removable later |
| Test owner account | 1 user | Removable later |
| Demo/admin venue | 1 venue | Preserve |
| Test/probable orders | 3 orders | Investigate → removable later |
| Stale auth tokens | 1 row | Safe later removal |
| Notification backlog | 91 rows | Investigate by type |

### E.9.2 Handoff

| Next step | Program |
|-----------|---------|
| Migration safety on launch DB | **Phase F — Migration Safety Audit** |
| ASN scoped → account backfill execution | **ASN-4C / post-5A** (separate change request) |
| Extended readonly probes (orders status, tables, notification types) | Optional 1R script extension — not required for Phase E classification |

### E.9.3 Success criteria

| Criterion | Status |
|-----------|--------|
| Complete legacy footprint inventory | **Met** |
| All findings classified | **Met** |
| No cleanup performed | **Met** |
| No code or data modifications | **Met** |

---

*End of DATA-INTEGRITY-1 Phase E. Read-only legacy classification. No remediation.*

---

# DATA-INTEGRITY-1 — Phase E1 — User Legacy Audit

**Program:** Data Integrity (DATA-INTEGRITY-1)  
**Phase:** E1 — User-focused legacy audit (subset of Phase E)  
**Date:** 2026-06-08  
**Status:** Complete — read-only documentation  

**Mode:** Documentation and classification only. No code, schema, database, migration, or cleanup execution.

**Audit target:** MineuQR launch database — `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr`

**Provenance:**

| Source | Captured (UTC) | Fields exported |
|--------|----------------|-----------------|
| `scripts/data-integrity-1r-mineuqr-readonly.mjs` | `2026-06-08T15:37:15.849Z` | `id`, `role`, `loginMethod`, email presence, `emailVerifiedAt` presence, `createdAt` |
| `scripts/data-integrity-audit-phase2-readonly.mjs` | Same session | U1/U3/U4, auth token expiry |
| Cross-cluster identity correlation | User `1` | Same `id` + `createdAt` as `COMMERCIAL-DATA-SNAPSHOT.md` / ASN-5A admin listing |

**Field gap note:** The 1R runner does not export `openId`, `name`, `email` (value), `updatedAt`, or `sessionValidAfter`. Values below mark **verified** (from 1R), **inferred** (schema + registration code), or **operator re-query** where exact strings are required.

---

## E1.0 Executive Summary

MineuQR launch database contains **exactly 2 users** — one **primary admin** and one **legacy test owner**. Both use the **current supported auth model** (`loginMethod = email`, email verified). No Manus/OAuth legacy users (Phase 2 **U3 = 0**). No duplicate emails or openIds (U1/U4 = 0).

| User | Primary classification | Launch relevance |
|------|------------------------|------------------|
| **1** | **PRIMARY_ADMIN** | Must retain — protected (`PROTECTED_USER_IDS`), owns sole substantive venue |
| **14760004** | **LEGACY_TEST_USER** / **REMOVAL_CANDIDATE** | Non-production clutter; safe to remove after dependency review |

**Launch classification: YELLOW** — legacy test account exists but is bounded and manageable. **No user-related launch blockers.**

---

## E1.1 User Inventory (E1.1)

### E1.1.1 Full field inventory

| Field | User 1 | User 14760004 |
|-------|--------|---------------|
| **id** | `1` ✓ | `14760004` ✓ |
| **openId** | *not in 1R export* — inferred `local_*` or early admin pattern | *not in 1R export* — register path uses `local_{email}` |
| **name** | *not in 1R export* | *not in 1R export* — optional at register |
| **email** | `k.sh61@yahoo.com` *(inferred — same id + createdAt as operator snapshots)* | Present ✓ (`has_email = 1`) — exact value **operator re-query** |
| **loginMethod** | `email` ✓ | `email` ✓ |
| **role** | `admin` ✓ | `user` ✓ |
| **emailVerifiedAt** | Set ✓ (`email_verified = 1`) | Set ✓ (`email_verified = 1`) |
| **createdAt** | `2026-04-01T19:12:37.000Z` ✓ | `2026-06-07T16:45:56.000Z` ✓ |
| **updatedAt** | *not in 1R export* | *not in 1R export* |
| **sessionValidAfter** | *not in 1R export* | *not in 1R export* |
| **passwordHash** | Present (schema) — not audited | Present (schema) — not audited |

### E1.1.2 Summary table (deliverable format)

| User | Email | Login Method | Role | Notes |
|------|-------|--------------|------|-------|
| **1** | `k.sh61@yahoo.com` *(cross-snapshot correlation)* | `email` | `admin` | Primary production operator; `PROTECTED_USER_IDS`; created pre-launch (`2026-04-01`) |
| **14760004** | *present — exact address not in 1R export* | `email` | `user` | Test owner; 4 `sam*` restaurants; created `2026-06-07` during pre-launch QA window |

---

## E1.2 Ownership Audit (E1.2)

### E1.2.1 Asset matrix

| User | Restaurants | Subscriptions | Other Assets |
|------|------------:|--------------:|--------------|
| **1** | **1** (`720007` — خالد, full menu: 2 categories, 4 items) | **1** scoped active BASIC (`600001` → `720007`) | **1 invoice** (system total); orders/menu/notifications on demo venue; admin governance identity |
| **14760004** | **4** (`720002`–`720006`, all empty shells) | **3** scoped active (`600002` PRO, `630001`/`630002` BASIC) | Share of **91** `renewal_notifications`; share of **4** `auth_tokens`; **0** invoices attributed; restaurant `720002` has **no** subscription (R2) |

### E1.2.2 Ownership detail

**User 1 (PRIMARY_ADMIN)**

```text
User 1
├─ Restaurant 720007 (slug: خالد-Zx0OcD) — ONLY venue with menu content
│   ├─ Categories: 480001, 510001
│   ├─ Menu items: 540001, 570001–570003
│   └─ Orders: probable QA traffic (3 system-wide)
├─ Subscription 600001 (restaurantId=720007, active, planId=30001 BASIC)
└─ Invoice 1 (system sole commercial document — preserve)
```

**User 14760004 (LEGACY_TEST_USER)**

```text
User 14760004
├─ 720002 sam672-Y7Y0ac — 0 menu, NO subscription (R2 gap)
├─ 720003 sam-1WloHC — 0 menu, sub 630001
├─ 720005 sam12-Y6ldJq — 0 menu, sub 630002
└─ 720006 saaa-Ei7D02 — 0 menu, sub 600002 (PROFESSIONAL)
```

### E1.2.3 Orphan / integrity (1R)

| Check | Result |
|-------|--------|
| Restaurants without owner | 0 |
| Subscriptions without user | 0 |
| Subscription owner mismatch | 0 |
| Invoice orphan / user mismatch | 0 |

---

## E1.3 Authentication Audit (E1.3)

### E1.3.1 System-wide auth posture

| Dimension | Finding |
|-----------|---------|
| Login methods in use | **`email` only** (2/2 users) |
| Email/password users | **2** — both have email + `passwordHash` column (schema) |
| OAuth users | **0** |
| Manus / legacy provider (U3) | **0** |
| Demo users (heuristic) | **1** — user `14760004` (`sam*` venue pattern) |
| Unsupported auth patterns | **None detected** |
| `auth_tokens` (system) | **4** total; **1** expired unused (Phase 2 / 1R quality check) |

### E1.3.2 Per-user authentication table

| User | Auth Model | Current Compatibility | Risk |
|------|------------|----------------------|------|
| **1** | Email + password; verified email; JWT session + `sessionValidAfter` revocation | **Fully compatible** with post-0017/0018/0019 auth policy | **Low** — protected admin; no legacy provider |
| **14760004** | Email + password; verified email; same session model | **Fully compatible** | **Low** auth risk; **Medium** data hygiene (test account owns commercial rows) |

### E1.3.3 Auth artifact notes

| Artifact | Status | User attribution |
|----------|--------|------------------|
| Session table | **None** (cookie JWT) | N/A |
| `auth_tokens` rows | 4 system-wide | Per-user split **not in 1R export** — 1 stale expired-unused token is housekeeping only |
| Email unique index (0019) | Schema applied | 0 duplicate normalized emails |
| `loginMethod = manus` | **0 users** | Legacy provider fully absent |

---

## E1.4 Legacy Classification (E1.4)

| User ID | Classification | Justification |
|---------|----------------|---------------|
| **1** | **PRIMARY_ADMIN** | `role = admin`; `PROTECTED_USER_IDS`; oldest account (`2026-04-01`); owns launch demo venue `720007` with full menu; holds system invoice; operator-identified production identity (`k.sh61@yahoo.com` correlation) |
| **14760004** | **LEGACY_TEST_USER** → **REMOVAL_CANDIDATE** | Created `2026-06-07` in pre-launch window; owns 4 empty `sam*`/`saaa` slug restaurants; 3 scoped legacy subscriptions on empty shells; not protected; no invoices; heuristic QA registration — not a customer account |

**Not applicable classifications:**

| Class | Users |
|-------|-------|
| **ACTIVE_OWNER** | 0 — no production customer owner distinct from admin |
| **HISTORICAL_ACCOUNT** | 0 — no deactivated/orphan user without current role |

---

## E1.5 Dependency Assessment (E1.5)

### User 14760004 (non-admin)

| Question | Answer |
|----------|--------|
| Does anything depend on this account? | **Yes** — 4 restaurants, 3 subscriptions, portion of 91 notifications, possible auth tokens and test orders |
| Would deleting affect launch readiness? | **No** — account is test clutter; launch depends on admin user `1` and venue `720007` |
| Would deleting affect restaurants? | **Yes** — removes 4/5 restaurants (all empty shells); **does not** remove substantive venue `720007` |
| Would deleting affect subscriptions? | **Yes** — removes 3/4 subscription rows (all scoped legacy on test venues) |

### User 1 (admin)

| Question | Answer |
|----------|--------|
| Does anything depend on this account? | **Yes** — critical: restaurant `720007`, menu, subscription `600001`, invoice, admin access |
| Would deleting affect launch readiness? | **Yes — launch blocker if removed** |
| Protected from cascade delete? | **Yes** — `PROTECTED_USER_IDS = [1]` |

---

## E1.6 Commercial Launch Assessment (E1.6)

| # | Question | Answer |
|---|----------|--------|
| **1** | Which users must be retained? | **User `1` only** (PRIMARY_ADMIN) |
| **2** | Which users require further review? | **User `14760004`** — confirm email identity, Stripe linkage on subs `600002`/`630001`/`630002`, notification subset before any delete |
| **3** | Which users are removal candidates? | **User `14760004`** — after billing/ops sign-off |
| **4** | Legacy auth concerns? | **None user-level** — both email-verified email users; 1 stale `auth_tokens` row (system hygiene, not user architecture) |
| **5** | Any user represents a launch blocker? | **No** — test user is clutter, not a blocker; admin is required and healthy |

### E1.6.1 Output classification

## **YELLOW**

Legacy test account exists but is **manageable**. No unsupported auth. No duplicate identity. Admin account is clean and protected.

| Tier | Condition | This audit |
|------|-----------|------------|
| **GREEN** | No user-related launch blockers | Auth model clean ✓ |
| **YELLOW** | Legacy accounts exist but manageable | **Selected** — 1 test user with bounded dependencies |
| **RED** | User/auth architecture launch-impacting risks | **Not met** — no Manus users, no duplicate emails, no unverified production owners |

---

## E1.7 Removal Candidate Register

| ID | User | Classification | Dependencies | Risk if removed | Recommendation |
|----|------|----------------|--------------|-----------------|----------------|
| **E1-RC-01** | `14760004` | LEGACY_TEST_USER | 4 restaurants, 3 subs, notifications, possible tokens/orders | **Medium** — cascade deletes commercial rows; verify no Stripe ids | **Investigate** → **Safe Later Removal** |
| **E1-RC-02** | `1` | PRIMARY_ADMIN | Full launch venue, invoice, admin ops | **Critical** | **Preserve** — never remove |

**No execution authorized.**

---

## E1.8 Deliverables checklist

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Executive Summary | E1.0 |
| 2 | User Inventory Table | E1.1.2 |
| 3 | Ownership Analysis | E1.2 |
| 4 | Authentication Analysis | E1.3 |
| 5 | Legacy Classification Matrix | E1.4 |
| 6 | Removal Candidate Register | E1.7 |
| 7 | Commercial Launch Assessment | E1.6 |

### E1.8.1 Operator follow-up (optional, read-only)

To close the 1R field gap without code changes, run in TiDB console:

```sql
SELECT id, openId, name, email, loginMethod, role,
       emailVerifiedAt, sessionValidAfter, createdAt, updatedAt
FROM users ORDER BY id;

SELECT userId, type, usedAt, expiresAt FROM auth_tokens ORDER BY id;
```

---

*End of DATA-INTEGRITY-1 Phase E1. Read-only user legacy audit. No remediation.*
