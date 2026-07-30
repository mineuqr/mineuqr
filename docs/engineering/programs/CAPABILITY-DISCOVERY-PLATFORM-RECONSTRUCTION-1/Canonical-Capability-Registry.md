# Canonical Capability Registry

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Authority:** Capability Discovery SSOT (reconstructed from production)  
**ID policy:** Permanent Discovery IDs `CAP-xx`. Prior PLATFORM-CAPABILITY-DISCOVERY-1 IDs retained where still production-valid. New IDs: **CAP-47**, **CAP-48**.  
**Exclusion rule:** Planned, Experimental-only, architecture-language-only, and blocked screen roles are **out of registry** (see Architecture Drift Report).

### Inclusion criteria (all must hold)

1. Production runtime code path exists outside tests  
2. Traceable API and/or UI entry (or infrastructure consumed by production paths)  
3. Single architectural owner resolvable  
4. Single primary bounded context  

---

## Registry summary

| Metric | Count |
|--------|------:|
| Canonical capabilities | **42** |
| Excluded from prior Discovery-1 (46) | **6** (CAP-14,18,38,39,44,45) |
| Newly first-classed | **2** (CAP-47 Expo, CAP-48 Tax Policy) |
| OWNER UNRESOLVED | **0** |
| Commercial Eligible (evidence) | **see Eligibility Matrix** |

---

## Master index

| ID | Name | Domain | Bounded Context | Owner | Layer | Lifecycle | Commercializable* |
|----|------|--------|-----------------|-------|-------|-----------|-------------------|
| CAP-01 | Order Platform (Write) | Orders | Order | Order Platform | Domain Write | Production | NO (internal write AR) |
| CAP-02 | Order Read Model | Orders | Order Read | Order Platform | Read Projection | Production | NO |
| CAP-03 | Ordering Platform | QR Ordering | Ordering Runtime | Ordering Platform | Application | Production | **ELIGIBLE** |
| CAP-04 | Ordering Client | QR Ordering | Ordering Client | Ordering Client | Presentation | Production | NO (presentation of CAP-03) |
| CAP-05 | Menu & Restaurant Catalog | Restaurant Settings | Menu/Restaurant | Menu / Restaurant | Domain | Production | PARTIAL† |
| CAP-06 | Table Platform | Restaurant Settings | Table | Table Platform | Domain | Production | PARTIAL† |
| CAP-07 | Operational Session | Operational Sessions | Session | Session Platform | Domain | Production | NO |
| CAP-08 | Check Management | Check Management | Settlement | Settlement Platform | Domain | Production | **ELIGIBLE** |
| CAP-09 | Order Settlement | Settlement | Settlement | Settlement Platform | Domain | Production | NO (specialization of CAP-08) |
| CAP-10 | Split Payment | Settlement | Settlement | Settlement Platform | Domain | Production | **ELIGIBLE** |
| CAP-11 | Multi-Check Allocation | Settlement | Settlement | Settlement Platform | Domain | Production | **ELIGIBLE** |
| CAP-12 | Settlement Record | Settlement | Settlement | Settlement Platform | Publication | Production | NO (document plane) |
| CAP-13 | Refund Platform | Settlement | Settlement | Settlement Platform | Domain | Production | **ELIGIBLE** |
| CAP-15 | Operational Document Identity | Platform Infrastructure | Document Identity | Cross-cutting Standard | Shared Standard | Production (partial adoption) | NO |
| CAP-16 | CRMP Register | Register | Register | Register Platform | Domain | Production | **ELIGIBLE** |
| CAP-17 | Financial Shift Lifecycle | Register | Register | Register Platform | Domain | Production | **ELIGIBLE** (with CAP-16) |
| CAP-19 | Commercial Catalog | Commercial Platform | Commercial Catalog | Commercial Catalog | Domain | Production | NO (defines packages) |
| CAP-20 | Snapshot Entitlement Authority | Commercial Platform | Subscription Runtime | Subscription / Commercial | Runtime Authority | Production | NO (enforcement plane) |
| CAP-21 | Subscription Platform | Commercial Platform | Subscription | Subscription Platform | Application | Production | NO |
| CAP-22 | Reporting Platform | Reporting | Reporting | Reporting Platform | Application | Production | **ELIGIBLE** |
| CAP-23 | SaaS Billing Providers | Commercial Platform | Billing Integration | Subscription / Payments | Integration | Production | NO |
| CAP-24 | Tenant Identity | Authentication | Tenant | Tenant Identity | Domain | Production | NO |
| CAP-25 | Auth & Access Control | Authorization | Identity | Identity / Auth | Infrastructure | Production | NO |
| CAP-26 | Kitchen Display | Kitchen | Kitchen | Kitchen Platform | Read / Ops UI | Production | **ELIGIBLE** |
| CAP-27 | Printing Platform | Printing | Printing | Printing Platform | Domain + Integration | Production | **ELIGIBLE** |
| CAP-28 | Realtime Platform | Realtime | Realtime | Realtime Platform | Infrastructure | Production | **ELIGIBLE** |
| CAP-29 | Device Management | Device Management | Device | Device Platform | Domain | Production | **ELIGIBLE** |
| CAP-30 | Screen Management & Pairing | Screen Management | Device/Screen | Device / Screen Ops | Application | Production | **ELIGIBLE** (with CAP-29) |
| CAP-31 | Waiter Ordering | Waiter | Waiter | Waiter Platform | Presentation + API | Production | **ELIGIBLE** |
| CAP-32 | Self-Ordering Kiosk | Self Ordering Kiosk | Kiosk | Ordering Client / Kiosk | Presentation | Production | **ELIGIBLE** |
| CAP-33 | Counter Pickup Settlement | Pickup | Ordering / Order | Order + Ordering | Application | Production | **ELIGIBLE** |
| CAP-34 | Customer Notifications & Push | Notifications | Notifications | Notifications | Integration | Production | PARTIAL† |
| CAP-35 | Platform Ops & Admin | Platform Infrastructure | Administration | Administration | Presentation + API | Production | NO |
| CAP-36 | Audit & Ops Taxonomy | Platform Infrastructure | Observability | Observability / Security | Infrastructure | Production | NO |
| CAP-37 | Data Retention (DRAP) | Platform Infrastructure | Retention | DRAP (policy) | Shared Policy | Production (partial) | NO |
| CAP-40 | Event Delivery & Idempotency | Platform Infrastructure | Events | Order / Event Governance | Infrastructure | Production | NO |
| CAP-41 | Media & Object Storage | Storage / Media | Storage | Infrastructure / Media | Infrastructure | Production | NO (limit surface only) |
| CAP-42 | Country & Currency Reference | Commercial Platform | Reference Data | Platform Reference | Reference | Production | NO |
| CAP-43 | Commercial / SaaS Analytics | Analytics | Admin Analytics | Admin / Commercial | Application | Production | NO |
| CAP-46 | Order Lifecycle Latency | Platform Infrastructure | Observability | Observability / Order | Instrumentation | Production | NO |
| CAP-47 | Expo Display Workspace | Expo | Kitchen/Screen Ops | Expo / Operational Screen | Ops UI | Production | **ELIGIBLE** |
| CAP-48 | Business Tax Policy | Tax Policy | Settlement Config | Settlement / Restaurant Config | Domain Config | Production | NO |

