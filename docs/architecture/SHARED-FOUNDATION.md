# Shared Foundation Architecture

Post-RESET-1 canonical layout for cross-cutting utilities and types.

## Layer boundaries

| Layer | Path | Responsibility |
|---|---|---|
| **Shared kernel** | `shared/` | Types, constants, and platform-neutral utilities consumed by client and server |
| **Commercial authority** | `src/lib/commercial/` | Plan matrix, feature keys, entitlement resolution (imported as `@commercial/*`) |
| **Client adapters** | `client/src/lib/` | UI formatting, browser storage, dashboard copy — re-export shared where applicable |
| **Server adapters** | `server/lib/` | Thin re-exports for stable server import paths |

Order, Restaurant, Menu, Auth, and Payments domains are **not** in `shared/` — they live in their respective runtime layers.

## Canonical shared modules

### Types and constants

- `shared/types.ts` — barrel for schema types, errors, account classification
- `shared/const.ts` — session cookie, auth error messages
- `shared/platformAccount.ts` — platform protection helpers
- `shared/accountClassification.ts` — COMMERCIAL / INTERNAL / SYSTEM taxonomy

### Utilities (`shared/utils/`)

| Module | Canonical for | Client adapter | Server adapter |
|---|---|---|---|
| `timezone.ts` | UTC storage, restaurant TZ display | `client/src/lib/datetime.ts` | `server/lib/restaurantHours.ts` (partial) |
| `restaurantHours.ts` | Open/closed logic | `client/src/lib/restaurantHours.ts` | `server/lib/restaurantHours.ts` |
| `textScript.ts` | Arabic script detection | `client/src/lib/currencyLocale.ts` | — |

Client and server adapter files are **re-export layers only** — do not duplicate logic there.

## Retired (RESET-1)

The following are permanently removed and must not be reintroduced:

- `shared/printing/` — thermal printing domain
- `server/printing/`, `server/print-host/`, `agent/`
- Printing commercial feature keys: `thermalPrinting`, `autoPrint`, `reprint`
- Printing database tables (purged via `drizzle/0043_print_purification.sql`)

## Import conventions

```ts
// Shared utilities
import { containsArabicScript } from "@shared/utils/textScript";
import { formatInRestaurantTimezone } from "@shared/utils/timezone";
import { isRestaurantOpen } from "@shared/utils/restaurantHours";

// Commercial authority (isomorphic)
import { FEATURE_KEYS } from "@commercial/featureKeys";
```

## Commercial test clock

Server commercial integration tests use a frozen clock:

- `server/commercial/__tests__/commercialTestFixtures.ts`
- `COMMERCIAL_TEST_NOW` + `installCommercialTestClock()`

Router-level tests must install the clock because procedures default to `new Date()`.
