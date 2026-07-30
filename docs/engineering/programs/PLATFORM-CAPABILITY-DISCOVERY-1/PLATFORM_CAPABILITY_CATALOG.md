# PLATFORM CAPABILITY CATALOG

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Role** | Official Platform Capability Catalog (discovery SSOT) |
| **Date** | 2026-07-30 |
| **Authority** | Architecture Authority review pending |
| **Scope** | Capabilities evidenced in code, shared contracts, ADRs, and engineering programs |

> **Status vocabulary (catalog):** Experimental · Development · Production · Certified · Deprecated · Planned  
> Fine-grained maturity with evidence lives in [CAPABILITY_MATURITY_MATRIX.md](./CAPABILITY_MATURITY_MATRIX.md).  
> “Certified” here means **Architecture / program certification evidence**; it is not a Production Certification Board stamp unless noted.

---

## How to read an entry

Each capability records: purpose, business value, owner domain, aggregate owner, SSOT, read models, runtime services, public APIs, events published/consumed, dependencies, dependents, status, roadmap notes.

**IDs** are discovery identifiers (`CAP-xx`), not product SKUs.

---

## CAP-01 — Order Platform (Write Aggregate)

| Field | Content |
|-------|---------|
| **Name** | Order Platform |
| **Purpose** | Own order lifecycle write path: create, advance status, cancel/complete; emit domain events via outbox. |
| **Business Value** | Core revenue-operating object for dining/fulfilment; integrates kitchen, print, session, notifications. |
| **Owner Domain** | Order Platform |
| **Aggregate Owner** | Order aggregate (`server/order/domain/aggregate`) |
| **SSOT** | Order write model (`orders`, `order_items`); ADR-ARCH-001/007 |
| **Read Models** | Consumed via Order Read Model (CAP-02), not owned here |
| **Runtime Services** | PlaceOrder / Advance services; outbox relay/publisher |
| **Public APIs** | `order.*` (commands); nested `order.read` for reads |
| **Events Published** | `OrderCreated`, `OrderStatusChanged`, `OrderReady`, `OrderCompleted`, `OrderCancelled`, `OrderLifecycleStageChanged` (+ OPS order/outbox metrics) |
| **Events Consumed** | None as write authority (session/print/kitchen consume Order events) |
| **Dependencies** | Menu/Restaurant (catalog facts), Tenant/Restaurant context, Ordering identity contracts, Session optional anchor |
| **Dependents** | Kitchen, Printing, Session consumers, Notifications, Order Read Model, Reporting facts, Ops boards |
| **Current Status** | **Production** (runtime live) · Architecture partially compliant vs ADR “Not implemented/Partial” legacy notes |
| **Future Roadmap Notes** | Continue ORDER-1 alignment; optimistic concurrency (ADR-011); retire dual-write session paths (ADR-005/010) |

---

## CAP-02 — Order Read Model / Projections

| Field | Content |
|-------|---------|
| **Name** | Order Read Model |
| **Purpose** | Project Order domain events into query-optimized tables for dashboards/ops UIs. |
| **Business Value** | Scalable operational visibility without hitting write model. |
| **Owner Domain** | Order Platform (read plane) |
| **Aggregate Owner** | Projections (not an aggregate root); ownership per READ-ARCHITECTURE / ORDERS-READ-MODEL-1 |
| **SSOT** | Write SSOT remains Order; projections are derived |
| **Read Models** | `order_read_*` tables; freshness via `shared/read-freshness` |
| **Runtime Services** | Projection consumers; backfill runs |
| **Public APIs** | `order.read.*`; Ops/Orders workspace consumers |
| **Events Published** | OPS projection/backfill events |
| **Events Consumed** | Order domain outbox events |
| **Dependencies** | Order Platform, Event delivery/idempotency (CAP-39) |
| **Dependents** | Ops UI, Orders workspace, some reporting mirrors |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | ADR-009 dashboard analytics ownership; expand projection coverage |

---

## CAP-03 — Ordering Platform (Multi-Channel Runtime)

| Field | Content |
|-------|---------|
| **Name** | Ordering Platform |
| **Purpose** | Channel registry and ordering runtime contracts (QR table, kiosk, waiter, counter). |
| **Business Value** | Consistent place-order path across channels; sales-channel reporting hooks. |
| **Owner Domain** | Ordering Platform |
| **Aggregate Owner** | Does not own Order aggregate; owns channel/runtime contracts |
| **SSOT** | `shared/ordering-platform`; ADR-ARCH-018/019 related |
| **Read Models** | Channel presentation; fulfilment labels projected |
| **Runtime Services** | `server/ordering-platform`, `orderingRouter` |
| **Public APIs** | `ordering.*` |
| **Events Published** | Channel-specific ops signals (via Order path primarily) |
| **Events Consumed** | Entitlement/commercial gates; menu/session facts |
| **Dependencies** | Order Platform, Menu, Session/Table, Commercial Entitlements |
| **Dependents** | Ordering Client, Kiosk, Waiter, Counter Pickup, Table Ordering UI |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Channel governance programs; keep client platform thin |

---

## CAP-04 — Ordering Client Platform

| Field | Content |
|-------|---------|
| **Name** | Ordering Client Platform |
| **Purpose** | Shared multi-channel client experience layer between runtime and channel shells. |
| **Business Value** | One browse/cart/checkout journey model; immutable journey identity. |
| **Owner Domain** | Ordering Client (presentation architecture) |
| **Aggregate Owner** | None (presentation) |
| **SSOT** | ADR-ARCH-018; client `lib/ordering-client` |
| **Read Models** | Client caches only |
| **Runtime Services** | Client libraries |
| **Public APIs** | Consumes `ordering.*` / `order.*` |
| **Events Published** | None (domain) |
| **Events Consumed** | Realtime hints optional |
| **Dependencies** | Ordering Platform, Realtime (optional), Entitlements |
| **Dependents** | Kiosk shell, Table ordering shell, Waiter UX |
| **Current Status** | **Certified** (architecture + governed runtime identity) |
| **Future Roadmap Notes** | Keep shells free of domain logic |

---

## CAP-05 — Menu & Restaurant Catalog