\* Commercializable column = Discovery commercial **eligibility class** (derived). Final Plan toggles require Commercial Projection program.  
† PARTIAL = production product exists; standalone sellable boundary unclear or flags-only history.

---

## Capability records

Field schema for every capability:

`ID · Name · Domain · Subdomain · Architectural Owner · Aggregate Owner · Platform Layer · Description · Dependencies · Runtime · UI · API · Permissions · Commercializable · Production Status · Lifecycle`

---

### CAP-01 — Order Platform (Write Aggregate)

| Field | Value |
|-------|-------|
| Domain / Subdomain | Orders / Write Aggregate |
| Architectural Owner | **Order Platform** |
| Aggregate Owner | Order (`server/order/domain/aggregate`) |
| Platform Layer | Domain Write |
| Description | Authoritative order lifecycle write: place, advance, cancel/complete; outbox domain events |
| Dependencies | CAP-05 (catalog facts), CAP-24/25 (tenant), CAP-07 optional, CAP-03 channel context |
| Runtime | `PlaceOrderService`, `AdvanceOrderStatusService`, identity/waiter place paths |
| UI | Orders Workspace (`OrdersWorkspacePanel`), Dashboard orders |
| API | `order.create`, `placeWithIdentity`, `placeAsWaiter`, `updateStatus`, `list`, `getById`, `settlePaid`, … |
| Permissions | Staff/owner restaurant access; guest paths via public ordering + entitlement |
| Commercializable | **NOT COMMERCIAL READY** (AR; sold via CAP-03 channel packaging) |
| Status / Lifecycle | Production · Stable |

### CAP-02 — Order Read Model

| Field | Value |
|-------|-------|
| Domain / Subdomain | Orders / Read Projections |
| Architectural Owner | **Order Platform** (read plane) |
| Aggregate Owner | Projections (derived; write SSOT = CAP-01) |
| Platform Layer | Read Projection |
| Description | Project order events to query models for ops/tracking |
| Dependencies | CAP-01, CAP-40 |
| Runtime | `server/order/read/*`, projection consumers |
| UI | Orders workspace, operational screens |
| API | `order.read.listActive`, `getDetail`, `getTimeline`; `order.getPublicStatus` |
| Permissions | Staff restaurant; public status tokenized |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-03 — Ordering Platform (Multi-Channel Runtime)

