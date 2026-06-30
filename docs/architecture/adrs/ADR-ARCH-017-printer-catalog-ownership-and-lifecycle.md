# ADR-ARCH-017: Printer Catalog Ownership and Lifecycle

> [← ADR-ARCH-016](./ADR-ARCH-016.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Version** | 1.1 |
| **Owner** | Architecture Authority |
| **Program** | PRINT-CONNECTOR-ONBOARDING-1A (ratification) |
| **Date** | 2026-06-30 |
| **Extends** | ADR-ARCH-016 (Distributed Printing Topology) |
| **Supersedes** | Informal catalog guidance in PRINT-UX-1 / PRINT-ARCHITECTURE-2 program docs |
| **Implementation status** | Not implemented |

## Amendments

| Version | Summary |
|---------|---------|
| **v1.1** | First-class **Discovered Printer** normative model; explicit separation of **Observation** from **Administrative Intent**; discovery lifecycle; comparison with Registered Printer; normative discovery rules |
| **v1.0** | Printer Catalog SSOT, lifecycle, delete contract, read purity, legacy selection retirement |

---

## Context

ADR-ARCH-016 defines distributed printing topology: cloud orchestration, RLC execution, Connector Session SSOT for connectivity, and the canonical print execution path.

Investigations **PRINT-CONNECTOR-ONBOARDING-1** and **PRINT-CONNECTOR-ONBOARDING-1A** established that **Printer Catalog lifecycle ownership is not constitutionally defined**. Ambiguity exists between:

- Cloud printer catalog persistence (`restaurant_printers`)
- Legacy connector selection persistence (`print_connector_selections`)
- Read-path migration that mutates catalog during queries
- Asymmetric delete semantics that permit deleted printers to reappear

ADR-ARCH-016 assigns Printing Service job authority and RLC execution boundaries but does **not** define catalog domain rules, delete contracts, selection authority, or read purity.

This ADR is required before any implementation program may correct catalog lifecycle behavior.

---

## Decision

Adopt a **single-authority Printer Catalog** owned exclusively by **Cloud Printer Management**, with **ephemeral discovery**, **derived selection**, **pure reads**, and **explicit provisioning** as the only path from discovery to registration.

The Printer Domain SHALL explicitly separate **Observation** (what RLC sees) from **Administrative Intent** (what operators register and authorize). **Discovered Printer** is a first-class domain concept governing Observation. It is **not** a Registered Printer and **not** part of the Printer Catalog.

---

## 1. Domain Model

The Printer Catalog domain SHALL comprise the following concepts. Each concept is distinct and MUST NOT be conflated.

### 1.1 Discovered Printer (Normative)

#### Definition

A **Discovered Printer** represents an **observation** made by a Restaurant Local Connector (RLC) during runtime.

It represents the **current physical printer inventory** visible to that connector at the time of discovery — the set of devices the RLC can enumerate on the restaurant host through its platform adapter (OS spooler, device APIs, or approved simulation in non-production test contexts per ADR-ARCH-016 Rule 21).

A Discovered Printer **SHALL NOT** imply that the printer has been registered, provisioned, selected, or approved for production use.

A Discovered Printer is a **first-class domain concept**. It is **not** a Registered Printer. It is **not** part of the Printer Catalog.

#### Characteristics

A Discovered Printer is:

| Characteristic | Meaning |
|----------------|---------|
| **Ephemeral** | Exists only for the duration of a discovery operation and its immediate read projection. It has no durable cloud lifecycle. The next discovery cycle MAY return a different set, order, or metadata. |
| **Connector-scoped** | Produced by a specific RLC instance executing platform discovery on a specific restaurant host. Discovery reflects that connector's view of local devices, not a global or tenant-wide inventory. |
| **Runtime-generated** | Materialized at discovery time from live host inspection. It is not loaded from catalog persistence and not reconstructed from historical registration rows. |
| **Read-only** | Discovery and presentation of Discovered Printers MUST NOT mutate Printer Catalog persistence, selection state, or registration lifecycle. |
| **Non-persistent as a catalog entity** | Discovered Printers MUST NOT be stored in `restaurant_printers` or any parallel catalog table. Caching for performance MAY exist only as non-authoritative, TTL-bound read optimization that MUST NOT affect catalog truth. |
| **Replaceable by subsequent discovery cycles** | Any Discovered Printer observation MAY be superseded, omitted, or revised by the next discovery without administrative action. Prior observations confer no entitlement to catalog presence. |

#### Ownership

| Component | Discovery ownership |
|-----------|---------------------|
| **Restaurant Local Connector (RLC)** | **SHALL** own discovery execution. Only RLC platform adapters MAY enumerate host printer inventory. |
| **Printer Catalog** | **SHALL NOT** own discovery. The catalog records administrative registrations only. |
| **Cloud Printer Management** | **MAY** present discovery results to operators via read APIs; **SHALL NOT** treat presentation as registration. |
| **Connector Gateway** | **SHALL** route discovery commands only; **SHALL NOT** persist discovery results as catalog entries. |

Discovery results **SHALL NOT** become catalog entries automatically.

#### Discovery lifecycle

The Discovered Printer lifecycle is **independent** from Printer Registration. It governs observation visibility only.

```
Not Visible
    ↓  (device attached / driver installed / RLC online)
Discovered
    ↓  (subsequent discovery — metadata or availability change)
Updated
    ↓  (device unplugged / driver removed / offline / RLC cannot see)
Lost
    ↓  (device returns to host inventory)
Rediscovered
```

| State | Meaning |
|-------|---------|
| **Not Visible** | Physical device not present in RLC discovery output (connector offline, device absent, or OS enumeration empty). |
| **Discovered** | Device appears in a discovery snapshot for the first time in the current observation window. |
| **Updated** | Same `printerId` reappears with changed metadata (name, online flag, transport classification) in a later discovery cycle. |
| **Lost** | Device no longer appears in discovery output though it MAY still exist physically. |
| **Rediscovered** | Previously lost device appears again in a later discovery snapshot. |

Transitions in this lifecycle **SHALL NOT** create, update, or delete Registered Printers.

#### Relationship with Registered Printer

| Dimension | Discovered Printer | Registered Printer |
|-----------|-------------------|------------------|
| **Purpose** | Report what RLC currently sees on the host | Record operator-authorized printer configuration for a restaurant |
| **Owner** | RLC (execution); cloud (presentation) | Cloud Printer Management / Printer Catalog |
| **Lifetime** | Ephemeral per discovery cycle | Durable until explicit delete or tenant cascade |
| **Persistence** | **None** as catalog entity | `restaurant_printers` (cloud) |
| **Identity** | Connector-scoped `printerId` from platform adapter | Same `printerId` namespace, bound to `restaurantId` at registration |
| **Tenant ownership** | Observation is scoped by routed `restaurantId` on the connector session; not a catalog row | Explicit `restaurantId` on catalog row |
| **Runtime scope** | Single RLC host inventory snapshot | Tenant-wide configured device record |
| **Can print?** | **No** — not authorized for production print until Registered and invoked via catalog-backed command | **Yes** — when active, default or explicitly targeted, and RLC reports ready |
| **Can be deleted?** | **N/A** — observations are not deleted; they cease to appear when lost | **Yes** — via `removePrinter` (catalog deactivate) |
| **Can become default?** | **SHALL NOT** | **Yes** — via `setDefaultPrinter` or provision with `setAsDefault` |
| **Can appear without provisioning?** | **SHALL** — whenever host inventory includes the device | **SHALL NOT** — requires explicit `provisionPrinter` |

#### Normative rules — Discovered Printer

| Rule | Statement |
|------|-----------|
| **DISC-1** | A Discovered Printer **SHALL NOT** automatically create a Printer Catalog entry. |
| **DISC-2** | Discovery **SHALL NOT** mutate Printer Catalog persistence. |
| **DISC-3** | Removing a Registered Printer **SHALL NOT** affect discovery results — the physical device **MAY** still appear as Discovered. |
| **DISC-4** | Rediscovery **SHALL NOT** restore deleted registrations. |
| **DISC-5** | Provisioning **SHALL** be the only transition from Discovered Printer to Registered Printer. |
| **DISC-6** | A Discovered Printer **SHALL NOT** be treated as selected, default, or operational. |
| **DISC-7** | Cloud read APIs **MAY** return Discovered Printers; **SHALL NOT** persist them as Registered Printers. |
| **DISC-8** | Diagnostics **MAY** compare Discovered Printers to Registered Printers read-only; **SHALL NOT** reconcile catalog from discovery. |

#### Architecture diagram — Observation to Administrative Intent

```
Physical Printer
        ↓
Restaurant Local Connector
  (platform discovery)
        ↓
Discovered Printer
  (Ephemeral Observation)
        ↓
Provision
  (Explicit Administrative Action)
        ↓
Registered Printer
  (Persistent Catalog Entity)
        ↓
Default Selection
  (Catalog-derived)
        ↓
Operational Printing
  (Gateway → RLC → OS)
```

**Observation** ends at Discovered Printer. **Administrative Intent** begins at Provision.

### 1.2 Registered Printer

A **Registered Printer** is an operator-authorized printer entry in the **Printer Catalog** for a `restaurantId`.

| Attribute | Rule |
|-----------|------|
| Identity | `printerId` (immutable once registered) |
| Persistence | Cloud Printer Catalog store |
| Metadata | `displayName`, `platform`, `transport`, `capabilities` snapshot, `lastValidatedAt`, `isActive` |
| Tenant scope | Exactly one `restaurantId` per row |

Registration is an **explicit administrative act**. Discovery alone MUST NOT create a Registered Printer.

### 1.3 Selected Printer

A **Selected Printer** is the Registered Printer designated for operational print commands when no explicit `printerId` override is supplied.

| Attribute | Rule |
|-----------|------|
| Definition | **Derived** from the Default Printer (§1.4) |
| Persistence | **SHALL NOT** have independent persistence authority |
| Resolution | `PrinterManagementService` reads catalog; Printing commands MAY carry explicit `printerId` |

**Selected Printer** is a runtime resolution concept, not a separate store.

### 1.4 Default Printer

The **Default Printer** is the single active Registered Printer marked as the restaurant's primary configured device.

| Attribute | Rule |
|-----------|------|
| Cardinality | Exactly **one** default per `restaurantId` among active registrations |
| Persistence | `isDefault = true` on exactly one active catalog row |
| Mutation | Only via Printer Management commands (`provisionPrinter`, `setDefaultPrinter`) |

### 1.5 Printer Catalog

The **Printer Catalog** is the cloud-side, tenant-scoped registry of Registered Printers for a restaurant.

| Attribute | Rule |
|-----------|------|
| SSOT | Cloud relational persistence (`restaurant_printers`) |
| Scope | Configured printers only — not discovery cache |
| Cardinality | Zero or more active Registered Printers per restaurant |

### 1.6 Printer Discovery

**Printer Discovery** is the infrastructure operation by which RLC enumerates devices available on the restaurant host OS and returns **Discovered Printers** (§1.1).

| Attribute | Rule |
|-----------|------|
| Executor | RLC `PlatformAdapter` only |
| Consumer | Cloud read APIs and provisioning UI |
| Output | Ephemeral list of Discovered Printers (§1.1) |
| Side effects | **SHALL NOT** mutate Printer Catalog |

### 1.7 Printer Provisioning

**Printer Provisioning** is the administrative command that creates or updates a Registered Printer from a Discovered Printer identity.

| Attribute | Rule |
|-----------|------|
| Initiator | Authorized operator via Printer Management |
| Preconditions | Valid `restaurantId`, known `printerId` from discovery or prior registration |
| Effects | Catalog INSERT/UPDATE; optional default assignment; capability snapshot; RLC sync command |
| Idempotency | Re-provisioning the same `printerId` updates metadata; MUST respect delete state (§5) |

---

## 2. Ownership

Every concept MUST have exactly one owning component. Shared write authority is forbidden.

| Concern | Owner | Responsibilities |
|---------|-------|------------------|
| **Printer Catalog** | **Cloud `PrinterManagementService`** | Registration, rename, delete, default assignment, catalog reads |
| **Printer Registration** | **Cloud `PrinterManagementService`** | `provisionPrinter`, lifecycle transitions to Registered |
| **Default Selection** | **Cloud Printer Catalog** (`isDefault` on active rows) | Orchestrated by `PrinterManagementService`; no secondary store |
| **Discovery Results** | **RLC** (execution) · **Cloud** (presentation) | RLC discovers; cloud returns read projection; neither persists discovery |
| **Runtime Status** | **RLC** (probe) · **Cloud** (presentation) | Live `PrinterStatus` per request; not catalog SSOT |

### 2.1 Non-owners (explicit exclusions)

| Component | MUST NOT own |
|-----------|--------------|
| **Connector Gateway** | Catalog rows, default printer, registration lifecycle |
| **Connector Session** | Catalog rows, printer selection persistence |
| **RLC** | Catalog SSOT, business registration state, cross-request discovery cache as SSOT |
| **Printing Service** | Printer catalog (jobs MAY reference `printerId`; catalog is Printer Management domain) |
| **Browser / UI** | Any printer persistence |
| **`print_connector_selections`** | **Retired** — MUST NOT remain persistence authority (§10) |

---

## 3. Single Source of Truth

No concept MAY have dual persistence authority.

| Concept | Canonical persistence | Read path | Write path |
|---------|----------------------|-----------|------------|
| **Printer Catalog** | `restaurant_printers` (active rows: `isActive = true`) | `listPrinters`, `getCurrentPrinter`, diagnostics | `provisionPrinter`, `removePrinter`, `renamePrinter`, `setDefaultPrinter` |
| **Default Printer** | `restaurant_printers.isDefault` where `isActive = true` | `getCurrentPrinter` | `setDefaultPrinter`, `provisionPrinter` (when `setAsDefault`) |
| **Discovery** | **None** | `discoverPrinters` | **None** |
| **Runtime status** | **None** (live probe) | `getStatus`, `getPrinterCapabilities` via gateway → RLC | **None** |
| **Selection** | **Derived** from Default Printer | `getCurrentPrinter` | **None** (derived only) |
| **Capabilities snapshot** | `restaurant_printers.capabilitiesJson` | Catalog row | `provisionPrinter` only |

### Rule SSOT-1 — One catalog authority

The `restaurant_printers` table SHALL be the **only** cloud persistence authority for Registered Printers.

### Rule SSOT-2 — No parallel selection store

No table, cache, or connector integration store SHALL act as co-equal SSOT for selected or default printer. Legacy `print_connector_selections` SHALL be retired (§10).

### Rule SSOT-3 — RLC execution context

RLC MAY hold ephemeral in-process state for the current print command. Such state MUST be treated as **runtime cache**, reconciled from cloud commands, and MUST NOT survive as catalog authority.

---

## 4. Lifecycle

The official Printer Catalog lifecycle SHALL follow these states and transitions.

### 4.1 States

| State | Meaning |
|-------|---------|
| **Undiscovered** | No discovery query has returned devices (or connector offline) |
| **Discovered** | Device appears in ephemeral discovery snapshot |
| **Registered** | Active catalog row exists (`isActive = true`) |
| **Default** | Registered printer with `isDefault = true` |
| **Operational** | Default (or explicit) printer used for print/test commands |
| **Inactive** | Soft-deleted catalog row (`isActive = false`) — not visible in operator lists |
| **Unavailable** | Registered but RLC reports offline/not ready (status only; catalog unchanged) |

### 4.2 Transition diagram

```
                    ┌─────────────┐
                    │ Undiscovered │
                    └──────┬──────┘
                           │ discoverPrinters (RLC)
                           ▼
                    ┌─────────────┐
         ┌─────────│  Discovered  │─────────┐
         │         └──────┬──────┘         │
         │                  │ provisionPrinter (explicit)
         │                  ▼                │ (no auto-transition)
         │         ┌─────────────┐          │
         │         │ Registered  │◄─────────┘ rediscover only
         │         └──────┬──────┘
         │                  │ setDefault / provision with setAsDefault
         │                  ▼
         │         ┌─────────────┐
         │         │   Default   │
         │         └──────┬──────┘
         │                  │ testPrint / print commands
         │                  ▼
         │         ┌─────────────┐
         │         │ Operational │ (runtime — not persisted)
         │         └─────────────┘
         │
         │ removePrinter
         ▼
  ┌─────────────┐       reprovisionPrinter (explicit operator)
  │  Inactive   │──────────────────────────────────► Registered
  └─────────────┘

  Registered ──(RLC status probe)──► Unavailable (catalog row retained)
```

### 4.3 Transition definitions

| Transition | Trigger | Actor | Catalog effect | Other effects |
|------------|---------|-------|----------------|---------------|
| **Discovery** | `discoverPrinters` | Operator/UI | **None** | Ephemeral Discovered Printer list returned |
| **Provision** | `provisionPrinter` | Operator | INSERT or UPDATE active row; snapshot capabilities | MAY assign default; SHALL sync RLC via gateway `selectPrinter` command |
| **Default assignment** | `setDefaultPrinter` or provision with `setAsDefault` | Operator | Exactly one `isDefault = true` among active rows | SHALL sync RLC execution target |
| **Operational use** | Print / test print | Operator or Printing Service | MAY update `lastValidatedAt` on success | Gateway → RLC execute |
| **Delete** | `removePrinter` | Operator | `isActive = false`; clear `isDefault` on deleted row; promote next default if required | §5 |
| **Rediscovery** | `discoverPrinters` after delete | Operator/UI | **None** | Same `printerId` MAY appear as Discovered only |
| **Reprovision** | `provisionPrinter` after delete | Operator | **New** active row or reactivation per §5–§6 | Explicit only |

### Rule LC-1 — No automatic registration

Discovery MUST NOT transition Discovered → Registered without an explicit provision command.

### Rule LC-2 — Delete is catalog authority

Inactive rows remain for audit/history but MUST NOT appear in operator catalog reads and MUST NOT be selected.

---

## 5. Delete Contract

### 5.1 Definition

**Delete** (operator action: `removePrinter`) SHALL mean:

| Effect | Required |
|--------|----------|
| **Unregister from active catalog** | Set `isActive = false` |
| **Revoke default** | If deleted printer was default, clear its `isDefault` and promote another active printer if any exist |
| **Hide from operator surfaces** | Active catalog reads MUST exclude inactive rows |
| **Forget selection** | Derived selection MUST NOT resolve to inactive printers |
| **Prohibit auto-restore** | No read path, migration, or discovery path MAY reactivate without explicit reprovision |

Delete is a **soft deactivate** (row retained for audit). Hard DELETE of catalog rows MAY be used in tenant cascade but is not the operator delete semantics.

Delete is **not**:

- Revocation of RLC connector credentials (connector domain — ADR-ARCH-016)
- Removal of physical OS printer (RLC/host domain)
- Deletion of print job history (Printing Service domain)

### 5.2 References on delete

When a printer is deleted, the system MUST:

1. Set `isActive = false` on the catalog row.
2. Clear `isDefault` on that row.
3. Reassign default to the next eligible active printer if one exists.
4. Ensure `getCurrentPrinter` returns `configured: false` if no active default remains.
5. **NOT** restore the printer from any legacy store, cache, or migration path.

### 5.3 Automatic restoration

Deleted printers **SHALL NOT** be automatically restored.

| Mechanism | Permitted after delete |
|-----------|------------------------|
| Discovery lists device | **Yes** — Discovered only |
| Read-path migration | **No** |
| Selection fallback | **No** |
| Upsert without explicit provision | **No** |
| Operator `provisionPrinter` | **Yes** — explicit reprovision (§6) |

### Rule DEL-1 — Coordinated delete

Delete MUST be atomic at the catalog orchestration layer: inactive row + default reassignment in one command boundary.

### Rule DEL-2 — No orphan operational selection

After delete, no operational API MAY report the deleted printer as configured or selected.

---

## 6. Rediscovery Policy

When discovery later observes the same physical device (same `printerId`) after delete or while inactive:

| Behavior | Rule |
|----------|------|
| Appear in discovery results | **SHALL** — if device exists on host |
| Auto-register | **SHALL NOT** |
| Auto-reactivate inactive row | **SHALL NOT** |
| Require explicit provisioning | **SHALL** — operator MUST run `provisionPrinter` to return to Registered |

### Rule RED-1 — Discovery is not reconciliation

Discovery MUST NOT synchronize, merge, or repair the Printer Catalog.

### Rule RED-2 — Reprovision is explicit

Reprovision of a previously deleted `printerId` is permitted only via `provisionPrinter` and MUST be an auditable operator action.

### Rule RED-3 — Identity stability

`printerId` for a given physical device SHOULD remain stable across discovery runs on the same platform. Catalog history for that `printerId` MAY exist as inactive rows; reprovision MUST define whether to reactivate the inactive row or create audit policy — implementation programs MUST choose one model, but automatic reactivation via reads is forbidden.

---

## 7. Selection Contract

### 7.1 Nature of selection

Printer selection SHALL be **derived state**, not independent configuration persistence.

| Classification | Applies |
|----------------|---------|
| Configuration | **No** — configuration is the Printer Catalog |
| Reference | **Yes** — references a Registered Printer `printerId` |
| Derived state | **Yes** — resolved from Default Printer |
| Persistence authority | **No** |

### 7.2 Explicit rules

| Question | Answer |
|----------|--------|
| Can selection create catalog entries? | **SHALL NOT** |
| Can selection reactivate deleted printers? | **SHALL NOT** |
| Can selection override delete? | **SHALL NOT** |
| Where is selection resolved? | `getCurrentPrinter` reads active default from catalog only |

### 7.3 RLC sync

When default changes, `PrinterManagementService` SHALL issue an RLC sync command (`selectPrinter` via gateway) so the connector runtime targets the correct device for commands that rely on local selection cache. RLC cache is **downstream of catalog**, not authoritative.

### Rule SEL-1 — Catalog precedes selection

Operational selection MUST resolve only to active Registered Printers present in the catalog.

---

## 8. Read Purity

### 8.1 Architectural rules

| Rule | Requirement |
|------|-------------|
| **RP-1** | Query APIs (`getCurrentPrinter`, `listPrinters`, `discoverPrinters`, diagnostics reads) **SHALL NOT** mutate persistence |
| **RP-2** | Read services and read models **SHALL NOT** execute migration, backfill, or repair logic |
| **RP-3** | Legacy data migration **SHALL** execute via explicit commands, batch jobs, or one-time migration programs — **never** inside query handlers |
| **RP-4** | Side-effecting reads are **architecturally forbidden** |

### 8.2 Permitted read composition

`getCurrentPrinter` MAY compose:

1. Active default from Printer Catalog (pure read)
2. Live status from RLC via gateway (pure read)

It MUST NOT write catalog rows, reactivate inactive printers, or consult retired selection stores.

### 8.3 Observability reads

Diagnostics MAY compare catalog entries to live discovery **read-only**. Mismatches are reported to operators; they do not trigger catalog mutation.

---

## 9. Domain Invariants

The following invariants are **mandatory** for all implementations governed by this ADR.

| ID | Invariant |
|----|-----------|
| **INV-PC-01** | Discovery **never** mutates Printer Catalog |
| **INV-PC-02** | Exactly one active default printer per `restaurantId` (or zero if none registered) |
| **INV-PC-03** | Selected printer MUST exist as an active Registered Printer in the catalog |
| **INV-PC-04** | Deleted (inactive) printers **cannot** be selected or reported as configured |
| **INV-PC-05** | Read APIs are side-effect free |
| **INV-PC-06** | Registered `printerId` is immutable for the life of a catalog row |
| **INV-PC-07** | No dual persistence authority for catalog or selection |
| **INV-PC-08** | Provision is the only path from Discovered to Registered |
| **INV-PC-09** | Delete is durable until explicit reprovision |
| **INV-PC-10** | Tenant isolation: all catalog operations scoped by `restaurantId` |
| **INV-PC-11** | `listPrinters` returns only `isActive = true` rows unless an explicit admin audit API is used |
| **INV-PC-12** | Printing commands with explicit `printerId` MUST reference an active catalog row or fail canonically |
| **INV-PC-13** | Capability snapshots are catalog-owned; live capabilities MAY differ and are reported separately |
| **INV-PC-14** | Legacy selection stores MUST NOT participate in runtime selection resolution after retirement |
| **INV-PC-15** | A Discovered Printer is not a Registered Printer and MUST NOT be persisted as catalog state |
| **INV-PC-16** | Discovery lifecycle transitions MUST NOT mutate registration lifecycle |
| **INV-PC-17** | Rediscovery MUST NOT imply reprovision or restoration of inactive catalog rows |

---

## 10. Migration Strategy

### 10.1 Decision — retire `print_connector_selections`

Legacy table `print_connector_selections` SHALL be **retired** as persistence authority.

| Phase | Action |
|-------|--------|
| **M-1** | One-time **offline or explicit migration job** copies any unmigrated rows into `restaurant_printers` where no active catalog entry exists |
| **M-2** | Remove read-path migration from `getCurrentPrinter` and all query handlers |
| **M-3** | Stop writing `print_connector_selections` on provision/default change |
| **M-4** | Deprecate table (stop reads); drop in later schema program after verification |

### 10.2 What migration is NOT

| Forbidden | Reason |
|-----------|--------|
| Query-time migration | Violates read purity (§8) |
| Permanent dual-write | Violates SSOT (§3) |
| Selection as fallback SSOT | Violates selection contract (§7) |

### 10.3 Backward compatibility

Backward compatibility with legacy selection rows is acceptable **only** during bounded migration window M-1, executed outside query paths. After M-2, legacy rows MUST NOT affect runtime behavior.

### Rule MIG-1

No production query handler MAY read `print_connector_selections` after migration program completion.

---

## 11. Consequences

### 11.1 Positive

- Single, explicit Printer Catalog authority suitable for enterprise multi-tenant operations
- Delete semantics become predictable and durable
- Read purity enables safe caching, polling, and observability
- Clear separation: discovery (ephemeral) vs catalog (configured) vs status (live)
- Aligns with ADR-ARCH-016 cloud orchestration / RLC execution split
- Eliminates class of bugs where deleted printers reappear via migration

### 11.2 Trade-offs

- One-time migration effort to retire `print_connector_selections`
- Reprovision required after delete — operators cannot rely on automatic rediscovery registration
- Implementation programs must remove convenience migration paths
- RLC local selection cache must be explicitly synced from catalog commands

### 11.3 Migration implications

- `PrinterManagementService.getCurrentPrinter` MUST be refactored to pure read
- `provisionPrinter` / `setDefaultPrinter` MUST stop dual-writing legacy selection table
- Architecture guard tests SHOULD enforce no query-path writes to catalog
- Data migration script for unmigrated restaurants before cutover

### 11.4 Operational implications

- Operators see consistent catalog after delete across refresh and workspaces
- Diagnostics explicitly compare catalog vs discovery without hidden repair
- Audit trail preserved via inactive catalog rows
- Support playbooks: "remove printer" vs "re-provision printer" become distinct documented operations

---

## Relationship to ADR-ARCH-016

ADR-ARCH-016 governs **distributed print execution topology**. ADR-ARCH-017 governs **Printer Catalog domain ownership and lifecycle** within that topology.

| ADR-ARCH-016 | ADR-ARCH-017 |
|--------------|--------------|
| RLC executes discovery | Discovery results are ephemeral |
| Cloud holds orchestration | Cloud owns Printer Catalog SSOT |
| Gateway routes commands | Gateway does not own catalog |
| Printing Service owns jobs | Jobs reference `printerId`; catalog owned by Printer Management |

Neither ADR supersedes the other. Implementation programs MUST satisfy both.

---

## Related Programs

| Program | Role |
|---------|------|
| PRINT-CONNECTOR-ONBOARDING-1 | Investigation — simulated printer reappearance |
| PRINT-CONNECTOR-ONBOARDING-1A | Investigation — catalog lifecycle |
| **PRINT-PRINTER-CATALOG-1** (expected) | Implementation — catalog SSOT, delete contract, read purity, legacy retirement |
| PRINT-ARCHITECTURE-2 | Superseded informal catalog guidance |
| PRINT-UX-1 / PRINT-UX-2 | UX surfaces consuming catalog reads |
| ADR-ARCH-016 programs | Execution path unchanged |

---

## Related ADRs

- [ADR-ARCH-016](./ADR-ARCH-016.md) — Distributed Printing Topology
- [ADR-ARCH-002](./ADR-ARCH-002.md) — Single Source of Truth
- [ADR-ARCH-012](./ADR-ARCH-012.md) — Printing as event consumer

---

## Governance

**ADR-ARCH-017 is normative for Printer Catalog ownership and lifecycle.**

Implementation programs MUST NOT:

- Introduce secondary catalog or selection persistence authority
- Perform catalog mutation inside query handlers
- Auto-register printers from discovery
- Auto-restore deleted printers

Amendments require Architecture Authority approval.

---

## Executive Summary

ADR-ARCH-017 defines **Printer Catalog ownership and lifecycle** for MineuQR distributed printing. Version **1.1** makes the domain model unambiguous by elevating **Discovered Printer** to a **first-class normative concept**.

### Observation versus Administrative Intent

The Printer Domain SHALL separate two concerns that MUST NOT be conflated:

| Concern | Concept | Nature |
|---------|---------|--------|
| **Observation** | **Discovered Printer** | Ephemeral RLC runtime inventory — what the connector sees on the restaurant host right now |
| **Administrative Intent** | **Registered Printer** | Persistent cloud catalog entry — what an authorized operator has registered and approved |

**Observation** answers: *"What printers exist on the restaurant computer?"*  
**Administrative Intent** answers: *"Which printers is this restaurant configured to use?"*

Only **Provision** — an explicit administrative action — MAY bridge Observation to Administrative Intent.

### What this prevents

Without this separation, implementations drift toward:

- Treating discovery lists as implicit catalog mutations
- Auto-restoring deleted printers when rediscovered
- Dual persistence authorities (`restaurant_printers` vs legacy selection stores)
- Side-effecting reads that register printers during queries

ADR-ARCH-017 v1.1 forbids these patterns normatively.

### Constitutional scope

- **Printer Catalog** — cloud SSOT (`restaurant_printers`), pure reads, coordinated delete
- **Discovered Printer** — RLC-owned, ephemeral, non-catalog, independent lifecycle
- **Selection** — derived from catalog default, not independent persistence
- **Legacy `print_connector_selections`** — retired as authority

ADR-ARCH-016 governs execution topology; ADR-ARCH-017 governs catalog and observation semantics. Both MUST be satisfied.

### Implementation expectation

**PRINT-PRINTER-CATALOG-1** (expected) SHALL realize this ADR, including v1.1 Discovered Printer rules, before Printer Catalog lifecycle is considered production-ready.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)

**Investigation traceability:** `docs/engineering/programs/PRINT-CONNECTOR-ONBOARDING-1/`