| Field | Content |
|-------|---------|
| **Name** | Menu & Restaurant Catalog |
| **Purpose** | Restaurant profile, categories, menu items, offers, holidays; public QR menu surface. |
| **Business Value** | Merchant product catalog customers order from. |
| **Owner Domain** | Menu / Restaurant Platform |
| **Aggregate Owner** | Restaurant-scoped catalog entities (legacy router-centric SSOT in DB) |
| **SSOT** | `restaurants`, `categories`, `menu_items`, `offers`, `restaurant_holidays` |
| **Read Models** | Public menu views; admin catalog editors |
| **Runtime Services** | Routers in `server/routers.ts` (`restaurant`, `category`, `menuItem`, `offer`, `holiday`) |
| **Public APIs** | `restaurant.*`, `category.*`, `menuItem.*`, `offer.*`, `holiday.*` |
| **Events Published** | Limited OPS; not full domain outbox |
| **Events Consumed** | Entitlement gates for features |
| **Dependencies** | Tenant Identity, Media/Storage, Commercial Entitlements |
| **Dependents** | Ordering, Public Menu/QR, Reporting menu KPIs (ACL) |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Formal Menu Platform ADR maturity; pricing ACL clarity vs Order |

---

## CAP-06 — Table Platform

| Field | Content |
|-------|---------|
| **Name** | Table Platform |
| **Purpose** | Floor tables, QR association, table operational context for dine-in. |
| **Business Value** | Maps physical dining positions to ordering/session. |
| **Owner Domain** | Table Platform |
| **Aggregate Owner** | Table entities (`restaurant_tables`) |
| **SSOT** | Table platform programs + DB tables |
| **Read Models** | Floor maps / ops table boards |
| **Runtime Services** | `table` router |
| **Public APIs** | `table.*` |
| **Events Published** | `table_events` related |
| **Events Consumed** | Session/Order facts |
| **Dependencies** | Restaurant, Session |
| **Dependents** | Table ordering, Waiter, Ops |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Adoption programs vs session uniqueness |

---

## CAP-07 — Operational Session (Dining Session)

| Field | Content |
|-------|---------|
| **Name** | Operational Session |
| **Purpose** | Dining/operational session lifecycle anchoring checks and orders. |
| **Business Value** | Groups guest activity; enables check membership and ops boards. |
| **Owner Domain** | Session Platform |
| **Aggregate Owner** | Dining/Operational Session (`dining_sessions` / operational-session contracts) |
| **SSOT** | `shared/operational-session`; `server/operational-session`, `server/diningSession` |
| **Read Models** | Session aggregates (with drift/fallback OPS events) |
| **Runtime Services** | `session` router; session consumers of Order events |
| **Public APIs** | `session.*` |
| **Events Published** | OPS `session_*`, aggregate drift/fallback |
| **Events Consumed** | Order domain events (intended ADR-010) |
| **Dependencies** | Table, Restaurant, Order |
| **Dependents** | Check/Settlement, Waiter, Ops, Reporting mirrors |
| **Current Status** | **Production** (partial vs constitution “future Session” diagram) |
| **Future Roadmap Notes** | Graduate Session authority; remove inline aggregate writes |

---

## CAP-08 — Check & Financial Settlement Plane

| Field | Content |
|-------|---------|
| **Name** | Check / Financial Settlement Platform |
| **Purpose** | Check as monetary aggregate root / revenue root; settlement commands and outstanding. |
| **Business Value** | Authoritative money for a dining engagement; settlement SSOT. |
| **Owner Domain** | Settlement Platform |
| **Aggregate Owner** | Check (`operational_checks`) — sole monetary AR (ADR-020) |
| **SSOT** | ADR-ARCH-020/022/023; operational-session check services |
| **Read Models** | Settlement ledger views; Settlement Records (CAP-11) |
| **Runtime Services** | Check services; order settlement APIs |
| **Public APIs** | `orderSettlement.*`; check façades under operational-session |
| **Events Published** | Settlement-related domain/ops (incl. attribution hooks) |
| **Events Consumed** | Order membership facts; Register attribution (fail-open) |
| **Dependencies** | Session, Order membership, Document Identity |
| **Dependents** | Settlement Record, Refund, Split Payment, Allocation, CRMP attribution, Reporting Net |
| **Current Status** | **Production** (runtime) · Architecture **Partial** (ADR-020/022 “Not implemented” vs later SR/Refund implemented stack — see gaps) |
| **Future Roadmap Notes** | Reconcile ADR Implementation Status with live Check/SR/Refund stack |

---

## CAP-09 — Order Settlement Capability

| Field | Content |
|-------|---------|
| **Name** | Order Settlement |
| **Purpose** | Check-owned settlement of order financial state (FSP). |
| **Business Value** | Close order money against Check without second monetary AR. |
| **Owner Domain** | Settlement Platform |
| **Aggregate Owner** | Check (Order Settlement entity under Check) |
| **SSOT** | ADR-ARCH-022 |
| **Read Models** | `orderSettlement` read router |
| **Runtime Services** | operational-session check settlement |
| **Public APIs** | `orderSettlement.*` |
| **Events Published** | Settlement ops / SR publications |
| **Events Consumed** | Check commands |
| **Dependencies** | CAP-08, CAP-01 |
| **Dependents** | Reporting, Register attribution |
| **Current Status** | **Production** (API present) · ADR status lag |
| **Future Roadmap Notes** | Harden I-OS invariants documentation vs runtime |

---

## CAP-10 — Split Payment

| Field | Content |
|-------|---------|
| **Name** | Split Payment |
| **Purpose** | Multi-tender / incremental payment capability under Check. |
| **Business Value** | Guests can pay with multiple methods without inventing new revenue root. |
| **Owner Domain** | Settlement Platform |
| **Aggregate Owner** | Check; Payment ≠ Aggregate Root (ADR-024) |
| **SSOT** | ADR-ARCH-024; split-payment domain modules |
| **Read Models** | Split payment read APIs |
| **Runtime Services** | `server/operational-session/check` split payment |
| **Public APIs** | `splitPayment.*` |
| **Events Published** | Payment success ≠ financial settlement complete |
| **Events Consumed** | Check settlement commands |
| **Dependencies** | CAP-08, Financial Core language (CAP-14) |
| **Dependents** | Settlement UX, Reporting payment method analytics |
| **Current Status** | **Production** (router + domain) · ADR “Not implemented” lag |
| **Future Roadmap Notes** | Align ADR registry Implementation Status |