| Field | Value |
|-------|-------|
| Domain / Subdomain | QR Ordering / Channel Runtime |
| Architectural Owner | **Ordering Platform** |
| Aggregate Owner | Channel/runtime contracts (does not own Order AR) |
| Platform Layer | Application |
| Description | Channel registry + ordering runtime materialization (QR, kiosk, waiter, counter) |
| Dependencies | CAP-01, CAP-05, CAP-06/07, CAP-20 |
| Runtime | `server/ordering-platform`, `OrderingRuntimeMaterializer`, `guestOrderingAuthority` |
| UI | `TableOrderingShell`, QR hosts under `lib/ordering-client/qr` |
| API | `ordering.getRuntimeBySlug`; place via `order.*` |
| Permissions | Public guest + `hasFeature("ordering")` on guest place |
| Commercializable | **COMMERCIAL ELIGIBLE** (Runtime+UI+API+Owner+enforcement evidence) |
| Status / Lifecycle | Production · Stable |

### CAP-04 — Ordering Client Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | QR Ordering / Client Journey |
| Architectural Owner | **Ordering Client** |
| Aggregate Owner | None (presentation) |
| Platform Layer | Presentation |
| Description | Shared browse/cart/checkout journey libraries for channel shells |
| Dependencies | CAP-03, CAP-05 |
| Runtime | Client `lib/ordering-client` |
| UI | Table / Kiosk / Waiter shells |
| API | Consumes `ordering.*` / `order.*` |
| Permissions | Channel shells |
| Commercializable | **NOT COMMERCIAL READY** (not independently sellable) |
| Status / Lifecycle | Production · Certified architecture |

### CAP-05 — Menu & Restaurant Catalog

| Field | Value |
|-------|-------|
| Domain / Subdomain | Restaurant Settings / Catalog |
| Architectural Owner | **Menu / Restaurant Platform** |
| Aggregate Owner | Restaurant-scoped catalog entities |
| Platform Layer | Domain |
| Description | Restaurant profile, categories, items, offers, holidays, branding, public menu |
| Dependencies | CAP-24, CAP-41, CAP-25 |
| Runtime | Routers `restaurant`, `category`, `menuItem`, `offer`, `holiday` |
| UI | Dashboard catalog/settings; public MenuView |
| API | `restaurant.*`, `category.*`, `menuItem.*`, `offer.*`, `holiday.*` |
| Permissions | Owner/admin restaurant access; public menu read |
| Commercializable | **NOT COMMERCIAL READY** as atomic toggles historically fragmented; core always-on product |
| Status / Lifecycle | Production · Stable |

### CAP-06 — Table Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | Restaurant Settings / Floor Tables |
| Architectural Owner | **Table Platform** |
| Aggregate Owner | `restaurant_tables` |
| Platform Layer | Domain |
| Description | Floor tables, QR association, dine-in anchors |
| Dependencies | CAP-05, CAP-07 |
| Runtime | `table` router |
| UI | Dashboard tables; floor maps |
| API | `table.*` |
| Permissions | Owner/staff |
| Commercializable | **NOT COMMERCIAL READY** standalone (QR packaging via projection later) |
| Status / Lifecycle | Production · Stable |

### CAP-07 — Operational Session

| Field | Value |
|-------|-------|
| Domain / Subdomain | Operational Sessions / Dining Session |
| Architectural Owner | **Session Platform** |
| Aggregate Owner | Dining / Operational Session |
| Platform Layer | Domain |
| Description | Session lifecycle anchoring checks and dine-in orders |
| Dependencies | CAP-06, CAP-05, CAP-01 |
| Runtime | `server/diningSession`, `server/operational-session` |
| UI | Sessions workspace, dining session sheets/banners |
| API | `session.*` |
| Permissions | Owner/staff; guest token read |
| Commercializable | **NOT COMMERCIAL READY** (internal operational AR) |
| Status / Lifecycle | Production · Stable |

### CAP-08 — Check Management & Settlement Plane

| Field | Value |
|-------|-------|
| Domain / Subdomain | Check Management / Monetary AR |
| Architectural Owner | **Settlement Platform** |
| Aggregate Owner | Check (`operational_checks`) — sole monetary AR |
| Platform Layer | Domain |
| Description | Check as revenue root; settlement commands and outstanding |
| Dependencies | CAP-07, CAP-01 membership, CAP-15, CAP-48 |
| Runtime | `CheckService`, settlement guards |
| UI | Settlement components, session settle flows |
| API | Check façades; `session.markPaid`; settlement routers |
| Permissions | Staff restaurant + settle contexts |
| Commercializable | **COMMERCIAL ELIGIBLE** (platform product; not yet in filter vocab) |
| Status / Lifecycle | Production · Stable |

### CAP-09 — Order Settlement

