# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Database Audit

**Date:** 2026-06-26

---

## Current State (Post-0043)

**No printing tables exist** in live schema or `drizzle/schema.ts`.

Migration `0043_print_purification.sql` (RESET-1 Wave 5B) dropped all print infrastructure. `categories.stationId` cross-domain column also removed.

---

## Historical Table Inventory (Pre-0043)

### `printers`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Restaurant printer configuration (name, paper width, profile, default flag) |
| **Owner** | Former `server/printing/` service |
| **Created** | `0030_print_infrastructure.sql` |
| **Dropped** | `0043_print_purification.sql` |
| **Key columns** | `restaurantId`, `name`, `paperWidthMm`, `profileId`, `isDefault` |
| **Indexes** | `printers_restaurant_id`; unique `(restaurantId, profileId)` added in 0038 |
| **Current use** | **OBSOLETE** — table dropped |

### `restaurant_print_settings`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Per-restaurant print preferences (locale, auto-print, default printer) |
| **Owner** | Former print settings service |
| **PK** | `restaurantId` |
| **Key columns** | `ticketLocale`, `autoPrintOnNewOrder`, `showTotalAmount`, `defaultPrinterId` |
| **Current use** | **OBSOLETE** |

### `print_jobs`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Print job queue — authoritative job lifecycle |
| **Owner** | Former `server/printing/` + Print Host |
| **Created** | 0030 |
| **Evolution** | 0031 idempotency unique; 0032 `printing` status; 0033 `stationId`; 0035 `assigned` status + `assignedAgentId`; 0036 `dispatchNotifiedAt`; 0037 `correlationId`; FKs 0039–0040 |
| **Status enum (final)** | `queued`, `assigned`, `claimed`, `printing`, `printed`, `failed`, `cancelled`, `expired` |
| **Indexes** | restaurant, order, printer, status, idempotency, composite `(restaurantId, status, createdAt)`, dispatch pending `(assignedAgentId, dispatchNotifiedAt)` |
| **FKs** | `printerId → printers.id`; `orderId → orders.id` |
| **Current use** | **OBSOLETE** |

### `print_job_attempts`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Audit trail of job state transitions |
| **Owner** | Former print service |
| **FK** | `printJobId → print_jobs.id` (0041) |
| **Current use** | **OBSOLETE** |

### `print_stations`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Named stations mapping to printers (kitchen/bar routing) |
| **Owner** | Former print routing layer |
| **Created** | 0033 |
| **Cross-domain** | `categories.stationId`, `print_jobs.stationId` |
| **Current use** | **OBSOLETE** |

### `print_diagnostic_runs`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Agent-initiated printer diagnostic test runs |
| **Owner** | Former Print Agent integration |
| **Created** | 0034 |
| **Key columns** | `diagnosticId`, `agentId`, `printerId`, `triggeredByUserId`, `status` |
| **Current use** | **OBSOLETE** |

### `print_job_telemetry_events`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Operational telemetry correlated to jobs (agent, printer, severity) |
| **Owner** | Former print ops / agent pipeline |
| **Created** | 0037 |
| **FK** | `printJobId → print_jobs.id` (0042) |
| **Current use** | **OBSOLETE** |

---

## Cross-Domain Column Removed

| Table | Column | Purpose | Dropped |
|-------|--------|---------|---------|
| `categories` | `stationId` | Route menu category to print station | 0043 |

**Verified:** No `stationId` in current `drizzle/schema.ts`.

---

## Relationship Diagram (Historical)

```
restaurants
    ├── restaurant_print_settings (1:1)
    ├── printers (1:N)
    │       └── print_stations (N:1 printer)
    ├── categories.stationId → print_stations (removed)
    └── orders
            └── print_jobs (N:1 order)
                    ├── print_job_attempts (1:N)
                    └── print_job_telemetry_events (1:N)

print_diagnostic_runs → printers, restaurants (standalone audit)
```

---

## Drizzle Schema Ownership

| Concern | Owner module (current) |
|---------|------------------------|
| Order write model | `drizzle/schema.ts` — orders, order_items, etc. |
| Print tables | **None** — purged |
| Future print schema | **PRINTING-1** — expected `server/printing/read/` + new migrations |

---

## Database Audit Verdict

| Check | Result |
|-------|--------|
| Orphan print tables in live schema | **None** |
| Print FKs to orders | **Removed** with tables |
| Schema drift (code expects print tables) | **None detected** |
| RESET-1 purification complete | **Yes** (0043) |
| Ready for new PRINTING-1 schema | **Yes** — greenfield migration path |