---

## CAP-11 — Multi-Check Allocation

| Field | Content |
|-------|---------|
| **Name** | Multi-Check Allocation |
| **Purpose** | Cross-check responsibility redistribution facts commanded by Check. |
| **Business Value** | Party splits across checks without violating conservation invariants. |
| **Owner Domain** | Settlement Platform |
| **Aggregate Owner** | Check; Allocation ≠ AR (ADR-025) |
| **SSOT** | ADR-ARCH-025 |
| **Read Models** | Allocation APIs |
| **Runtime Services** | multi-check allocation services |
| **Public APIs** | `multiCheckAllocation.*` |
| **Events Published** | Allocation relationship facts |
| **Events Consumed** | Check membership |
| **Dependencies** | CAP-08, CAP-14 |
| **Dependents** | Settlement UX |
| **Current Status** | **Production** (API) · ADR status lag |
| **Future Roadmap Notes** | Membership remains composition SSOT |

---

## CAP-12 — Settlement Record Platform

| Field | Content |
|-------|---------|
| **Name** | Settlement Record |
| **Purpose** | Append-only canonical financial document publication from Check. |
| **Business Value** | Immutable settlement/refund documents for ops, reporting, custody. |
| **Owner Domain** | Settlement Platform (publication plane); Check write owner |
| **Aggregate Owner** | Not an AR; Check publishes |
| **SSOT** | ADR-ARCH-026; `settlement_records` |
| **Read Models** | Settlement record presentation; reporting Net |
| **Runtime Services** | Settlement record services + read router |
| **Public APIs** | `settlementRecord.*` |
| **Events Published** | Publication facts; `SettlementAttributed` (custody) |
| **Events Consumed** | Check settlement/refund commands |
| **Dependencies** | CAP-08, CAP-15 Document Identity, CAP-32 Refund |
| **Dependents** | Reporting Net, CRMP attribution, Refund presentation |
| **Current Status** | **Certified** (write + refund read + Reporting Net per ADR-026) |
| **Future Roadmap Notes** | Broader document identity adoption |

---

## CAP-13 — Refund Platform

| Field | Content |
|-------|---------|
| **Name** | Refund Platform |
| **Purpose** | Compensating settlement / refund ledger entries via Check façade. |
| **Business Value** | Controlled money reversal with document + register + reporting adoption. |
| **Owner Domain** | Settlement Platform |
| **Aggregate Owner** | Check; Refund as capability (ADR-032) |
| **SSOT** | ADR-ARCH-032 |
| **Read Models** | Refund presentation; Settlement Record `recordKind` refund |
| **Runtime Services** | `checkRefund` router + CheckService façade |
| **Public APIs** | `checkRefund.*` |
| **Events Published** | Refund SR publications; register attribution (fail-open) |
| **Events Consumed** | Check settlement history |
| **Dependencies** | CAP-08, CAP-12, CAP-16 CRMP (attribution), CAP-22 Reporting |
| **Dependents** | Ops refund workflow, Reporting Net |
| **Current Status** | **Certified** (domain + SR + Register + Reporting + Presentation + Workflow) |
| **Future Roadmap Notes** | Custody plane specialization (ADR-033) governance |

---

## CAP-14 — Financial Core Capabilities (Language)

| Field | Content |
|-------|---------|
| **Name** | Financial Core Capabilities |
| **Purpose** | Shared language: Payment, Allocation, Refund, Outstanding, Timeline ownership constitution. |
| **Business Value** | Prevents duplicate monetary ARs and capability duplication. |
| **Owner Domain** | Settlement Platform (constitution) |
| **Aggregate Owner** | None new; Check remains monetary AR |
| **SSOT** | ADR-ARCH-023 |
| **Read Models** | N/A (language) |
| **Runtime Services** | Embodied in CAP-08–13 |
| **Public APIs** | Via specialized routers |
| **Events Published** | Defined by specialization ADRs |
| **Events Consumed** | — |
| **Dependencies** | CAP-08 |
| **Dependents** | CAP-10, CAP-11, CAP-13 |
| **Current Status** | **Certified** (architecture) · ADR Implementation Status still “Not implemented” (registry lag) |
| **Future Roadmap Notes** | Update ADR Implementation Status to match runtime |

---

## CAP-15 — Operational Document Identity

| Field | Content |
|-------|---------|
| **Name** | Operational Document Identity |
| **Purpose** | Cross-platform human document identity format/registry. |
| **Business Value** | Consistent document numbers/labels across settlement, orders, print. |
| **Owner Domain** | Cross-cutting standard |
| **Aggregate Owner** | None |
| **SSOT** | ADR-ARCH-027; `docs/architecture/standards/OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md`; `shared/operational-document-identity` |
| **Read Models** | Formatters/providers |
| **Runtime Services** | Identity provider; Settlement adoption |
| **Public APIs** | Embedded in document APIs |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | None foundational |
| **Dependents** | Settlement Record, phased Orders/Checks/Reporting/Printing |
| **Current Status** | **Production** (Partial adoption) |
| **Future Roadmap Notes** | Complete phased consumers |

---

## CAP-16 — Cash Register Management Platform (CRMP)

| Field | Content |
|-------|---------|
| **Name** | CRMP / Cash Register |
| **Purpose** | Register catalog, financial shift, drawer accountability, settlement attribution (custody ≠ money ownership). |
| **Business Value** | Cashier/register accountability without owning Check money. |
| **Owner Domain** | Register Platform |
| **Aggregate Owner** | Register / Financial Shift entities (not monetary AR) |
| **SSOT** | ADR-ARCH-028/030; `shared/crmp`; `crmp_*` tables |
| **Read Models** | Register ops UI; shift reports |
| **Runtime Services** | `server/crmp`, Duty/lifecycle services |
| **Public APIs** | `crmp.*` |
| **Events Published** | Shift/drawer/handover domain events (collected; limited bus) |
| **Events Consumed** | Settlement attribution hooks (fail-open) |
| **Dependencies** | Settlement publications, Tenant/Restaurant |
| **Dependents** | Register Ops UI, Refund attribution, Retention adoption |
| **Current Status** | **Certified** (domain + Duty + API + UI + refund attribution) · Partial vs full custody plane |
| **Future Roadmap Notes** | ADR-033 custody governance; cold archive via DRAP |