| Field | Value |
|-------|-------|
| Domain / Subdomain | Settlement / Order↔Check |
| Architectural Owner | **Settlement Platform** |
| Aggregate Owner | Check (order settlement entity under Check) |
| Platform Layer | Domain |
| Description | Check-owned settlement of order financial state |
| Dependencies | CAP-08, CAP-01 |
| Runtime | operational-session check settlement |
| UI | Settlement presentation |
| API | `orderSettlement.*` |
| Permissions | Staff |
| Commercializable | **NOT COMMERCIAL READY** (specialization) |
| Status / Lifecycle | Production · Stable |

### CAP-10 — Split Payment

| Field | Value |
|-------|-------|
| Domain / Subdomain | Settlement / Multi-tender |
| Architectural Owner | **Settlement Platform** |
| Aggregate Owner | Check; Payment ≠ AR |
| Platform Layer | Domain |
| Description | Multi-tender / incremental payment under Check |
| Dependencies | CAP-08 |
| Runtime | split payment services under `operational-session/check` |
| UI | Settlement presentation |
| API | `splitPayment.*` |
| Permissions | Staff |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |

### CAP-11 — Multi-Check Allocation

| Field | Value |
|-------|-------|
| Domain / Subdomain | Settlement / Cross-check |
| Architectural Owner | **Settlement Platform** |
| Aggregate Owner | Check; Allocation ≠ AR |
| Platform Layer | Domain |
| Description | Cross-check responsibility redistribution |
| Dependencies | CAP-08 |
| Runtime | multi-check allocation services |
| UI | `MultiCheckAllocationPanel` |
| API | `multiCheckAllocation.*` |
| Permissions | Staff |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |

### CAP-12 — Settlement Record

| Field | Value |
|-------|-------|
| Domain / Subdomain | Settlement / Immutable Documents |
| Architectural Owner | **Settlement Platform** |
| Aggregate Owner | Not AR; Check publishes |
| Platform Layer | Publication |
| Description | Append-only financial document publication |
| Dependencies | CAP-08, CAP-15 |
| Runtime | settlement record repository + read |
| UI | `settlement-record` presentation |
| API | `settlementRecord.*` |
| Permissions | Staff |
| Commercializable | **NOT COMMERCIAL READY** (document plane) |
| Status / Lifecycle | Production · Certified |

### CAP-13 — Refund Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | Settlement / Refund |
| Architectural Owner | **Settlement Platform** |
| Aggregate Owner | Check; Refund capability |
| Platform Layer | Domain |
| Description | Compensating settlement / refund via Check façade |
| Dependencies | CAP-08, CAP-12, CAP-16 (attribution), CAP-22 |
| Runtime | `checkRefund` + CheckService |
| UI | Refund dialogs / presentation |
| API | `checkRefund.*` |
| Permissions | Staff |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Certified |

### CAP-15 — Operational Document Identity

| Field | Value |
|-------|-------|
| Domain / Subdomain | Platform Infrastructure / Document Numbers |
| Architectural Owner | **Cross-cutting Standard** (shared module) |
| Aggregate Owner | None |
| Platform Layer | Shared Standard |
| Description | Human document identity format/registry across settlement/print |
| Dependencies | None foundational |
| Runtime | `shared/operational-document-identity`; settlement adoption |
| UI | Embedded in documents |
| API | Embedded |
| Permissions | N/A |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Partial adoption |

### CAP-16 — CRMP / Cash Register

| Field | Value |
|-------|-------|
| Domain / Subdomain | Register / Catalog & Operations |
| Architectural Owner | **Register Platform** |
| Aggregate Owner | Register entities (not monetary AR) |
| Platform Layer | Domain |
| Description | Register catalog, open/close, operator/device assign, settlement attribution (custody ≠ money) |
| Dependencies | CAP-08 publications, CAP-05/24 |
| Runtime | `server/crmp` |
| UI | Register Catalog + Register Operations panels |
| API | `crmp.catalog.*`, `crmp.register.*` |
| Permissions | Staff restaurant |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Certified |

### CAP-17 — Financial Shift Lifecycle

| Field | Value |
|-------|-------|
| Domain / Subdomain | Register / Shift |
| Architectural Owner | **Register Platform** |
| Aggregate Owner | Financial Shift |
| Platform Layer | Domain |
| Description | Open/close financial shift distinct from OpenRegister |
| Dependencies | CAP-16 |
| Runtime | `FinancialShiftDomainService`, drawer/tender |
| UI | Shift closing dialogs, tender summary, archive |
| API | `crmp.financialShift.*` |
| Permissions | Staff |
| Commercializable | **COMMERCIAL ELIGIBLE** (packaged with CAP-16) |
| Status / Lifecycle | Production · Certified |

### CAP-19 — Commercial Catalog

