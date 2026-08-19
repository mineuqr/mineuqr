# EVIDENCE-INDEX

**Program:** PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-PRODUCTION-VALIDATION-1  
**Collected:** 2026-08-19T20:49:06Z … 2026-08-19T20:51:54Z  
**Collector:** read-only GitHub Deployments API + GET on `https://www.mineuqr.com`  
**Mutations:** none (no sale, Confirm, Check, settlement, or schema write)

---

## E1 — Repository HEAD

| Field | Value |
|---|---|
| SHA | `29db3a1056f6849f62627acc1ed2c5a6bdaacf5d` |
| Subject | `fix(cashier): remove payment readiness display flicker` |
| Commit time | 2026-08-19 23:47:03 +0300 |
| Branch | `main` = `origin/main` |
| Working tree at collection | clean |

Lineage included in this SHA:

```
47efa288  ADR-038 architecture baseline
28774e00  Implementation charter
6fa141df  Runtime Confirm without pre-payment Check
f4d56cbd  Architecture guards
21d836da  Remaining test/guard updates
8f850ea0  Implementation report + Registry Partial
29db3a10  Preview vs Confirm display fix (HEAD)
```

---

## E2 — GitHub Production deployment

| Field | Value |
|---|---|
| Deployment id | `5990799776` |
| Environment | Production |
| SHA | `29db3a1056f6849f62627acc1ed2c5a6bdaacf5d` |
| Created | 2026-08-19T20:49:06Z |
| Status | `success` — “Deployment has completed” |
| Status target URL | `https://mineuqr-gqah2ehfr-mineuqr-s-projects.vercel.app` (unique deploy; historically SSO-protected) |

Previous Production deploy of implementation report SHA `8f850ea0`: id `5990387905` at 2026-08-19T20:21:41Z (superseded).

---

## E3 — Live origin probe

Origin: `https://www.mineuqr.com`

| Probe | Result |
|---|---|
| `GET /` | HTTP 200, title MineuQR, `Last-Modified: Wed, 19 Aug 2026 20:51:21 GMT` |
| `x-vercel-id` (HTML) | `cdg1::jdtb6-1787172714001-26f8813383bc` |
| Client asset | `/assets/index-D_-pARX3.js` |
| JS `Last-Modified` | Wed, 19 Aug 2026 20:49:11 GMT (5s after E2 created_at) |
| JS length | 4 567 583 bytes, HTTP 200 |
| `GET /api/realtime/health` | HTTP 200 `{ "program": "REALTIME-PLATFORM-FOUNDATION-1", "enabled": true, "connections": 5 }` |
| `x-correlation-id` (health) | `b387776f-65f9-4ed3-ab48-7f76a4332392` |
| `x-vercel-id` (health) | `cdg1::iad1::chqzg-1787172681724-cd8d82f5c6bb` |

Application runtime SHA is **not** exposed by an HTTP version endpoint (same as prior deploy programs). Identity is GitHub Production SHA + live bundle markers.

---

## E4 — Live client markers (ADR-038 + flicker fix)

Searched production `/assets/index-D_-pARX3.js`:

| Marker | Present | Meaning |
|---|---|---|
| `showCardOverTender` | **true** | CASHIER-PAYMENT-TRANSIENT-STATE-FIX-1 (not in `8f850ea0` UI contract) |
| `saleReady` | **true** | Confirm still gated on sale readiness |
| `cardOverTender` | **true** | Card/split copy retained |
| `CASHIER_PAYMENT_CONFIRM_CLICK` | **true** | Cashier Confirm timing instrumentation |
| `verifyingAmount` | **true** | Sale-in-flight copy |
| `settlementValid` | false (expected; local identifier minified) | — |

---

## E5 — Schema (repository only)

| Field | Value |
|---|---|
| Journal last tag in repo | `0095_check_charges` |
| New migration in ADR-038 / this program | **none** |
| Production `_journal` / information_schema | **not queried** (no production DB session) |

---

## E6 — Evidence not collected (blocking for remaining gates)

No authorized production Cashier session, restaurant/tenant id, or production database read was available in this program.

Missing:

- `orderId` / `checkId` before and after Confirm
- `pos.sale.create` / `pos.settlement.initiate` traces
- Check / Charges / ST / OS / SR rows
- Confirm click → response timestamps T0…T15
- Duplicate / concurrent Confirm samples
- Failed-Confirm atomicity sample
- Session/kiosk operational sample after this deploy
- Cashier preview screenshots (immediate vs settled)
- Production ops logs for `payment_confirm` / `pos_settlement_initiate`
- Tenant-scoped financial row proof

Do not invent these.
