# THERMAL-PRINTING-13I.1 — Diagnostic History & Timeline UI

**Status:** Implementation complete (observability only)  
**Includes:** 13I.1A–13I.1J  
**Out of scope:** 12A, agent protocol changes, dispatch/routing/print execution

---

## 1. Architecture Summary

The Printer Operations dashboard (`PrintingOperationsPanel`) is a read-only observability surface backed by `printOps` tRPC procedures on **Print Host** (`VITE_PRINT_OPS_API_URL`). Vercel serves the SPA; Print Host aggregates in-memory agent/endpoint state plus MySQL printer/job records.

```
Dashboard (Vercel SPA)
  └─ printOps.*  ──split-link──►  Print Host (Fly)
        ├─ listPrinters / getPrinterDetail     (13I.1B status panel)
        ├─ listAgents                          (13I.1A agent presence)
        ├─ getSummary                          (13I.1F operations summary)
        ├─ listJobs / getJobDetail             (13I.1E queue timeline)
        ├─ listFailures                        (13I.1D failure mapping)
        ├─ getDiscoveryDiagnostics  ◄── NEW    (13I.1H discovery & ownership)
        └─ listDiagnosticRuns     ◄── NEW    (13I.1C diagnostic history)

testPrint remains on Vercel (unchanged).
```

**13I.1H empty-state resolution** runs server-side in `getPrintDiscoveryDiagnostics` → `getPrintDiscoveryDiagnostics`. When printer inventory is empty or all printers are inactive, the API returns an `emptyReason` enum plus counts, agent presence, and ownership conflicts. The UI renders actionable guidance instead of a generic “no printers” message.

**Empty reason priority:**

1. `no_db_printers` — no rows in `printers` for restaurant  
2. `ownership_conflict` — `profileId` owned by another restaurant’s agent  
3. `no_agent_connected` — no online agent inferred for restaurant  
4. `agent_no_matching_profiles` — agent online for restaurant but profiles don’t match DB  
5. `printers_inactive` — configured printers exist but none resolve to an online agent  

---

## 2. Data Sources

| Signal | Source | Read-only |
|--------|--------|-----------|
| Assigned printers | `listPrintersForRestaurant` → MySQL `printers` | ✓ |
| Active printer count | `listPrinterOverview` / `getPrinterResolution` + `getAgentConnectivityState` | ✓ |
| Connected agents (global) | `listAgentConnectivityStates` → in-memory agent registry | ✓ |
| Connected agents (restaurant) | Agent ID suffix inference + profile relevance | ✓ |
| Agent profiles | `getAgentPrinterProfiles` → in-memory profile store | ✓ |
| Connected endpoints | `getEndpointOperationsSummary({ restaurantId })` | ✓ |
| Ownership conflicts | `detectProfilePrinterOwnershipConflict` + `resolveRestaurantIdForAgent` | ✓ |
| Diagnostic run history | `listPrintDiagnosticRunsForRestaurant` → `print_diagnostic_runs` | ✓ |
| Queue / failures / summary | Existing `printOperationsService` aggregations | ✓ |

No writes, no dispatch bridge calls, no `print_jobs` mutations.

---

## 3. UI Design Description

### Printers tab (enhanced)

- **Discovery Diagnostics card** (always visible): five KPI tiles — Connected Agents, Connected Endpoints, Discovered Printers, Assigned Printers, Active Printers.
- **Actionable empty state** (amber card) when `emptyReason` is set, with bilingual title, explanation, and numbered remediation steps.
- **Ownership conflicts** (red-bordered list) when profiles are registered to another restaurant’s agent.
- **Agent presence** list with online/offline badges, relevance tag, and reported profile count.
- Generic “لا توجد طابعات مهيأة” fallback only when discovery data is unavailable.

### Diagnostics tab (new)

- Same discovery panel at top.
- **Diagnostic Print History** — last 20 runs from `print_diagnostic_runs` with status badge, printer/agent, trigger label, timestamps, and error text.

### Existing tabs (unchanged behavior)

| Tab | Sub-feature |
|-----|-------------|
| Printers | 13I.1B status + test print |
| Agents | 13I.1A presence |
| Stations | Station overview |
| Queue | 13I.1E timeline |
| Failures | 13I.1D failure mapping |

Refresh button refetches discovery and diagnostic history along with existing queries.

---

## 4. Files Modified

### New