| Field | Value |
|-------|-------|
| Domain / Subdomain | Commercial Platform / Definitions |
| Architectural Owner | **Commercial Catalog** |
| Aggregate Owner | Plans/versions/prices/policies |
| Platform Layer | Domain |
| Description | SSOT for commercial offerings and publishing |
| Dependencies | CAP-25, CAP-42 |
| Runtime | `server/commercial-catalog`, services |
| UI | `/admin/platform/commercial-catalog` |
| API | `commercialCatalog.*` (+ publishing/public) |
| Permissions | Admin |
| Commercializable | **NOT COMMERCIAL READY** (meta-platform) |
| Status / Lifecycle | Production · Stable |

### CAP-20 — Snapshot Entitlement Authority

| Field | Value |
|-------|-------|
| Domain / Subdomain | Commercial Platform / Runtime Authority |
| Architectural Owner | **Subscription / Commercial Runtime** |
| Aggregate Owner | Bound Snapshot + subscription binding |
| Platform Layer | Runtime Authority |
| Description | Bound snapshot exclusive entitlement authority; `hasFeature`/`requireFeature`/`checkLimit` |
| Dependencies | CAP-19, CAP-21 |
| Runtime | `server/subscription-runtime`, commercial entitlement resolvers |
| UI | Feature visibility hooks |
| API | `commercial.getEntitlements`; library enforcement |
| Permissions | Tenant-scoped evaluation |
| Commercializable | **NOT COMMERCIAL READY** (enforcer, not sellable product) |
| Status / Lifecycle | Production · Certified |

### CAP-21 — Subscription Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | Commercial Platform / Lifecycle |
| Architectural Owner | **Subscription Platform** |
| Aggregate Owner | Tenant subscription records |
| Platform Layer | Application |
| Description | Subscription lifecycle, plan selection, invoices, renewals |
| Dependencies | CAP-19, CAP-20, CAP-23, CAP-25 |
| Runtime | `subscription` router, webhooks |
| UI | Billing/subscription UI; admin |
| API | `subscription.*`, `invoice.*` |
| Permissions | Owner/admin |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-22 — Reporting Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | Reporting / Restaurant KPIs |
| Architectural Owner | **Reporting Platform** |
| Aggregate Owner | None for money (presentation/KPI ownership) |
| Platform Layer | Application |
| Description | KPI dictionary, business/ops/sales metrics, exports |
| Dependencies | CAP-12, CAP-01 facts, CAP-03 channels |
| Runtime | `server/reporting-platform` |
| UI | `ReportsTab`, export libs |
| API | `reporting.*` |
| Permissions | Owner restaurant |
| Commercializable | **COMMERCIAL ELIGIBLE** (UI gates exist; API hard-gate residual) |
| Status / Lifecycle | Production · Stable |

### CAP-23 — SaaS Billing Providers

| Field | Value |
|-------|-------|
| Domain / Subdomain | Commercial Platform / Payments |
| Architectural Owner | **Subscription / Payments Integration** |
| Aggregate Owner | External provider + local rows |
| Platform Layer | Integration |
| Description | PayPal/Tap checkout + webhooks for SaaS subscriptions |
| Dependencies | CAP-21 |
| Runtime | `paypal.ts`, `tap-payments.ts`, webhook HTTP |
| UI | Checkout flows |
| API | `/api/paypal/webhook`, `/api/tap/webhook`; checkout mutations |
| Permissions | Owner checkout; webhook signed |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-24 — Tenant Identity

| Field | Value |
|-------|-------|
| Domain / Subdomain | Authentication / Tenant Graph |
| Architectural Owner | **Tenant Identity** |
| Aggregate Owner | Platform account / tenant graph |
| Platform Layer | Domain |
| Description | Org→Tenant→Restaurant ownership and classification |
| Dependencies | CAP-25 |
| Runtime | Access asserts; admin classification |
| UI | Admin tenants |
| API | `admin.*` tenant surfaces; ownership checks |
| Permissions | Admin / owner |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-25 — Auth & Access Control

| Field | Value |
|-------|-------|
| Domain / Subdomain | Authorization / AuthN+AuthZ |
| Architectural Owner | **Identity / Auth** |
| Aggregate Owner | User, sessions, roles |
| Platform Layer | Infrastructure |
| Description | Local auth, sessions, admin/owner restaurant access gates |
| Dependencies | CAP-24 |
| Runtime | `server/auth-local`, procedures |
| UI | Login/register/profile |
| API | `/api/auth/*`, `auth.*`, `profile.*` |
| Permissions | Self + admin role |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-26 — Kitchen Display

| Field | Value |
|-------|-------|
| Domain / Subdomain | Kitchen / Queue Display |
| Architectural Owner | **Kitchen Platform** |
| Aggregate Owner | None (read/consumer) |
| Platform Layer | Read / Ops UI |
| Description | Kitchen queue composition and display fulfillment view |
| Dependencies | CAP-01/02, CAP-28 optional, CAP-29/30 |
| Runtime | `server/kitchen/read/*` |
| UI | `/screen/run` KitchenScreenPanel (`kitchen_display`) |
| API | `kitchen.read.getQueue`; `operationalDevice.runtime.getKitchenQueue` |
| Permissions | Staff / device role `kitchen_display` |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |

