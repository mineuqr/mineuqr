# Capability Classification Matrix — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

Normative code: `DISCOVERY_CAPABILITY_CLASSIFICATION` in `shared/commercial-capability/registry.ts`.

Every Discovery capability (CAP-01…46) is classified as **exactly one** of:

- `commercializable`
- `internal_only`

No undefined class is allowed.

---

## Commercializable (19)

| CAP | Name | In filter vocabulary |
|-----|------|----------------------|
| CAP-03 | Ordering Platform | Yes |
| CAP-04 | Ordering Client | Yes |
| CAP-05 | Menu & Restaurant | Yes |
| CAP-06 | Table | Yes |
| CAP-08 | Check Settlement | Yes |
| CAP-10 | Split Payment | No (backlog) |
| CAP-11 | Multi-Check Allocation | No |
| CAP-13 | Refund | No |
| CAP-16 | CRMP | No |
| CAP-17 | Financial Shift | No |
| CAP-22 | Reporting | Yes |
| CAP-26 | Kitchen | No |
| CAP-27 | Printing | No |
| CAP-28 | Realtime | No |
| CAP-29 | Device Mgmt | No |
| CAP-30 | Screen Pairing | No |
| CAP-31 | Waiter | Yes |
| CAP-32 | Kiosk | Yes |
| CAP-33 | Counter Pickup | No |
| CAP-34 | Notifications | Yes |
| CAP-45 | AI Assistant | No (planned) |

*Count of commercializable rows in registry = listCommercializableDiscoveryCaps().*

---

## Internal Only (remainder of 46)

Includes Order write/read core (CAP-01/02 as internal platform), Auth/RBAC, Commercial Catalog itself, Snapshot Authority, Billing Providers, Platform Ops, Audit, DRAP, Performance, Media Storage, Architecture Governance, etc.

Internal capabilities **MUST NOT** appear as Plan filter toggles.

---

## Filter plane classification

All 18 `COMMERCIAL_CAPABILITY_FILTER_KEYS` are `commercializable` with `inFilterVocabulary: true` and `productionImplemented: true`.
