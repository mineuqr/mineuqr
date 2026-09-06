# Capability Ownership Matrix

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Rule:** Exactly one Architectural Owner per capability. Bounded context = primary ownership boundary.

| ID | Capability | Architectural Owner | Aggregate Owner | Bounded Context | Boundary Notes |
|----|------------|---------------------|-----------------|-----------------|----------------|
| CAP-01 | Order Write | Order Platform | Order AR | Order | Sole order write authority |
| CAP-02 | Order Read | Order Platform | Projections | Order Read | Derived from CAP-01 |
| CAP-03 | Ordering Platform | Ordering Platform | Channel contracts | Ordering Runtime | Does not own Order AR |
| CAP-04 | Ordering Client | Ordering Client | None | Ordering Client | Presentation only |
| CAP-05 | Menu & Restaurant | Menu / Restaurant | Catalog entities | Menu/Restaurant | |
| CAP-06 | Table | Table Platform | Tables | Table | |
| CAP-07 | Operational Session | Session Platform | Session | Session | |
| CAP-08 | Check Management | Settlement Platform | Check AR | Settlement | Sole monetary AR |
| CAP-09 | Order Settlement | Settlement Platform | Check | Settlement | Specialization |
| CAP-10 | Split Payment | Settlement Platform | Check | Settlement | Payment ≠ AR |
| CAP-11 | Multi-Check Allocation | Settlement Platform | Check | Settlement | Allocation ≠ AR |
| CAP-12 | Settlement Record | Settlement Platform | Publication (Check writes) | Settlement | |
| CAP-13 | Refund | Settlement Platform | Check | Settlement | |
| CAP-15 | Document Identity | Cross-cutting Standard | None | Document Identity | Shared; not domain AR |
| CAP-16 | CRMP Register | Register Platform | Register | Register | Custody ≠ money |
| CAP-17 | Financial Shift | Register Platform | Financial Shift | Register | |
| CAP-19 | Commercial Catalog | Commercial Catalog | Catalog aggregates | Commercial Catalog | |
| CAP-20 | Snapshot Authority | Subscription / Commercial | Bound Snapshot | Subscription Runtime | |
| CAP-21 | Subscription | Subscription Platform | Subscription records | Subscription | |
| CAP-22 | Reporting | Reporting Platform | None (KPI) | Reporting | ≠ CAP-43 |
| CAP-23 | Billing Providers | Subscription / Payments | Provider txs | Billing Integration | |
| CAP-24 | Tenant Identity | Tenant Identity | Tenant graph | Tenant | |
| CAP-25 | Auth & Access | Identity / Auth | User/session | Identity | |
| CAP-26 | Kitchen Display | Kitchen Platform | None | Kitchen | |
| CAP-27 | Printing | Printing Platform | Printers/jobs | Printing | |
| CAP-28 | Realtime | Realtime Platform | Tickets/connections | Realtime | |
| CAP-29 | Device Management | Device Platform | Operational devices | Device | |
| CAP-30 | Screen Management | Device / Screen Ops | Pairing/credentials | Device/Screen | Sub-context of Device |
| CAP-31 | Waiter | Waiter Platform | None | Waiter | Must not own Order AR |
| CAP-32 | Kiosk | Ordering Client / Kiosk | None | Kiosk | Channel shell |
| CAP-33 | Counter Pickup | Order Platform (+ Ordering semantics) | Order | Order / Ordering | Dual-touch: settle owns Order; channel semantics Ordering — **primary owner = Order Platform** for settle APIs |
| CAP-34 | Notifications | Notifications | Push subs | Notifications | |
| CAP-35 | Platform Ops & Admin | Administration | None | Administration | Includes restaurant `ops` surfaces |
| CAP-36 | Audit | Observability / Security | audit_events | Observability | |
| CAP-37 | DRAP | DRAP (policy) | None | Retention | Domains own data |
| CAP-40 | Event Idempotency | Order / Event Governance | Outbox | Events | |
| CAP-41 | Media & Storage | Infrastructure / Media | Object keys | Storage | |
| CAP-42 | Country/Currency | Platform Reference | countries_currencies | Reference | |
| CAP-43 | SaaS Analytics | Admin / Commercial | Derived | Admin Analytics | ≠ CAP-22 |
| CAP-46 | Lifecycle Latency | Observability / Order | Metrics | Observability | |
| CAP-47 | Expo Workspace | Expo / Operational Screen | None | Expo | Ready transition exclusivity vs Kitchen |
| CAP-48 | Business Tax Policy | Settlement / Restaurant Config | Restaurant tax + Check snapshot | Settlement Config | Persist on Restaurant; authority at Check capture |

### OWNER UNRESOLVED

**None.**

### Boundary validation findings

| Finding | Type | Evidence | Severity |
|---------|------|----------|----------|
| CAP-33 Order settle vs Ordering channel | Shared responsibility (documented primary = Order) | StaffCounterPickup APIs under `order.*` | Accepted / documented |
| CAP-30 vs CAP-29 | Nested context | Screen pairing lives under `operational-device` | Accepted composition |
| CAP-47 vs CAP-26 | Shared UI panel; split action ownership | Kitchen and Expo share mark-ready; Kitchen cannot serve (KITCHEN-READY-ACTION-UNIFICATION-1) | Intentional specialization |
| CAP-08 vs CAP-16 | Custody vs money | CRMP fail-open attribution; Check owns money | Constitutional (not leak) |
| CAP-22 vs CAP-43 | Naming collision risk | Different routers `reporting.*` vs `analytics.*` | Controlled |
| CAP-05 `tableLabel` as “Hotel” | Marketing leak into packaging | FEATURE_KEYS hotelMode — not Discovery owner | Drift (see Legacy Mapping) |
| CAP-35 restaurant ops + platform admin | Broad admin bag | `ops` + `admin` under one CAP | Soft leak — future split optional |

### Duplicate ownership

No two Architectural Owners claim the same capability ID.  
No capability listed as OWNER UNRESOLVED.
