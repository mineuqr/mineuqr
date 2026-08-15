# ROUTE-AUDIT.md

| Route | Protection | Commercial state |
|-------|------------|------------------|
| `/pricing` | Public + auth extras | Allowed FROZEN / NONE |
| `/subscription` | Auth | Allowed FROZEN (renewal) |
| `/dashboard/*` | Auth + Frozen redirect | ACTIVE |
| `/statistics` | Auth + Frozen path list | ACTIVE |
| `/admin/platform/commercial-catalog` | Admin | Catalog ops |
| `/admin/commercial` | Admin | MRR / commercial overview |
| `/menu/:slug` | Public | Frozen public experience |
| `/commercial/diagnostics` | Auth, no nav | Hidden |

tRPC: `verifiedProcedure` = auth + email policy + Frozen mutation block.  
`protectedProcedure` = auth only (reads).  
`adminProcedure` = admin role (not a commercial grant).

Restaurant create: verified + Frozen + `assertRestaurantCreateAllowed` (no admin quota skip).