### CAP-27 — Printing Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | Printing / Jobs + Printers + Connector |
| Architectural Owner | **Printing Platform** |
| Aggregate Owner | Printer catalog + print jobs |
| Platform Layer | Domain + Integration |
| Description | Print workspace, printer management, remote connector execution, order auto-dispatch |
| Dependencies | CAP-01, CAP-29, CAP-15 phased |
| Runtime | `server/printing`, `print-workspace`, `printer-management`, connector-* |
| UI | PrintWorkspacePanel, PrinterManagementPanel |
| API | `printWorkspace.*`, `printerManagement.*` (`printConnector` retired empty) |
| Permissions | Staff restaurant |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |

### CAP-28 — Realtime Platform

| Field | Value |
|-------|-------|
| Domain / Subdomain | Realtime / SSE + Tickets |
| Architectural Owner | **Realtime Platform** |
| Aggregate Owner | Connection/ticket runtime |
| Platform Layer | Infrastructure |
| Description | Tickets, SSE gateway, hints for live UX |
| Dependencies | CAP-25 tickets |
| Runtime | `server/realtime-platform`; `/api/realtime` |
| UI | Kitchen/Expo/customer tracking consumers; admin realtime |
| API | `realtime.*`; SSE endpoints |
| Permissions | Staff/customer opaque tickets; device mint |
| Commercializable | **COMMERCIAL ELIGIBLE** (infra product; packaging TBD) |
| Status / Lifecycle | Production · Enablement-flagged in prod |

### CAP-29 — Device Management

| Field | Value |
|-------|-------|
| Domain / Subdomain | Device Management / Fleet Registry |
| Architectural Owner | **Device Platform** |
| Aggregate Owner | Operational devices |
| Platform Layer | Domain |
| Description | Device registry, auth, pairing, heartbeat, credentials |
| Dependencies | CAP-28, CAP-24 |
| Runtime | `server/operational-device` |
| UI | `/device`, Screen Management workspace, admin devices |
| API | `operationalDevice.management.*`, `runtime.*`, `fleet.*` |
| Permissions | Owner/staff; device credentials |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable *(Discovery-1 “Development” status superseded by evidence)* |

### CAP-30 — Screen Management & Pairing

| Field | Value |
|-------|-------|
| Domain / Subdomain | Screen Management / Pairing & Fleet |
| Architectural Owner | **Device / Screen Ops** |
| Aggregate Owner | Screen credentials/pairing |
| Platform Layer | Application |
| Description | Pair operational screens; fleet KPIs; screen config |
| Dependencies | CAP-29, CAP-28, CAP-25 |
| Runtime | Pairing/fleet services under operational-device |
| UI | `/screen`, `/screen/pair`, `/screen/run`; ScreenManagementWorkspacePanel |
| API | fleet query + management pairing/config |
| Permissions | Owner/staff; device runtime |
| Commercializable | **COMMERCIAL ELIGIBLE** (with Device) |
| Status / Lifecycle | Production · Stable |

**Boundary note:** Roles `customer_display`, `pickup_display`, `print_monitor` are **registered but blocked** — **not** separate canonical capabilities (no production UI).

### CAP-31 — Waiter Ordering

| Field | Value |
|-------|-------|
| Domain / Subdomain | Waiter / Floor Ordering |
| Architectural Owner | **Waiter Platform** |
| Aggregate Owner | None |
| Platform Layer | Presentation + API |
| Description | Waiter floor tables, workspace, browse/cart/checkout, place-as-waiter |
| Dependencies | CAP-01, CAP-03, CAP-07, CAP-29 optional |
| Runtime | `waiter` router; WaiterTableWorkspaceService |
| UI | `/waiter/:slug/*` |
| API | `waiter.*`, `order.placeAsWaiter` |
| Permissions | Staff authenticated waiter |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |

### CAP-32 — Self-Ordering Kiosk

| Field | Value |
|-------|-------|
| Domain / Subdomain | Self Ordering Kiosk / Channel Shell |
| Architectural Owner | **Ordering Client / Kiosk** |
| Aggregate Owner | None |
| Platform Layer | Presentation |
| Description | Guest kiosk browse/cart/checkout channel |
| Dependencies | CAP-03, CAP-04, CAP-05, CAP-20 |
| Runtime | Kiosk client + ordering APIs; device role `self_ordering_kiosk` |
| UI | `/kiosk/:slug/*` |
| API | `ordering.getRuntimeBySlug`, `order.placeWithIdentity` |
| Permissions | Public guest + ordering entitlement |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |

### CAP-33 — Counter Pickup Settlement

