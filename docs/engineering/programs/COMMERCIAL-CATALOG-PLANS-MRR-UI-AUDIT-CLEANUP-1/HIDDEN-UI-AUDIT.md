# HIDDEN-UI-AUDIT.md

| Surface | Visible | Hidden | Locked | Direct URL | Server enforced |
|---------|---------|--------|--------|------------|-----------------|
| `/pricing` | Y | | Owner checkout locked | Y | Charge uses legacy plans; entitlements separate |
| `/dashboard` | Y if ACTIVE | FROZEN redirect | Feature tabs via hasFeature | Y | Partial (devices, limits, ordering, Frozen) |
| `/subscription` | Y | | Cancel stub | Y | Reads; cancel not implemented |
| `/commercial/diagnostics` | No nav | Y | | Y if auth | Diagnostics only |
| Plan Editor | Admin platform | | Foundation caps hidden | Admin route | `assertAdminAccess` + `saveLive` |
| Devices | If entitled | Else banner | | Dashboard section | `requireFeature("devices")` |
| Register / kitchen / reports | If flags | | | Dashboard | **NOT ENFORCED** on most mutations |
| Limits on Pricing | | Y (API only) | | n/a | Create-path enforced |
| Version compare / clone / publish diff | Stub text | | | Catalog experience tabs | N/A (retired) |

Capability UI without server enforcement: most projection cards.  
Server endpoints without matching UI gate: device APIs are aligned; settlement/register are under-gated.
