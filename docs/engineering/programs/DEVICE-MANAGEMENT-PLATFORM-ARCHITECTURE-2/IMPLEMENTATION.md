# IMPLEMENTATION — DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2

**Type:** Platform Architecture / Foundation  
**Mode:** Architecture-Governed Investigation & Foundation  
**Constraints:** No provisioning implementation · No remote management · No updates · No auth redesign · No runtime/API/business-logic changes · No commit · No push · No deploy

---

## Artifacts

| Path | Role |
|---|---|
| `shared/device-management-platform/*` | Architecture SSOT (domains, identity, lifecycle, provisioning reserved, assignment, config, health, connectivity, inventory, diagnostics, security, updates reserved, dashboard, integrations, ownership) |
| `client/src/components/admin/platform-ops/PlatformOpsDevicesComposition.tsx` | Platform Ops Devices presentation (platform-ops-ui only) |
| `client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx` | Wires Devices composition |
| `client/src/lib/admin/platform-ops/platformOpsSections.ts` | `devices` status → `live` |
| `client/src/locales/{en,ar}.json` | Devices architecture i18n |
| `shared/device-management-platform/__tests__/deviceManagementPlatformArchitecture.architecture.guards.test.ts` | Architecture guards |

---

## Non-goals (explicit)

- Device provisioning / enrollment runtime
- Remote management
- Device updates / rollback execution
- Authentication redesign
- API, business logic, or Realtime transport changes
- Duplicate collectors

---

## Guards

```bash
npx vitest run shared/device-management-platform/__tests__/deviceManagementPlatformArchitecture.architecture.guards.test.ts
```

---

## UI

- Host path: `/admin/platform/devices` (existing IA)
- Foundation: `platform-ops-ui` exclusively
- Nested Devices routes: deferred