---

## CAP-17 — Financial Shift Lifecycle

| Field | Content |
|-------|---------|
| **Name** | Financial Shift Lifecycle |
| **Purpose** | Govern open/close shift lifecycle distinct from OpenRegister. |
| **Business Value** | Correct custody windows and settlement attribution prerequisites. |
| **Owner Domain** | Register Platform |
| **Aggregate Owner** | Financial Shift |
| **SSOT** | ADR-ARCH-030 |
| **Read Models** | Shift status views |
| **Runtime Services** | Shift lifecycle services |
| **Public APIs** | Via `crmp.*` / register ops |
| **Events Published** | Shift lifecycle |
| **Events Consumed** | Register duty |
| **Dependencies** | CAP-16 |
| **Dependents** | Attribution, Retention display windows |
| **Current Status** | **Certified** (domain) · API/UI noted partial in ADR for some surfaces |
| **Future Roadmap Notes** | Forbid persisted `pending` shift; settle fail-open |

---

## CAP-18 — Financial Custody Plane

| Field | Content |
|-------|---------|
| **Name** | Financial Custody Plane |
| **Purpose** | Constitutional plane: Authority ≠ Custody; Expected Cash; Attribution completion. |
| **Business Value** | Clarifies register custody vs Check money authority. |
| **Owner Domain** | Register / Settlement governance |
| **Aggregate Owner** | No new AR |
| **SSOT** | ADR-ARCH-033 |
| **Read Models** | Governance only |
| **Runtime Services** | Specializations (e.g. RRS) as adopted |
| **Public APIs** | — |
| **Events Published** | `SettlementAttributed` completion rules |
| **Events Consumed** | SR publications |
| **Dependencies** | CAP-12, CAP-16 |
| **Dependents** | Register refund settlement specialization |
| **Current Status** | **Certified** (governance only) |
| **Future Roadmap Notes** | Runtime specialization programs as authorized |

---

## CAP-19 — Commercial Catalog Platform

| Field | Content |
|-------|---------|
| **Name** | Commercial Catalog |
| **Purpose** | SSOT for commercial offerings: plans, versions, prices, cycles, features, limits, trials, promotions, regions, publication, snapshots. |
| **Business Value** | Productize SaaS packaging; USD-canonical + regional policies. |
| **Owner Domain** | Commercial Catalog |
| **Aggregate Owner** | Catalog aggregates (plans/versions/prices/policies) |
| **SSOT** | `shared/commercial-catalog`; `commercial_*` schema; Catalog architecture programs |
| **Read Models** | Admin catalog UI; public pricing dual-price presentation |
| **Runtime Services** | `server/services/commercial-catalog`, `server/commercial-catalog` |
| **Public APIs** | `commercialCatalog.*` (+ localization nested) |
| **Events Published** | OPS `commercial_catalog_*`, `commercial_snapshot_*`; audit via `emitAuditEvent` |
| **Events Consumed** | Admin auth |
| **Dependencies** | Auth/Admin, Country-Currency reference |
| **Dependents** | Subscription bindings, Snapshot entitlement authority, Public Pricing, Platform Ops Commercial UI |
| **Current Status** | **Production** (foundation + adoption + management UI + localization polish) · Architecture review track |
| **Future Roadmap Notes** | Production certification of migrations 0084/0085; no payment ownership |

---

## CAP-20 — Commercial Snapshot & Entitlement Runtime Authority

| Field | Content |
|-------|---------|
| **Name** | Commercial Snapshot Runtime Authority |
| **Purpose** | Bound commercial snapshot is exclusive entitlement runtime authority; unbound uses legacy bridge. |
| **Business Value** | Deterministic feature/limit evaluation for tenants. |
| **Owner Domain** | Subscription / Commercial runtime (consumes Catalog SSOT) |
| **Aggregate Owner** | Snapshot definition + subscription binding |
| **SSOT** | Snapshot after bind; Catalog for definitions; `commercial_subscription_bindings` |
| **Read Models** | Entitlement hooks/UI feature visibility |
| **Runtime Services** | `server/commercial/*`, entitlement resolvers, adoption service |
| **Public APIs** | `commercial.*`, entitlement helpers; subscription bridges |
| **Events Published** | Snapshot bind/lifecycle OPS |
| **Events Consumed** | Catalog publication |
| **Dependencies** | CAP-19, CAP-21 Subscription |
| **Dependents** | Ordering feature gates, admin commercial analytics, UI visibility |
| **Current Status** | **Certified** (runtime authority COMPLIANT per program) |
| **Future Roadmap Notes** | Retire unbound legacy paths over time |

---

## CAP-21 — Subscription Platform (Lifecycle & Billing Bridge)

| Field | Content |
|-------|---------|
| **Name** | Subscription Platform |
| **Purpose** | Tenant subscription lifecycle, plan selection bridge, invoices, renewals; entitlement evaluation surface. |
| **Business Value** | Monetize tenants; gate product features. |
| **Owner Domain** | Subscription Platform |
| **Aggregate Owner** | User/tenant subscription records (legacy + bindings) |
| **SSOT** | Entitlement evaluation ownership docs; legacy `user_subscriptions` / `subscription_plans` + Catalog bindings |
| **Read Models** | Billing/subscription UI; admin commercial |
| **Runtime Services** | `subscription` router, PayPal/Tap checkout bridges |
| **Public APIs** | `subscription.*`, `invoice.*`, `notification.*` (renewal) |
| **Events Published** | OPS payment/subscription admin events; webhooks |
| **Events Consumed** | Payment provider webhooks |
| **Dependencies** | CAP-19/20, CAP-23 Billing Providers, Auth |
| **Dependents** | Entitlement gates across product |
| **Current Status** | **Production** · Architecture Certified UI foundation; Catalog adoption in progress |
| **Future Roadmap Notes** | Complete Catalog-primary commercial config; avoid Catalog owning payments |

---

## CAP-22 — Reporting Platform

