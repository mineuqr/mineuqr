# COMMERCIAL READ PATH

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** read-only application + database.

## Deployed application

| Probe | Result |
|-------|--------|
| `commercialCatalog.public.status` | HTTP 200 — entitlement authority = subscription-runtime |
| `commercialCatalog.public.listOfferings` | HTTP 200 — three Live Plan UUIDs |

Public catalog limits match Production `commercial_limit_values`:

| planCode | planId | restaurants | categories | items | posTerminals |
|----------|--------|-------------|------------|-------|--------------|
| basic | `79cf7bf7-…493ac` | 1 | 10 | 100 | **absent** |
| professional | `0ade795a-…ade09` | 1 | 25 | 500 | **absent** |
| enterprise | `d836bd10-…d785a` | 1 | 100 | unlimited (`null`) | **absent** |

## Database commercial counts

plans 3, profiles 3, limit values 9, bindings 4, subscriptions 8.

`checkLimit()` fail-closes a missing key (`limit_key_unsupported` / denied). Missing `posTerminals` on all sellable Live Plans is the already-classified **REQUIRED BEFORE POS COMMERCIAL USE** condition. Not a deployment regression. Plans were not seeded or modified.

Subscription / plan resolution remains operational. Cap authority remains `checkLimit()` → Live Plan limit values for the owner’s current binding.