| Field | Value |
|-------|-------|
| Domain / Subdomain | Pickup / Staff Counter Settle |
| Architectural Owner | **Order Platform** (settlement commands) + Ordering channel semantics |
| Aggregate Owner | Order (settle/cancel unpaid counter pickup) |
| Platform Layer | Application |
| Description | Staff list/settle/cancel unpaid counter-pickup orders |
| Dependencies | CAP-01, CAP-03, CAP-16 (register/shift context) |
| Runtime | `StaffCounterPickupSettlementService` |
| UI | OrdersWorkspacePanel unpaid counter-pickup flows |
| API | `order.listUnpaidCounterPickup`, `staffSettleCounterPickup`, `staffCancelCounterPickup` |
| Permissions | Staff + CRMP settle context |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable *(supersedes Discovery-1 Development)* |

### CAP-34 — Customer Notifications & Push

| Field | Value |
|-------|-------|
| Domain / Subdomain | Notifications / Web Push + Renewal |
| Architectural Owner | **Notifications** |
| Aggregate Owner | Push subscriptions; renewal notification rows |
| Platform Layer | Integration |
| Description | Customer web push on OrderReady; in-app renewal notifications |
| Dependencies | CAP-01, CAP-21 |
| Runtime | `server/customerPush`; `notification` router; OrderReady consumer |
| UI | Customer tracking push opt-in; notification list |
| API | `/api/push/*`, `notification.*` |
| Permissions | Public subscribe; owner notification list |
| Commercializable | **NOT COMMERCIAL READY** as standalone (channel of CAP-01/21); packaging residual |
| Status / Lifecycle | Production · VAPID-gated |

### CAP-35 — Platform Ops & Admin

| Field | Value |
|-------|-------|
| Domain / Subdomain | Platform Infrastructure / Admin + Restaurant Ops |
| Architectural Owner | **Administration** |
| Aggregate Owner | None |
| Platform Layer | Presentation + API |
| Description | Admin dashboard, platform ops, restaurant `ops.*` workspace surfaces |
| Dependencies | CAP-25, domain APIs |
| Runtime | `admin` merge; `server/ops` |
| UI | `/admin/*`, owner ops panels |
| API | `admin.*`, `ops.*`, related |
| Permissions | Admin / owner |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-36 — Audit & Ops Taxonomy

| Field | Value |
|-------|-------|
| Domain / Subdomain | Platform Infrastructure / Audit |
| Architectural Owner | **Observability / Security** |
| Aggregate Owner | `audit_events` |
| Platform Layer | Infrastructure |
| Description | OPS taxonomy + audit persistence + security health |
| Dependencies | DB |
| Runtime | `server/audit`, ops taxonomy |
| UI | `/admin/security` |
| API | `admin` audit/security health |
| Permissions | Admin |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-37 — Data Retention (DRAP)

| Field | Value |
|-------|-------|
| Domain / Subdomain | Platform Infrastructure / Retention |
| Architectural Owner | **DRAP** (policy); domains own data |
| Aggregate Owner | None |
| Platform Layer | Shared Policy |
| Description | Display windows / retention policy; Financial Shift adoption |
| Dependencies | CAP-16/17 |
| Runtime | `shared/data-retention` + shift adoption |
| UI | Shift retention/archive surfaces |
| API | Domain-embedded |
| Permissions | Staff |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Partial (cold archive not started) |

### CAP-40 — Event Delivery & Idempotency

| Field | Value |
|-------|-------|
| Domain / Subdomain | Platform Infrastructure / Outbox |
| Architectural Owner | **Order Platform / Event Governance** |
| Aggregate Owner | Outbox + consumer processed markers |
| Platform Layer | Infrastructure |
| Description | Outbox relay/publisher; consumer idempotency |
| Dependencies | CAP-01 |
| Runtime | Order infrastructure relay/consumers |
| UI | None dedicated |
| API | None public |
| Permissions | Internal |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Certified |

### CAP-41 — Media & Object Storage

| Field | Value |
|-------|-------|
| Domain / Subdomain | Storage / Media |
| Architectural Owner | **Infrastructure / Media** |
| Aggregate Owner | Object keys; entity image refs |
| Platform Layer | Infrastructure |
| Description | R2 object storage + entity image validation (offers/menu uploads) |
| Dependencies | Cloudflare R2 / local uploads |
| Runtime | `server/storage`, `server/media` |
| UI | Indirect via upload UIs |
| API | Internal `storagePut`/`Get`; offer image mutations |
| Permissions | Owner upload paths |
| Commercializable | **NOT COMMERCIAL READY** (quota limit `storage`/`images` only) |
| Status / Lifecycle | Production · Stable |

### CAP-42 — Country & Currency Reference

| Field | Value |
|-------|-------|
| Domain / Subdomain | Commercial Platform / Reference |
| Architectural Owner | **Platform Reference Data** |
| Aggregate Owner | `countries_currencies` |
| Platform Layer | Reference |
| Description | Country/currency reference for localization/billing |
| Dependencies | None |
| Runtime | `countryCurrency` router |
| UI | Selectors in catalog/settings |
| API | `countryCurrency.*` |
| Permissions | Authenticated / admin as wired |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-43 — Commercial / SaaS Analytics

