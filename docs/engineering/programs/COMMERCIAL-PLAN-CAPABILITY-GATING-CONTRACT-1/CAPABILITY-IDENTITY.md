# CAPABILITY IDENTITY

One canonical key per capability. UI = catalog = runtime = `requireFeature` argument.

| Capability | Canonical key | Display (en) | Domain meaning | API meaning | Catalog meaning |
|------------|---------------|--------------|----------------|-------------|-----------------|
| Session Management | `sessionTableManagement` | Session Management | Dining-session **management** (pay / complimentary / close / owner workspace) | Gated `session.*` **mutations** and owner session **management reads** | Projection ID on the plan bundle |
| Menu & Items | `menuManagement` | Menu & Item Management | Restaurant catalog **management** | Gated `category.*` / `menuItem.*` / `offer.*` mutations | Same |
| Menu Design | `menuDesign` | Menu Design | Appearance **editing** | Gated template / colors / fonts / branding image **writes** | Same |
| QR Codes | `smartQr` | QR Codes | QR **identity management** (tables as QR anchors + dashboard QR tools) | Gated `table` create/update/delete + QR management writes | Same |

Do **not** introduce aliases (`sessionManagement`, `qrCodes` as a **feature**).  
`qrCodes` remains a **limit** key only (`checkLimit`). Quota ≠ capability.

Discovery CAP-05/06/07 stay documentation links on the presentation cards. They are not a second runtime identity.

`FEATURE_KEYS` must include these four after they join Projection (existing rule: FEATURE_KEYS = Projection ∪ legacy compat). FULL_PLATFORM then grants them automatically.