| File | Purpose |
|------|---------|
| `server/printing/printOperationsDiscoveryTypes.ts` | Types for diagnostics API |
| `server/printing/printOperationsDiscoveryService.ts` | Discovery aggregation logic |
| `server/printing/printOperationsDiscovery.test.ts` | Unit tests (4 scenarios) |
| `client/src/components/dashboard/printing/PrinterDiscoveryDiagnosticsPanel.tsx` | Discovery UI |
| `client/src/components/dashboard/printing/DiagnosticHistoryPanel.tsx` | Diagnostic history UI |
| `docs/thermal-printing/THERMAL-PRINTING-13I.1-DIAGNOSTIC-HISTORY-UI.md` | This document |

### Modified

| File | Change |
|------|--------|
| `server/printing/printOperationsService.ts` | `getPrinterDiscoveryDiagnostics`, `listDiagnosticRunHistory` |
| `server/printing/printOperationsRouter.ts` | `getDiscoveryDiagnostics`, `listDiagnosticRuns` procedures |
| `server/printing/diagnosticPrintRepository.ts` | `listPrintDiagnosticRunsForRestaurant` |
| `client/src/components/dashboard/printing/PrintingOperationsPanel.tsx` | Diagnostics tab, discovery panel on Printers tab |

---

## 5. Acceptance Criteria

| # | Scenario | Expected UI |
|---|----------|-------------|
| 1 | Restaurant **720002** (no agent, no DB printers) | `no_db_printers` guidance; counts show 0 assigned; steps to add printer |
| 2 | Restaurant with DB printers, no agent online | `no_agent_connected`; Connected Agents = 0; NSSM install steps |
| 3 | Agent online (`mineuqr-agent-720007`) but wrong/missing profiles | `agent_no_matching_profiles`; agent visible in presence list |
| 4 | `profileId` owned by agent for restaurant **720007**, viewed from **720002** | `ownership_conflict`; owning vs current restaurant IDs shown |
| 5 | Restaurant **720007** healthy | Discovery counts populated; no empty-state banner; printer table + test print |
| 6 | Diagnostics tab after test print | Run appears in history with status progression |
| 7 | Regression | `printOps.testPrint` still routes to Vercel; customer print dispatch unchanged |
| 8 | Tests | `printOperationsDiscovery.test.ts` passes; `pnpm check` clean |

---

## 6. Production Rollout Plan

### Phase 1 — Deploy Print Host

1. Merge and deploy Print Host (Fly) with new `printOps.getDiscoveryDiagnostics` and `printOps.listDiagnosticRuns`.
2. Confirm `https://print.mineuqr.com/health` — single machine, agents registry consistent.
3. Smoke-test endpoints via authenticated tRPC (restaurant 720007).

### Phase 2 — Deploy Dashboard (Vercel)

1. Deploy SPA with updated `PrintingOperationsPanel`.
2. Verify `VITE_PRINT_OPS_API_URL` points to Print Host for discovery queries.

### Phase 3 — Validation matrix

| Restaurant | Validate |
|------------|----------|
| **720007** | Discovery counts > 0, no empty banner, diagnostic history after test print |
| **720002** | Actionable `no_db_printers` (or `no_agent_connected` if printers added without agent) |

### Phase 4 — Operator comms

- Share NSSM install doc (`docs/thermal-printing/AGENT-WINDOWS-SERVICE-13I.6D.md`) as remediation linked from empty states.
- No agent binary or protocol update required for 13I.1.

### Rollback

- Dashboard-only rollback reverts to generic empty message; Print Host rollback removes new endpoints (dashboard degrades gracefully — discovery panel hidden when query fails).

---

## THERMAL-PRINTING-13I.1J — Printer Provisioning Flow

**Status:** Implemented  
**Closes:** First-time operator provisioning gap (Decision C audit)

### Flow

```
Add Printer (Vercel) → Connect Device (guide) → Test Print (existing)
```

### Server

| Route | Host | Purpose |
|-------|------|---------|
| `printOps.createPrinter` | Vercel | Insert `printers` row; auto `profileId` |
| `printOps.getDiscoveryDiagnostics` | Print Host | `provisioning.step` + `connectConfig` |

`profileId` is system-managed (`r{restaurantId}-printer-{suffix}`). Operators enter name, paper width, and default toggle only.

### UI

- `PrinterProvisioningPanel` — stepper + primary CTA (never dead-end)
- `AddPrinterDialog` — Step 1
- `ConnectDeviceGuideSheet` — Step 2 (agent ID, JSON config, install steps)
- Step 3 reuses `printOps.testPrint`

### Production Validation

| Restaurant | Steps |
|------------|-------|
| **720002** | Add Printer → Connect Device sheet → verify discovery advances |
| **720007** | Test Print CTA visible; regression on existing print flow |

---

## Related

- 13I.6 Diagnostic Test Print (feeds 13I.1C history)
- 13I.6D Windows Agent service (remediation for `no_agent_connected`)
