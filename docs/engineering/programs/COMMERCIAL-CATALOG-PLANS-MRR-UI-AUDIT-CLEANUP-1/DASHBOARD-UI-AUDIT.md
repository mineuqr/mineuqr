# DASHBOARD-UI-AUDIT.md

| Surface | Class | Enforcement |
|---------|-------|-------------|
| Current plan / expiry warning | VISIBLE | Hub context |
| Feature tabs (devices, reports, …) | CONDITIONAL | Client `hasFeature` — presentation |
| Upgrade banners | VISIBLE | Devices + Reports |
| Locked features | VISIBLE banners | Not authorization |
| Frozen | HIDDEN dashboard | Redirect `/pricing` (`useFrozenCommercialRouteGuard`) |
| Owner simulation control | VISIBLE if owner | Owner access API |
| Pricing CTA | VISIBLE | Links `/pricing` |
| Direct URL `/dashboard` | DIRECTLY ACCESSIBLE if auth | FROZEN redirected; mutations still server-blocked |

Hidden UI does not imply server authorization. Device mutations use `requireFeature("devices")`. Most other commercial tabs are flags_only on the server.
