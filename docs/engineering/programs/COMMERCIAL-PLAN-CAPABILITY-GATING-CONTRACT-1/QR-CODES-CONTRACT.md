# QR CODES CONTRACT

**Canonical key:** `smartQr`  
**HIGH-RISK.** Non-destructive. Distinct from FROZEN QR policy.

## Identity

QR identity today is `restaurant_tables` + restaurant slug. Dashboard QR download is largely **client-side** from the slug. Server authority for “having a QR” is **table identity**.

## Classification

| Operation | Procedure | Class |
|-----------|-----------|--------|
| Create table / QR identity | `table.create`, `table.createMultiple` | **GATED** |
| Edit table / QR configuration | `table.update` | **GATED** |
| Delete table / QR identity | `table.delete` | **GATED** |
| List tables for QR management | owner `table.list` / equivalent | **GATED** (management read) |
| Client PNG/SVG download of a public URL | Dashboard QR tab | **UI hide** — cannot meaningfully server-gate a public URL fetch; **creating** identities is the server gate |
| Public QR resolution (slug / table → restaurant) | public QR / table resolve | **NOT GATED** by `smartQr` |
| Public menu via QR | public menu | **NOT GATED** by `smartQr` |
| QR ordering | ordering / session open | **SEPARATE** (`ordering` + FROZEN) |
| `checkLimit("qrCodes")` | quota | **NOT** this capability |

## Required answers (locked)

| # | Question | Answer |
|---|----------|--------|
| A | Create new QR when OFF? | **No.** |
| B | Edit QR configuration when OFF? | **No.** |
| C | Regenerate QR when OFF? | **No** if regenerate is a management write (new token/slug/table). Client re-download of an existing public URL is not a new identity. |
| D | Delete QR when OFF? | **No.** |
| E | View existing QR in management UI when OFF? | **No** (management list gated). Public resolution of existing links: **Yes.** |
| F | Existing QR identity stored? | **Yes. Never delete as a gate.** |
| G | Public QR resolution continue? | **Yes** (unless FROZEN policy suspends menu/order). |
| H | Public menu remain accessible? | **Yes** via existing links, subject to FROZEN — **not** this capability. |
| I | QR ordering remain accessible? | **Yes** if `ordering` is ON and account is not FROZEN. `smartQr` OFF does not freeze ordering. |
| J | Existing QR links? | **Keep working** for resolution. Management cannot mint/change/delete them. |

## FROZEN vs this capability

| | FROZEN / expiry | `smartQr` OFF |
|--|-----------------|---------------|
| Intent | Account commercially invalid | Plan does not include QR **management** |
| Identity | Preserve | Preserve |
| Public menu/order | Existing expiry policy (suspend) | Unchanged by this key |
| Table CRUD | Already denied on FROZEN denylist where applied | Denied by `requireFeature` |

Do **not** implement `smartQr` OFF by applying FROZEN. Do **not** implement FROZEN by flipping `smartQr`.
