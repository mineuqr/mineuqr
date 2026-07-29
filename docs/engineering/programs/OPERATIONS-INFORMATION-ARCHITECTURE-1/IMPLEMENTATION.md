# IMPLEMENTATION — OPERATIONS-INFORMATION-ARCHITECTURE-1

**Date:** 2026-07-28  
**Type:** Platform Information Architecture (navigation only)

## Navigation

- Removed top-level **Health Center** (`showInNav: false`)
- Added **Platform Operations** at `/admin/platform` (sidebar label: Operations / العمليات)
- Business management remains at `/admin/operations` (URL stable, hidden from sidebar; reachable via Tenants / Accounts shortcuts)

## Workspace sections

| Section | Path | Status |
|---|---|---|
| Overview | `/admin/platform` | Live |
| Realtime Platform | `/admin/platform/realtime` | Live (observability APIs) |
| System Health | `/admin/platform/health` | Live (migrated placeholder) |
| Performance | `/admin/platform/performance` | Reserved |
| Devices | `/admin/platform/devices` | Reserved |
| Background Jobs | `/admin/platform/jobs` | Reserved |
| Event Pipeline | `/admin/platform/events` | Reserved |
| Audit Logs | `/admin/platform/audit` | Reserved |
| Diagnostics | `/admin/platform/diagnostics` | Reserved |

## Redirects

`/admin/health` → `/admin/platform/health`

## Unchanged

Business logic, APIs, permissions, realtime transport, observability collectors, health rules.
