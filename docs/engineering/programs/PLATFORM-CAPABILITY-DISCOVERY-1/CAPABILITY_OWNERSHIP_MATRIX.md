# CAPABILITY OWNERSHIP MATRIX

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Date** | 2026-07-30 |

> Primary DB objects are indicative (from `drizzle/schema.ts` + commercial schema). Services/APIs list dominant surfaces, not every helper.

| Capability | Owner Domain | Aggregate Owner | Primary Database Objects | Read Models | Services | API Surface | SSOT Source |
|------------|--------------|-----------------|--------------------------|-------------|----------|-------------|-------------|
| CAP-01 Order Platform | Order | Order AR | `orders`, `order_items`, `order_domain_outbox` | via CAP-02 | Place/Advance, relay | `order.*` | ADR-001/007; Order blueprint |
| CAP-02 Order Read Model | Order (read) | Projections | `order_read_*`, backfill runs | Order read tables | Projection consumers | `order.read.*` | READ-ARCHITECTURE / ORDERS-READ-MODEL-1 |
| CAP-03 Ordering Platform | Ordering | Channel contracts | channel metadata (via orders/sessions) | Fulfilment labels | ordering-platform | `ordering.*` | `shared/ordering-platform`; ADR-018/019 |
| CAP-04 Ordering Client | Ordering Client | — | — | Client caches | `lib/ordering-client` | consumes ordering/order | ADR-018 |
| CAP-05 Menu & Restaurant | Menu/Restaurant | Restaurant catalog | `restaurants`, `categories`, `menu_items`, `offers`, `restaurant_holidays` | Public menu | routers in `routers.ts` | `restaurant.*` `category.*` `menuItem.*` `offer.*` `holiday.*` | DB + Menu ACL practice |
| CAP-06 Table | Table | Table | `restaurant_tables`, `table_events` | Floor boards | table services | `table.*` | TABLE-PLATFORM-* |
| CAP-07 Operational Session | Session | Dining Session | `dining_sessions` | Session aggregates | operational-session, diningSession | `session.*` | `shared/operational-session` |
| CAP-08 Check Settlement | Settlement | Check AR | `operational_checks`, check settlement family | Settlement ledger views | Check services | `orderSettlement.*` + check façades | ADR-020/022/023 |
| CAP-09 Order Settlement | Settlement | Check | settlement entities under check | orderSettlement reads | check settlement | `orderSettlement.*` | ADR-022 |
| CAP-10 Split Payment | Settlement | Check (Payment≠AR) | split payment tables | split reads | split-payment domain | `splitPayment.*` | ADR-024 |
| CAP-11 Multi-Check Allocation | Settlement | Check (Alloc≠AR) | allocation tables | allocation reads | multi-check services | `multiCheckAllocation.*` | ADR-025 |
| CAP-12 Settlement Record | Settlement | Check publishes | `settlement_records` | SR presentation | SR services | `settlementRecord.*` | ADR-026 |
| CAP-13 Refund | Settlement | Check | refund docs/sequences | refund presentation | checkRefund | `checkRefund.*` | ADR-032 |
| CAP-14 Financial Core Language | Settlement | — | — | — | embodied in FSP | specialized APIs | ADR-023 |
| CAP-15 Document Identity | Cross-cutting | — | registry usage | formatters | ODI providers | embedded | ADR-027 + standard |
| CAP-16 CRMP | Register | Register / Shift | `crmp_registers`, shifts, drawer*, handovers, attributions | Register ops | `server/crmp` | `crmp.*` | ADR-028; `shared/crmp` |
| CAP-17 Financial Shift | Register | Financial Shift | shift tables | shift views | lifecycle services | via `crmp.*` | ADR-030 |
| CAP-18 Custody Plane | Register/Settlement gov | — | — | — | governance | — | ADR-033 |
| CAP-19 Commercial Catalog | Commercial Catalog | Catalog aggregates | `commercial_*` plans/versions/prices/… | Admin + public pricing | commercial-catalog services | `commercialCatalog.*` | `shared/commercial-catalog` ownership |
| CAP-20 Snapshot Authority | Subscription/Commercial | Snapshot + binding | `commercial_subscription_bindings`, snapshots | Entitlement views | commercial/* adoption | `commercial.*` | Snapshot Runtime Authority programs |
| CAP-21 Subscription | Subscription | Subscription rows | `user_subscriptions`, `subscription_plans`, `invoices` | Billing UI | subscription routers | `subscription.*` `invoice.*` | SUBSCRIPTION-PLATFORM-* OWNERSHIP |
| CAP-22 Reporting | Reporting | — | reporting stores as used | KPI/exports | reporting-platform | `reporting.*` | Reporting Constitutions; `shared/reporting-platform` |
| CAP-23 Billing Providers | Payments integration | External + local | webhook/subscription columns | Payment history | paypal/tap modules | webhooks + checkout mutations | Provider systems |
| CAP-24 Tenant Identity | Tenant Identity | Platform account graph | `users` + restaurant ownership | Admin tenants | access/classification | `admin.*` `auth.*` | TENANT-IDENTITY-* OWNERSHIP |
| CAP-25 Auth & RBAC | Identity/RBAC | User / roles | `users`, `auth_tokens` | Profile | auth-local | `auth.*` `profile.*` | RBAC-PLATFORM-* |
| CAP-26 Kitchen | Kitchen | — | kitchen read state | Kitchen queues | kitchen consumers | `kitchen.*` | ADR-012 consumer |
| CAP-27 Printing | Printing | Printer catalog / jobs | `print_jobs*`, printers, connectors | Print workspace | print-* modules | `printWorkspace.*` `printConnector.*` `printerManagement.*` | ADR-016/017 |
| CAP-28 Realtime | Realtime | Connection/tickets | (runtime) | hints | realtime-platform | `realtime.*` | `shared/realtime-platform` |
| CAP-29 Device Mgmt | Device | Operational device | `operational_devices`, tokens | Device admin | operational-device | `operationalDevice.*` | `shared/device-management-platform` |
| CAP-30 Screen Pairing | Device/Screen | Pairing credentials | screen/pairing stores | Screen clients | pairing services | ops/device surfaces | Screen governance programs |
| CAP-31 Waiter | Waiter (UX) | — | — | Waiter UI | waiter router | `waiter.*` | Waiter architecture |
| CAP-32 Kiosk | CX / Ordering | — | — | Kiosk UI | ordering client | public kiosk + ordering | Kiosk architecture |
| CAP-33 Counter Pickup | Ordering channels | — | — | Channel UI | ordering | ordering channel | Counter Pickup architecture |
| CAP-34 Notifications | Notifications | Push subscription | `customer_push_subscriptions` | — | customerPush; notification | `notification.*` | web-push + consumers |
| CAP-35 Platform Ops Admin | Administration | — | audit + cross reads | Admin dashboards | admin, ops | `admin.*` `ops.*` | Platform Ops UI programs |
| CAP-36 Audit & Ops Taxonomy | Observability/Security | Audit event | `audit_events` | Events UI | auditEmitter, opsLog | admin audit | `opsTaxonomy.ts` |
| CAP-37 DRAP | DRAP policy | — | retention metadata | Shift archive views | data-retention | embedded | ADR-031; `shared/data-retention` |
| CAP-38 Performance | Performance | — | — | Perf views | architecture | reserved | `shared/performance-platform` |
| CAP-39 Ops Runtime | Infrastructure | — | — | diagnostics | architecture | — | `shared/operations-runtime-platform` |
| CAP-40 Event Idempotency | Order/Event gov | Outbox processed | `order_domain_outbox`, `order_domain_consumer_processed` | — | relay/consumers | — | ADR-014/021 |
| CAP-41 Media Storage | Infrastructure | Object keys | object storage | CDN URLs | R2 provider | upload paths | `server/storage` |
| CAP-42 Country Currency | Reference data | CountryCurrency | `countries_currencies` | selectors | countryCurrency | `countryCurrency.*` | DB reference |
| CAP-43 Commercial Analytics | Admin/Commercial | Derived | commercial/subscription facts | Analytics UI | analyticsRouter | `analytics.*` | commercial analytics module |
| CAP-44 Architecture Governance | Architecture Authority | Documents | — | — | process | — | `docs/architecture` |
| CAP-45 AI Assistant | Planned AI | — | — | — | none | — | Entitlement keys reserved |
| CAP-46 Order Latency | Observability/Order | Metrics | — | aggregations | latency lib | OPS | `shared/order-lifecycle-latency` |
