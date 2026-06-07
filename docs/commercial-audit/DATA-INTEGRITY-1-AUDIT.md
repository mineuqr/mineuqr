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