| Field | Value |
|-------|-------|
| Domain / Subdomain | Analytics / SaaS Admin Metrics |
| Architectural Owner | **Admin / Commercial** |
| Aggregate Owner | Derived |
| Platform Layer | Application |
| Description | MRR/ARR/plan distribution/subscriber metrics (≠ restaurant CAP-22) |
| Dependencies | CAP-21, CAP-35 |
| Runtime | `server/commercial/analyticsRouter.ts` |
| UI | `/admin/analytics`, commercial reports hub |
| API | `analytics.*`, admin commercial export |
| Permissions | Admin |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-46 — Order Lifecycle Latency

| Field | Value |
|-------|-------|
| Domain / Subdomain | Platform Infrastructure / SLO Metrics |
| Architectural Owner | **Observability / Order** |
| Aggregate Owner | Metrics contracts |
| Platform Layer | Instrumentation |
| Description | Measure order lifecycle stage latency |
| Dependencies | CAP-01 |
| Runtime | `shared/order-lifecycle-latency` + order path instrumentation |
| UI | Ops health consumers as adopted |
| API | Embedded metrics / OPS |
| Permissions | Internal |
| Commercializable | **NOT COMMERCIAL READY** |
| Status / Lifecycle | Production · Stable |

### CAP-47 — Expo Display Workspace *(new first-class)*

| Field | Value |
|-------|-------|
| Domain / Subdomain | Expo / Final Coordination |
| Architectural Owner | **Expo / Operational Screen** (role `expo_display`) |
| Aggregate Owner | None (consumes Order Read + Kitchen panel; owns Ready transition) |
| Platform Layer | Ops UI |
| Description | Expo coordination workspace: final review and Ready; shares kitchen presentation with exclusive mark-ready |
| Dependencies | CAP-26 queue, CAP-02 hints, CAP-28, CAP-29/30 |
| Runtime | `expoWorkspaceContract`, device order execution for expo; realtime channel `expo` |
| UI | `/screen/run` with `expo_display` → KitchenScreenPanel + expo actions |
| API | Kitchen queue + `executeOrderAction` (mark-ready/serve); device realtime mint |
| Permissions | Device role `expo_display` |
| Commercializable | **COMMERCIAL ELIGIBLE** |
| Status / Lifecycle | Production · Stable |
| Evidence | `client/.../roles/roleDefinitions.ts` `expoDisplayRole`; `expoWorkspaceContract.ts`; REALTIME-EXPO-ADOPTION-1 |

### CAP-48 — Business Tax Policy *(new first-class)*

| Field | Value |
|-------|-------|
| Domain / Subdomain | Tax Policy / Restaurant Financial Config |
| Architectural Owner | **Settlement / Restaurant Config** |
| Aggregate Owner | Restaurant tax fields; Check `taxPolicySnapshot` |
| Platform Layer | Domain Config |
| Description | Restaurant tax enable/mode/policy; frozen on Check at capture |
| Dependencies | CAP-05 (persist), CAP-08 (snapshot) |
| Runtime | `shared/.../businessTaxSettings.ts`; `CheckService` capture |
| UI | `RestaurantFinancialPolicySection` |
| API | `restaurant.update` tax fields |
| Permissions | Owner |
| Commercializable | **NOT COMMERCIAL READY** (operational config) |
| Status / Lifecycle | Production · Stable |

---

## Explicitly not registered (verified)

| Candidate | Reason | Evidence |
|-----------|--------|----------|
| AI Assistant (old CAP-45) | No `server/ai*`; Planned only | filesystem + prior catalog |
| Customer Display | Role blocked; no production UI | `roleDefinitions` presentationKey blocked |
| Pickup Display screen | Role blocked | same |
| Print Monitor screen | Panel exists; host does not mount | runtimeRolePresentations guards |
| Hotel PMS | No hotel server domain; only `tableLabel` | restaurant settings |
| Financial Core Language (old CAP-14) | Constitution language, not runtime product | ADR-023 embodied in CAP-08–13 |
| Financial Custody Plane (old CAP-18) | Governance plane only | ADR-033 |
| Performance Platform (old CAP-38) | Experimental / architecture-forward | shared package without product API |
| Operations Runtime Platform (old CAP-39) | Experimental | architecture package |
| Architecture Governance (old CAP-44) | Process/docs, not platform capability product | docs/architecture |

### Hotel note

**Hotel** is not a bounded platform. Unit labeling (`tableLabel` tables|rooms) is a **settings facet of CAP-05/06**, historically sold as FEATURE_KEYS `hotelMode`/`roomQr`. Those keys are legacy packaging — mapped in Legacy Mapping Report — not Discovery capabilities.