| Field | Content |
|-------|---------|
| **Name** | Reporting Platform |
| **Purpose** | KPI dictionary, business/ops/sales metrics, exports, reporting constitutions. |
| **Business Value** | Decision-grade analytics without inventing financial truth. |
| **Owner Domain** | Reporting Platform |
| **Aggregate Owner** | None for money; KPI presentation ownership |
| **SSOT** | Reporting Constitutions; `shared/reporting-platform`; KPI ownership registry |
| **Read Models** | Reporting services/exports |
| **Runtime Services** | `server/reporting-platform` |
| **Public APIs** | `reporting.*` |
| **Events Published** | Limited OPS |
| **Events Consumed** | Settlement Record Net publications; Order/ops facts |
| **Dependencies** | Settlement publications, Order facts, Ordering sales channels |
| **Dependents** | Admin analytics UI, exports |
| **Current Status** | **Production** · Constitutions ratified with adoption pending notes in architecture README |
| **Future Roadmap Notes** | Constitution enforcement adoption; UX polish programs ongoing |

---

## CAP-23 — SaaS Billing Payment Providers

| Field | Content |
|-------|---------|
| **Name** | SaaS Billing Providers (PayPal / Tap) |
| **Purpose** | Checkout sessions and webhooks for platform subscriptions. |
| **Business Value** | Collect SaaS revenue. |
| **Owner Domain** | Subscription / Payments integration |
| **Aggregate Owner** | Provider transactions (external) + local subscription rows |
| **SSOT** | Provider systems; local webhook handlers |
| **Read Models** | Payment history UI |
| **Runtime Services** | `server/paypal.ts`, `tap-payments.ts`, webhooks |
| **Public APIs** | HTTP `POST /api/paypal/webhook`, `/api/tap/webhook`; tRPC checkout mutations |
| **Events Published** | OPS `webhook_*`, `payment_*` |
| **Events Consumed** | Provider callbacks |
| **Dependencies** | Subscription, Config/env |
| **Dependents** | Subscription activation |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Global SaaS payment readiness programs; Catalog deny-list for Stripe/Moyasar/Hyperpay ownership |

---

## CAP-24 — Tenant Identity Platform

| Field | Content |
|-------|---------|
| **Name** | Tenant Identity |
| **Purpose** | Org → Tenant → Restaurant → Branch identity graph and account classification. |
| **Business Value** | Multi-tenant isolation and ownership of restaurants. |
| **Owner Domain** | Tenant Identity |
| **Aggregate Owner** | Platform account / tenant graph (architecture SSOT) |
| **SSOT** | TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1; `shared/platformAccount.ts`, classification |
| **Read Models** | Admin tenants |
| **Runtime Services** | Auth + restaurant access + admin classification |
| **Public APIs** | `admin.*` tenant surfaces; `auth.*`; restaurant ownership checks |
| **Events Published** | OPS `tenant_boundary_violation`, classification audits |
| **Events Consumed** | Auth events |
| **Dependencies** | Auth/RBAC |
| **Dependents** | Nearly all tenant-scoped capabilities |
| **Current Status** | **Production** (runtime pieces) · Architecture package as SSOT |
| **Future Roadmap Notes** | Full graph runtime consolidation |

---

## CAP-25 — Auth & RBAC

| Field | Content |
|-------|---------|
| **Name** | Auth & RBAC |
| **Purpose** | Authentication, sessions/tokens, roles, permissions, scopes. |
| **Business Value** | Secure access control for owners, staff, platform admins. |
| **Owner Domain** | Identity / RBAC |
| **Aggregate Owner** | User (`users`), auth tokens, role assignments |
| **SSOT** | RBAC-PLATFORM-ARCHITECTURE-1; `server/auth-local` |
| **Read Models** | Profile; admin security |
| **Runtime Services** | Auth procedures; role change audit |
| **Public APIs** | `auth.*`, `profile.*` |
| **Events Published** | OPS AUTH family; role change audit |
| **Events Consumed** | — |
| **Dependencies** | Tenant Identity |
| **Dependents** | Admin, Ops, all protected routers |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Architecture SSOT vs legacy permission sprawl |

---

## CAP-26 — Kitchen Display

| Field | Content |
|-------|---------|
| **Name** | Kitchen Display |
| **Purpose** | Kitchen queue/display fulfillment views as Order event consumer. |
| **Business Value** | Kitchen execution visibility. |
| **Owner Domain** | Kitchen Platform |
| **Aggregate Owner** | None (read/consumer) |
| **SSOT** | Kitchen read models; ADR-012 consumer pattern |
| **Read Models** | Kitchen router views |
| **Runtime Services** | `server/kitchen`; Order consumers |
| **Public APIs** | `kitchen.*` |
| **Events Published** | OPS consumer metrics |
| **Events Consumed** | Order domain events |
| **Dependencies** | Order Platform, Realtime optional |
| **Dependents** | Kitchen UI |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Domain landscape still labels Kitchen “Future” — diagram stale |

---

## CAP-27 — Printing Platform

| Field | Content |
|-------|---------|
| **Name** | Printing Platform |
| **Purpose** | Distributed print topology, printer catalog, connector network, jobs. |
| **Business Value** | Ticket/receipt printing at venues. |
| **Owner Domain** | Printing Platform |
| **Aggregate Owner** | Printer catalog + print jobs (not Order) |
| **SSOT** | ADR-ARCH-016/017 |
| **Read Models** | Print workspace |
| **Runtime Services** | print workspace/connector/management; Order print consumers |
| **Public APIs** | `printWorkspace.*`, `printConnector.*`, `printerManagement.*` |
| **Events Published** | OPS `print_*` |
| **Events Consumed** | Order domain events |
| **Dependencies** | Order, Device/Connector, Document Identity (phased) |
| **Dependents** | Ops print UI, connectors |
| **Current Status** | **Production** (Partial validation per ADR-016) |
| **Future Roadmap Notes** | Production validation completion |

---

## CAP-28 — Realtime Platform

