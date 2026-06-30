# PRINT-CONNECTOR-WINDOWS-1 — Platform Detection

**Date:** 2026-06-30

---

## Resolution Chain

```
createPlatformAdapter()
  → resolveHostPlatformType()
  → shouldUseSimulatedConnector() ?
       yes → SimulatedPlatformAdapter
       no  → switch(platform)
```

---

## Host Detection

| `process.platform` | Resolved `PlatformType` |
|--------------------|-------------------------|
| `win32` | `windows` |
| `darwin` | `macos` |
| `android` | `android` |
| `linux` | `linux` |

**File:** `server/print-connector/platform/resolveHostPlatform.ts`

---

## Override Policy (PRINT-CONNECTOR-WINDOWS-1)

| Condition | Behavior |
|-----------|----------|
| `PRINT_CONNECTOR_PLATFORM` unset | Use host platform |
| Override matches host | Use override |
| Override **conflicts** with host in production | **Ignore override**, log warning, use host |
| `NODE_ENV=test` or `PRINT_CONNECTOR_MODE=simulated` | Allow override (simulation/testing) |

This prevents `PRINT_CONNECTOR_PLATFORM=linux` on Windows from routing to `LinuxPlatformAdapter` / `lp`.

---

## Simulation Gate

Simulation is enabled **only** when:

- `NODE_ENV === "test"`, or
- `PRINT_CONNECTOR_MODE === "simulated"`

**Never** from discovery `catch` blocks in production.

---

## Deployment Target

`PRINT_CONNECTOR_DEPLOYMENT` (`embedded`, `local_desktop`, etc.) selects deployment runtime shell only. All paths call the same `createPlatformAdapter()` inside `InProcessDeploymentRuntime`.

---

## Diagnostic Command

```powershell
node -e "console.log(process.platform, process.env.PRINT_CONNECTOR_PLATFORM, process.env.PRINT_CONNECTOR_MODE, process.env.NODE_ENV)"
```

Expected for native Windows production: `win32`, no simulated mode, `NODE_ENV` not `test`.
