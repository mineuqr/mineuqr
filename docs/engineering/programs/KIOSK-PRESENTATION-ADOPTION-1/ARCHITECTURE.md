# KIOSK-PRESENTATION-ADOPTION-1 — Architecture

**Program:** KIOSK-PRESENTATION-ADOPTION-1  
**Type:** Presentation Adoption (UI + Business Identity Presentation)  
**Status:** Implemented  

---

## 1. Root cause

Prior forensics (`OFFERS-RUNTIME-FORENSICS-1`, Order Number Source Audit) proved:

1. Special Offers already exist in Ordering Runtime / Browse — kiosk dropped them at `KioskBrowseStage`.
2. Operational cards already consume `presentation.identity.displayReference` when Business Identity is allocated.
3. Remaining gaps were presentation adoption and Business Identity **scope partitioning**, not a second numbering system.

User-facing kiosk surfaces could expose technical `dev_*` device ids when station scope was bound to device identity.

---

## 2. Architecture validation

| Concern | Owner (unchanged) |
|---------|-------------------|
| Order Aggregate | Ordering Platform |
| Runtime / Materializer | Ordering Runtime |
| Projection ownership | Order Read Model |
| Display identity generation | Business Identity infrastructure |
| Operational card identity | `presentation.identity.displayReference` |
| Kiosk screen identity | Screen / device identity (operational) |

Presentation components **only render** resolved values. They do not assemble `T` / `K` / `001` locally.

---

## 3. Business Identity scope model

Allocation key:

```
Business Day + Identity Scope
```

Approved scopes:

| Scope | Display code | Typical fulfilment |
|-------|--------------|--------------------|
| `TABLE` | `T` | table / table_service |
| `KIOSK` | `K` | station / counter (self-order) |

Format (owned by `DisplayReferenceFormatter`):

- Table: `T #001`
- Kiosk: `K #001`

Each scope restarts at `#001` at the start of every Business Day.

---

## 4. Identity separation

| Identity | Purpose | User-visible? |
|----------|---------|---------------|
| Kiosk screen / device id (`dev_*`) | Operational device binding | No (except engineering/debug) |
| Station scope key (`kiosk`) | Cart / channel binding | Internal |
| Customer/staff label (`طلب ذاتي`) | Fulfilment presentation | Yes |
| Order Business Identity (`K #001`) | Staff order reference | Yes via `displayReference` |

These must never be reused interchangeably.

---

## 5. Special Offers adoption

Kiosk browse adopts the same shared presentation path as QR Ordering:

- `MenuOffersTabBar`
- `OffersTabPanel` (with `canAddToCart` for kiosk)

No Runtime, Projection, or DTO contract redesign.