| Field | Content |
|-------|---------|
| **Name** | Realtime Platform |
| **Purpose** | Protocol, channels, capabilities, hints, tickets, sequencing for live UX. |
| **Business Value** | Low-latency ops/kitchen/ordering updates. |
| **Owner Domain** | Realtime Platform |
| **Aggregate Owner** | Connection/ticket runtime (not business entities) |
| **SSOT** | `shared/realtime-platform`; realtime architecture programs |
| **Read Models** | Hints/capabilities |
| **Runtime Services** | `server/realtime-platform` |
| **Public APIs** | `realtime.*` |
| **Events Published** | OPS `realtime_*` |
| **Events Consumed** | Domain signals as publishers feed hints |
| **Dependencies** | Auth tickets |
| **Dependents** | Ordering Client, Kitchen, Ops, Device connectivity consumers |
| **Current Status** | **Production** (production enablement claimed) |
| **Future Roadmap Notes** | Device/Performance consume Realtime observability SSOT |

---

## CAP-29 — Device Management Platform

| Field | Content |
|-------|---------|
| **Name** | Device Management |
| **Purpose** | Operational device identity/lifecycle metadata. |
| **Business Value** | Manage venue devices (screens, connectors). |
| **Owner Domain** | Device Platform |
| **Aggregate Owner** | Operational devices |
| **SSOT** | `shared/device-management-platform` ownership; `operational_devices` |
| **Read Models** | Device admin |
| **Runtime Services** | `server/operational-device` |
| **Public APIs** | `operationalDevice.*` |
| **Events Published** | Device lifecycle OPS |
| **Events Consumed** | Realtime connectivity SSOT |
| **Dependencies** | Realtime, Tenant |
| **Dependents** | Screen pairing, Print connectors |
| **Current Status** | **Development** / Architecture-forward (shared package ownership strong; maturity architecture/reserved language) |
| **Future Roadmap Notes** | Must not own business financial/order entities |

---

## CAP-30 — Screen Pairing & Operational Screens

| Field | Content |
|-------|---------|
| **Name** | Screen Pairing / Operational Screens |
| **Purpose** | Pair operational screens with codes/credentials for floor displays. |
| **Business Value** | Deploy guest/ops screens safely. |
| **Owner Domain** | Device / Screen ops |
| **Aggregate Owner** | Screen credentials/pairing |
| **SSOT** | Screen pairing/credential governance programs |
| **Read Models** | Screen client apps |
| **Runtime Services** | Pairing APIs; client `pages/screen` |
| **Public APIs** | Via ops/device/auth surfaces |
| **Events Published** | OPS `pairing_code_*`, `operational_screen_created` |
| **Events Consumed** | Realtime |
| **Dependencies** | CAP-29, CAP-28, Auth |
| **Dependents** | Screen UIs |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Credential governance hardening |

---

## CAP-31 — Waiter Ordering

| Field | Content |
|-------|---------|
| **Name** | Waiter Ordering |
| **Purpose** | Waiter operational UX workflows consuming Order/Session. |
| **Business Value** | Staff-assisted ordering on floor. |
| **Owner Domain** | Waiter Platform (presentation) |
| **Aggregate Owner** | None |
| **SSOT** | Waiter architecture/foundation programs |
| **Read Models** | Waiter pages |
| **Runtime Services** | `waiter` router + client waiter pages |
| **Public APIs** | `waiter.*` |
| **Events Published** | — |
| **Events Consumed** | Order/Session/Realtime |
| **Dependencies** | CAP-01, CAP-03, CAP-07, Entitlements |
| **Dependents** | Floor ops |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Keep domain logic out of UI |

---

## CAP-32 — Self-Ordering Kiosk

| Field | Content |
|-------|---------|
| **Name** | Self-Ordering Kiosk |
| **Purpose** | Guest kiosk browse/cart/checkout channel. |
| **Business Value** | Unattended ordering throughput. |
| **Owner Domain** | Kiosk channel (Ordering Client consumer) |
| **Aggregate Owner** | None |
| **SSOT** | Kiosk architecture; ADR-018/019 identity |
| **Read Models** | Kiosk pages |
| **Runtime Services** | Kiosk client + ordering APIs |
| **Public APIs** | Public kiosk routes + `ordering.*` |
| **Events Published** | — |
| **Events Consumed** | Order/Realtime |
| **Dependencies** | CAP-03, CAP-04, CAP-05, Entitlements |
| **Dependents** | — |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Journey identity invariant |

---

## CAP-33 — Counter Pickup / Self-Ordering Counter

| Field | Content |
|-------|---------|
| **Name** | Counter Pickup Ordering |
| **Purpose** | Counter/self-order pickup channel architecture. |
| **Business Value** | Quick-service pickup flows. |
| **Owner Domain** | Ordering channels |
| **Aggregate Owner** | None |
| **SSOT** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 |
| **Read Models** | Channel UI as adopted |
| **Runtime Services** | Ordering platform channel |
| **Public APIs** | Ordering channel surfaces |
| **Events Published** | — |
| **Events Consumed** | Order |
| **Dependencies** | CAP-03, CAP-04 |
| **Dependents** | — |
| **Current Status** | **Development** / Architecture (verify UI adoption in coverage) |
| **Future Roadmap Notes** | Confirm runtime vs architecture-only |

---

## CAP-34 — Customer Notifications & Push

| Field | Content |
|-------|---------|
| **Name** | Customer Notifications & Web Push |
| **Purpose** | Customer push subscriptions and notification delivery; renewal emails. |
| **Business Value** | Guest order updates; commercial renewal outreach. |
| **Owner Domain** | Notifications / Integration |
| **Aggregate Owner** | Push subscriptions table |
| **SSOT** | `customer_push_subscriptions`; VAPID web-push |
| **Read Models** | — |
| **Runtime Services** | `server/customerPush`; notification router; Order notification consumers |
| **Public APIs** | `notification.*`; push endpoints |
| **Events Published** | OPS EMAIL/notification |
| **Events Consumed** | Order domain events; subscription renewal triggers |
| **Dependencies** | Order, Subscription |
| **Dependents** | Guest UX |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Stronger domain event boundaries |

---

## CAP-35 — Platform Operations & Admin

| Field | Content |
|-------|---------|
| **Name** | Platform Operations & Admin |
| **Purpose** | Admin dashboard, tenants, commercial ops, security, platform ops workspace, events UI. |
| **Business Value** | Operate the SaaS platform. |
| **Owner Domain** | Administration |
| **Aggregate Owner** | None (cross-cutting presentation + admin APIs) |
| **SSOT** | Platform Ops UI foundation programs; commercial audit domain map |
| **Read Models** | Admin dashboard read routers |
| **Runtime Services** | `admin` merge router; `ops` router |
| **Public APIs** | `admin.*`, `ops.*`, `analytics.*`, `publicStats.*`, `contact.*` |
| **Events Published** | ADMIN/TENANT OPS; audit |
| **Events Consumed** | Audit store |
| **Dependencies** | Auth, all domain APIs |
| **Dependents** | Operators |
| **Current Status** | **Production** (Live nav honesty for Overview/Commercial/Analytics/Tenants/Security/Ops) |
| **Future Roadmap Notes** | Health Architecture; AI ops planned |

---

## CAP-36 — Audit & Ops Taxonomy

| Field | Content |
|-------|---------|
| **Name** | Audit & Ops Taxonomy |
| **Purpose** | Canonical OPS event names; dual-write audit persistence. |
| **Business Value** | Security/compliance observability. |
| **Owner Domain** | Observability / Security |
| **Aggregate Owner** | `audit_events` |
| **SSOT** | `server/_core/opsTaxonomy.ts`, `opsLog.ts`, `auditEmitter` |
| **Read Models** | Admin platform events |
| **Runtime Services** | Audit repositories |
| **Public APIs** | Admin audit router |
| **Events Published** | Taxonomy events (meta) |
| **Events Consumed** | All emitters |
| **Dependencies** | DB |
| **Dependents** | Security, Commercial audit, Subscription audit |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Taxonomy is naming SSOT, not validation framework |

---

## CAP-37 — Data Retention & Archival (DRAP)

| Field | Content |
|-------|---------|
| **Name** | Data Retention & Archival |
| **Purpose** | Display windows, operational retention, cold archive, restore, purge policy authority. |
| **Business Value** | Compliance and storage cost control; Settlement Records permanent. |
| **Owner Domain** | DRAP (policy); domains own data |
| **Aggregate Owner** | None |
| **SSOT** | ADR-ARCH-031; `shared/data-retention` |
| **Read Models** | Shift display window/archive report |
| **Runtime Services** | DRAP lib + Financial Shift adoption |
| **Public APIs** | Domain-embedded |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | CAP-16/17 |
| **Dependents** | Shift retention UI |
| **Current Status** | **Development** / Partial (platform + Shift; cold store/purge not started) |
| **Future Roadmap Notes** | Cold archive & purge |

---

## CAP-38 — Performance Platform

| Field | Content |
|-------|---------|
| **Name** | Performance Platform |
| **Purpose** | Performance presentation/aggregation architecture; consume Realtime observability. |
| **Business Value** | Platform performance insight. |
| **Owner Domain** | Performance / Observability |
| **Aggregate Owner** | None (must not own business entities) |
| **SSOT** | `shared/performance-platform` |
| **Read Models** | Performance views (as adopted) |
| **Runtime Services** | Architecture-forward |
| **Public APIs** | Limited / reserved |
| **Events Published** | — |
| **Events Consumed** | Realtime metrics SSOT |
| **Dependencies** | Realtime |
| **Dependents** | Ops health |
| **Current Status** | **Experimental** / Architecture |
| **Future Roadmap Notes** | Implementation pending beyond architecture |

---

## CAP-39 — Operations Runtime Platform

| Field | Content |
|-------|---------|
| **Name** | Operations Runtime Platform |
| **Purpose** | Job/queue/worker/runtime diagnostics architecture (not business event ownership). |
| **Business Value** | Reliable background processing model. |
| **Owner Domain** | Infrastructure |
| **Aggregate Owner** | None |
| **SSOT** | `shared/operations-runtime-platform` |
| **Read Models** | Runtime diagnostics |
| **Runtime Services** | Overlaps Order outbox workers in practice |
| **Public APIs** | — |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | — |
| **Dependents** | Event consumers conceptually |
| **Current Status** | **Experimental** / Architecture |
| **Future Roadmap Notes** | Clarify vs Order outbox ownership |

---

## CAP-40 — Event Delivery & Consumer Idempotency

| Field | Content |
|-------|---------|
| **Name** | Event Delivery & Idempotency Governance |
| **Purpose** | Outbox delivery guarantees; consumer idempotency registration. |
| **Business Value** | Exactly-once-effect processing for Order consumers. |
| **Owner Domain** | Order Platform / Event governance |
| **Aggregate Owner** | Outbox + `order_domain_consumer_processed` |
| **SSOT** | ADR-ARCH-008/014/021 |
| **Read Models** | Consumer processed markers |
| **Runtime Services** | Relay, publisher, consumer registry |
| **Public APIs** | — |
| **Events Published** | Relay OPS metrics |
| **Events Consumed** | Outbox rows |
| **Dependencies** | CAP-01 |
| **Dependents** | Kitchen, Print, Session, Notifications, Projections |
| **Current Status** | **Certified** (ADR-014 Implemented; ADR-021 Partial) |
| **Future Roadmap Notes** | Multi-pattern checklist completion |

---

## CAP-41 — Media & Object Storage

| Field | Content |
|-------|---------|
| **Name** | Media & Object Storage |
| **Purpose** | Store menu images and assets (Cloudflare R2). |
| **Business Value** | Media for catalogs and branding. |
| **Owner Domain** | Infrastructure / Media |
| **Aggregate Owner** | Object keys; entity image refs |
| **SSOT** | `server/storage`, `shared/entityImage.ts` |
| **Read Models** | CDN/public URLs |
| **Runtime Services** | R2 provider |
| **Public APIs** | Via restaurant/menu upload paths |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | Cloudflare R2 |
| **Dependents** | Menu Catalog |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | — |

---

## CAP-42 — Country & Currency Reference

| Field | Content |
|-------|---------|
| **Name** | Country & Currency Reference |
| **Purpose** | Country/currency reference data for commercial localization and billing. |
| **Business Value** | Correct regional currency presentation and policies. |
| **Owner Domain** | Platform reference data |
| **Aggregate Owner** | `countries_currencies` |
| **SSOT** | DB + `countryCurrency` router; Catalog localization consumes |
| **Read Models** | Selectors |
| **Runtime Services** | `countryCurrency` router |
| **Public APIs** | `countryCurrency.*` |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | — |
| **Dependents** | Commercial Catalog localization, Reporting currency snapshots |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Keep Catalog regional policies separate from this reference table |

---

## CAP-43 — Commercial Analytics

| Field | Content |
|-------|---------|
| **Name** | Commercial Analytics |
| **Purpose** | Platform commercial analytics for admins (distinct from restaurant Reporting KPIs). |
| **Business Value** | SaaS business metrics. |
| **Owner Domain** | Administration / Commercial |
| **Aggregate Owner** | Derived |
| **SSOT** | `server/commercial/analyticsRouter.ts` |
| **Read Models** | Admin analytics |
| **Runtime Services** | analytics router |
| **Public APIs** | `analytics.*` |
| **Events Published** | — |
| **Events Consumed** | Subscription/commercial facts |
| **Dependencies** | CAP-21, CAP-35 |
| **Dependents** | Admin UI |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | Avoid conflating with Reporting Platform KPIs |

---

## CAP-44 — Architecture Governance

| Field | Content |
|-------|---------|
| **Name** | Architecture Governance |
| **Purpose** | Constitutions, ADRs, program governance, certification ops, ARB. |
| **Business Value** | Platform coherence and production certification process. |
| **Owner Domain** | Architecture Authority |
| **Aggregate Owner** | Documents |
| **SSOT** | `docs/architecture/**` |
| **Read Models** | — |
| **Runtime Services** | Pre-commit / governance programs (process) |
| **Public APIs** | — |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | — |
| **Dependents** | All platforms |
| **Current Status** | **Certified** (governance implemented; engineering compliance ongoing) |
| **Future Roadmap Notes** | Annual architecture review; keep domain landscape current |

---

## CAP-45 — AI Assistant (Entitlement Reserved)

| Field | Content |
|-------|---------|
| **Name** | AI Assistant |
| **Purpose** | Planned AI operations / assistant capability. |
| **Business Value** | Future operator/merchant assistance. |
| **Owner Domain** | Planned AI Operations |
| **Aggregate Owner** | — |
| **SSOT** | Entitlement keys reserved in Subscription architecture (`feature.ai_assistant`, `limit.ai_usage`); PLATFORM-P0 future program note |
| **Read Models** | — |
| **Runtime Services** | **None found** |
| **Public APIs** | — |
| **Events Published** | — |
| **Events Consumed** | — |
| **Dependencies** | Entitlements (future) |
| **Dependents** | — |
| **Current Status** | **Planned** |
| **Future Roadmap Notes** | `AI-OPERATIONS-PLATFORM-ARCHITECTURE-1` (referenced as future) |

---

## CAP-46 — Order Lifecycle Latency

| Field | Content |
|-------|---------|
| **Name** | Order Lifecycle Latency |
| **Purpose** | Measure and contract order lifecycle stage latency. |
| **Business Value** | Ops SLO visibility. |
| **Owner Domain** | Observability / Order |
| **Aggregate Owner** | Metrics contracts |
| **SSOT** | `shared/order-lifecycle-latency` |
| **Read Models** | Latency aggregations |
| **Runtime Services** | Latency instrumentation on order path |
| **Public APIs** | Embedded metrics / OPS |
| **Events Published** | OPS lifecycle latency |
| **Events Consumed** | Order lifecycle |
| **Dependencies** | CAP-01 |
| **Dependents** | Ops health |
| **Current Status** | **Production** |
| **Future Roadmap Notes** | — |

---

## Index of capabilities

| ID | Name | Status (catalog) |
|----|------|------------------|
| CAP-01 | Order Platform | Production |
| CAP-02 | Order Read Model | Production |
| CAP-03 | Ordering Platform | Production |
| CAP-04 | Ordering Client Platform | Certified |
| CAP-05 | Menu & Restaurant Catalog | Production |
| CAP-06 | Table Platform | Production |
| CAP-07 | Operational Session | Production |
| CAP-08 | Check / Financial Settlement | Production |
| CAP-09 | Order Settlement | Production |
| CAP-10 | Split Payment | Production |
| CAP-11 | Multi-Check Allocation | Production |
| CAP-12 | Settlement Record | Certified |
| CAP-13 | Refund Platform | Certified |
| CAP-14 | Financial Core Capabilities | Certified |
| CAP-15 | Operational Document Identity | Production |
| CAP-16 | CRMP | Certified |
| CAP-17 | Financial Shift Lifecycle | Certified |
| CAP-18 | Financial Custody Plane | Certified |
| CAP-19 | Commercial Catalog | Production |
| CAP-20 | Snapshot Entitlement Authority | Certified |
| CAP-21 | Subscription Platform | Production |
| CAP-22 | Reporting Platform | Production |
| CAP-23 | SaaS Billing Providers | Production |
| CAP-24 | Tenant Identity | Production |
| CAP-25 | Auth & RBAC | Production |
| CAP-26 | Kitchen Display | Production |
| CAP-27 | Printing Platform | Production |
| CAP-28 | Realtime Platform | Production |
| CAP-29 | Device Management | Development |
| CAP-30 | Screen Pairing | Production |
| CAP-31 | Waiter Ordering | Production |
| CAP-32 | Self-Ordering Kiosk | Production |
| CAP-33 | Counter Pickup | Development |
| CAP-34 | Notifications & Push | Production |
| CAP-35 | Platform Ops & Admin | Production |
| CAP-36 | Audit & Ops Taxonomy | Production |
| CAP-37 | Data Retention (DRAP) | Development |
| CAP-38 | Performance Platform | Experimental |
| CAP-39 | Operations Runtime Platform | Experimental |
| CAP-40 | Event Delivery & Idempotency | Certified |
| CAP-41 | Media & Storage | Production |
| CAP-42 | Country & Currency | Production |
| CAP-43 | Commercial Analytics | Production |
| CAP-44 | Architecture Governance | Certified |
| CAP-45 | AI Assistant | Planned |
| CAP-46 | Order Lifecycle Latency | Production |

**Total cataloged:** 46 capabilities.
