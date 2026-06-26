# THERMAL-PRINTING-13I.3B Phase A — Printing Setup State Engine Architecture

**Status:** Architecture design (no implementation)  
**Prerequisite:** THERMAL-PRINTING-13I.3A CLOSED  
**Authority:** PRINTING-ADR-13I-002 (Single Source of Truth for Printing State)  
**Aligns with:** PRINTING-READINESS-AUTHORITY-001, THERMAL-PRINTING-13I.3 audit

---

## 1. Executive Summary

Today the dashboard infers printing readiness from **multiple overlapping signals** inside `getDiscoveryDiagnostics`: legacy `provisioning.step`, `activePrinters`, `emptyReason`, agent lists, and (since 13I.3A) `bindingStatus[]`. These sources **disagree by design** — e.g. `provisioning.step === "test_print"` while `bindingStatus === "UNBOUND"`.

**13I.3B introduces a Printing Setup State Engine** on Print Host that:

1. Ingests **authoritative runtime inputs** per PRINTING-READINESS-AUTHORITY-001
2. Applies **deterministic precedence rules**
3. Emits **one canonical `PrintingSetupState`** object for the dashboard
4. **Supersedes** `resolveProvisioningStep()` and forbids UI interpretation of `connectConfig.physicalBindings`

The future UI (13I.3C) consumes **only** the engine output for operator-facing setup. Legacy fields remain during transition for Advanced · Support, then are removed (13I.3E).

**Recommendation:** Implement `resolvePrintingSetupState()` on Print Host, expose via new `printOps.getPrintingSetupStatus` (or nested field on discovery), deprecate `provisioning.step` as authoritative.

---

## 2. Current Input Inventory

Every input currently involved in printing readiness inference, grouped by source.

### 2.1 Database (authoritative — configuration)

| Input | Source | Used today for |
|-------|--------|----------------|
| `printers[]` rows | `listPrintersForRestaurant()` | Printer existence, names, `profileId`, paper width, default flag |
| `assignedDbPrinters` | count of above | `emptyReason`, `provisioning.step` |
| `print_diagnostic_runs` | `listPrintDiagnosticRunsForRestaurant()` | Diagnostic history (not yet in discovery payload) |
| `printers.profileId` | DB column | Resolution, profile matching, ownership |
| Restaurant scope | `restaurantId` | All queries scoped |

### 2.2 Print Host — Agent lifecycle (authoritative — runtime)

| Input | Source | Used today for |
|-------|--------|----------------|
| `agentRegistry` / `listAgents()` | `agentLifecycleService` | Agent registration |
| `listAgentConnectivityStates()` | per-agent `offline` \| `online` \| `stale` | `agents[]`, `activePrinters`, `connectedAgents*` |
| `lastHeartbeatAt` | agent registry | Stale detection |
| `connectedAt` | agent registry | `listAgents` display |
| `platform` | HELLO registration | `AgentOverviewItem` |

### 2.3 Print Host — Profile inventory (authoritative — runtime, logical only)

| Input | Source | Used today for |
|-------|--------|----------------|
| `getAgentPrinterProfiles(agentId)` | `printerProfileStore` | `agents[].profileIds`, `reportedProfileCount` |
| `discoveredPrinterProfiles` | union of relevant online agent profiles | `emptyReason`, counts |
| Profile ↔ DB match | `restaurantProfileIds` ∩ agent `profileIds` | `relevantToRestaurant`, `agent_no_matching_profiles` |

### 2.4 Print Host — Resolution & routing (authoritative — runtime)

| Input | Source | Used today for |
|-------|--------|----------------|
| `getPrinterResolution(dbPrinterId)` | `printerResolutionRegistry` | `isActive`, `bindingStatus.agentId`, routing |
| `resolveRoutingDecision()` | routing engine | Test print / job dispatch (not discovery today) |

### 2.5 Print Host — Binding status (authoritative — runtime, 13I.3A)

| Input | Source | Used today for |
|-------|--------|----------------|
| `bindingStatus[]` | `printerBindingStatusStore` via agent `agent.printer.binding.report` | Exposed in discovery; **not consumed by UI yet** |
| Per-item: `bindingStatus` | `BOUND` \| `UNBOUND` \| `MISSING_PRINTER` \| `INVALID_BINDING` \| `UNKNOWN` | Readiness (should be authoritative) |
| `lastValidatedAt`, `windowsPrinterName`, `portName` | agent report | Diagnostics display |
| `message` | agent evaluation | Operator troubleshooting |

### 2.6 Print Host — Ownership (authoritative — runtime)

| Input | Source | Used today for |
|-------|--------|----------------|
| `ownershipConflicts[]` | `detectProfilePrinterOwnershipConflict()` | `emptyReason`, `provisioning.step === "blocked"` |

### 2.7 Print Host — Endpoints (informational)

| Input | Source | Used today for |
|-------|--------|----------------|
| `connectedEndpoints` | `getEndpointOperationsSummary()` | Discovery counts; **not binding authority** |

### 2.8 Derived / legacy (non-authoritative — must be retired)

| Input | Source | Problem |
|-------|--------|---------|
| `provisioning.step` | `resolveProvisioningStep()` | Treats `activePrinters > 0` as `test_print`; **ignores binding** |
| `activePrinters` | resolution + agent `online` | Conflates agent connect with print readiness |
| `isInventoryEmpty` | `printers.length === 0 \|\| activePrinters === 0` | Too coarse |
| `emptyReason` | `resolveEmptyReason()` | Derived from legacy signals |
| `connectConfig` | `buildPrintAgentConnectConfig()` | Setup artifact; `physicalBindings.pending` **must not** drive UI state |
| `connectConfig.physicalBindings` | dashboard download JSON | Explicitly non-authoritative per ADR |
| `suggestedAgentId` | `buildSuggestedPrintAgentId()` | Configuration hint only |
| `isActive` (per printer) | overview builder | Legacy “active” without binding gate |

### 2.9 Additional dashboard APIs (parallel reads — not unified today)

| API | Key fields | Risk if used for setup state |
|-----|------------|------------------------------|
| `printOps.getSummary` | `activePrinters`, job counts | Duplicates legacy active count |
| `printOps.listPrinters` | `isActive`, `profileId`, `transport` | Per-printer legacy active |
| `printOps.listAgents` | `status`, `reportedProfileCount` | Subset of discovery agents |
| `printOps.listDiagnosticRuns` | `status`, `completedAt` | **Required for READY** but not in discovery |
| `printOps.getPrinter` | `resolution` | Support detail |

### 2.10 Explicitly excluded from engine inputs

| Input | Reason |
|-------|--------|
| `printer-bindings.json` on POS | Not server-readable |
| Downloaded `usbTransportEndpoints` | Agent-local merge |
| Browser session / tab state | Not printing authority |
| `connectConfig` binding placeholders | Configuration template only |

---

## 3. Canonical State Model

### 3.1 Design principles

- **One restaurant-level `setupState`** drives the setup wizard (13I.3C).
- **Per-printer `printerStates[]`** for multi-printer restaurants.
- **`operationalState`** separate for day-2 monitoring (READY vs DEGRADED).
- States are **mutually exclusive** at restaurant level for setup wizard (one primary state).
- `ERROR` is a **severity overlay**, not always a separate wizard step.

### 3.2 Restaurant-level setup states

| State | Operator meaning | Entry justification |
|-------|------------------|---------------------|
| `NO_PRINTERS` | Add a printer to get started | `assignedDbPrinters === 0` |
| `BLOCKED` | Setup conflict — contact support | `ownershipConflicts.length > 0` |
| `AWAITING_AGENT` | Install/connect print agent on POS | ≥1 DB printer, no relevant agent `online` |
| `AGENT_CONNECTED` | Agent online; finish binding | Relevant agent `online`, profiles reported, binding not complete |
| `BINDING_REQUIRED` | Select Windows printer for each logical printer | Any printer: `UNBOUND` or `UNKNOWN` (with online agent) |
| `BINDING_INVALID` | Physical printer problem on POS | Any printer: `MISSING_PRINTER` or `INVALID_BINDING` |
| `READY_FOR_TEST` | Run test print | All printers `BOUND`, no passing diagnostic since bind (or never tested) |
| `READY` | Printing ready for production | All printers `BOUND` + primary (or all) diagnostic `completed` |
| `DEGRADED` | Was ready; needs attention | Previously `READY`, regression in agent or binding |

**Not separate top-level states** (folded into above):

- `PRINTER_DISCOVERED` → sub-condition of `AGENT_CONNECTED` (profiles reported)
- `PRINTER_ASSIGNED` → sub-condition of `AGENT_CONNECTED` (resolution exists)
- `ATTENTION_REQUIRED` → expressed via `severity` + `nextAction`, not a competing state enum value

### 3.3 Per-printer substates (`PrinterSetupState`)

| State | Condition |
|-------|-----------|
| `UNCONFIGURED` | No DB row (N/A in restaurant-scoped engine) |
| `UNRESOLVED` | No `getPrinterResolution()` |
| `AGENT_OFFLINE` | Resolved but agent not `online` |
| `BINDING_UNKNOWN` | Agent online, no binding report |
| `BINDING_REQUIRED` | `UNBOUND` |
| `BINDING_INVALID` | `MISSING_PRINTER` \| `INVALID_BINDING` |
| `BOUND` | `bindingStatus === "BOUND"` |
| `TEST_PASSED` | Latest diagnostic `completed` for this printer |
| `TEST_FAILED` | Latest diagnostic `failed` |

### 3.4 Operational overlay (`operationalState`)

| Value | Meaning |
|-------|---------|
| `READY` | `setupState === READY` and agent `online` |
| `SETUP_INCOMPLETE` | Any pre-READY setup state |
| `DEGRADED` | READY criteria lost (agent offline, binding invalid) |
| `BLOCKED` | Ownership conflict |

---

## 4. Transition Matrix

### 4.1 Restaurant-level transitions

| From | To | Trigger (authoritative) |
|------|-----|-------------------------|
| `NO_PRINTERS` | `AWAITING_AGENT` | `createPrinter` → DB printer exists |
| `NO_PRINTERS` | `BLOCKED` | — (forbidden until printers exist unless conflict on profile) |
| `AWAITING_AGENT` | `AGENT_CONNECTED` | Relevant agent `status === "online"` + `reportedProfileCount > 0` matching DB `profileId`s |
| `AWAITING_AGENT` | `BLOCKED` | Ownership conflict detected |
| `AGENT_CONNECTED` | `BINDING_REQUIRED` | Any binding `UNBOUND` \| `UNKNOWN` |
| `AGENT_CONNECTED` | `BINDING_INVALID` | Any binding `MISSING_PRINTER` \| `INVALID_BINDING` |
| `AGENT_CONNECTED` | `AWAITING_AGENT` | All relevant agents offline/stale |
| `BINDING_REQUIRED` | `READY_FOR_TEST` | All printers `bindingStatus === "BOUND"` |
| `BINDING_INVALID` | `READY_FOR_TEST` | All bindings return to `BOUND` |
| `BINDING_INVALID` | `BINDING_REQUIRED` | Partial fix → some `UNBOUND` |
| `READY_FOR_TEST` | `READY` | Primary printer (or all) diagnostic run `completed` |
| `READY_FOR_TEST` | `BINDING_INVALID` | Binding regression |
| `READY` | `DEGRADED` | Agent offline OR any binding not `BOUND` |
| `READY` | `READY_FOR_TEST` | Optional: re-test required after bind change (policy) |
| `DEGRADED` | `READY` | Regression cleared |
| `DEGRADED` | `AWAITING_AGENT` | Agent long offline |
| `*` | `BLOCKED` | Ownership conflict appears |
| `BLOCKED` | `AWAITING_AGENT` | Conflict resolved (support) |

### 4.2 Forbidden transitions (engine must reject / never emit)

| Forbidden | Reason |
|-----------|--------|
| `NO_PRINTERS` → `READY` | No logical printer |
| `NO_PRINTERS` → `READY_FOR_TEST` | — |
| `AWAITING_AGENT` → `READY_FOR_TEST` | Binding requires agent |
| `AWAITING_AGENT` → `READY` | — |
| `BINDING_REQUIRED` → `READY` | Must pass test print gate |
| `READY_FOR_TEST` → `READY` without diagnostic `completed` | Test gate |
| `BLOCKED` → `READY` | Must clear conflict first |
| Any → `READY` with any binding ≠ `BOUND` | ADR violation |

### 4.3 Legacy `ProvisioningStep` mapping (deprecation)

| Legacy `provisioning.step` | Engine state (typical) |
|----------------------------|-------------------------|
| `add_printer` | `NO_PRINTERS` |
| `connect_agent` | `AWAITING_AGENT` or `AGENT_CONNECTED` or `BINDING_*` |
| `test_print` | **Ambiguous** — maps to `AGENT_CONNECTED` through `READY_FOR_TEST` depending on binding |
| `blocked` | `BLOCKED` |

**Rule:** After 13I.3B, UI **must not** read `provisioning.step` for setup progression.

---

## 5. Priority Rules (Authority Precedence)

When signals disagree, apply **strict top-down precedence**. First matching row wins for `setupState`.

| Priority | Authority source | Field(s) | Wins over |
|----------|------------------|----------|-----------|
| 1 | Ownership registry | `ownershipConflicts.length > 0` | Everything |
| 2 | Database | `assignedDbPrinters === 0` | Agent, binding, legacy |
| 3 | Agent binding report (13I.3A) | `bindingStatus[]` any `MISSING_PRINTER` \| `INVALID_BINDING` | `provisioning.step`, `activePrinters`, `connectConfig` |
| 4 | Agent binding report | any `UNBOUND` \| `UNKNOWN` (agent online) | `provisioning.step`, `activePrinters` |
| 5 | Agent lifecycle | no relevant agent `online` | `activePrinters`, `provisioning.step === "test_print"` |
| 6 | Agent lifecycle + profiles | agent `online` + profiles match | `discoveredPrinterProfiles` alone |
| 7 | Binding report | all `BOUND` | `provisioning.step` |
| 8 | Diagnostic DB | latest run `completed` for primary printer | `activePrinters` |
| 9 | Diagnostic DB | bound but no `completed` test | → `READY_FOR_TEST` |
| 10 | Legacy (deprecated) | `provisioning.step`, `activePrinters`, `emptyReason` | **Never** — emit only in `legacy` debug bag |

### 5.1 Conflict examples (resolved)

| Signal A | Signal B | Engine result |
|----------|----------|---------------|
| `provisioning.step = test_print` | `bindingStatus = UNBOUND` | `BINDING_REQUIRED` |
| `activePrinters = 1` | `bindingStatus = MISSING_PRINTER` | `BINDING_INVALID` |
| `connectConfig.physicalBindings.pending` | `bindingStatus = BOUND` | `READY_FOR_TEST` or `READY` (per diagnostic) |
| Agent `online` | `bindingStatus = UNKNOWN` | `BINDING_REQUIRED` (report pending) |
| Agent `stale` | last binding `BOUND` | `DEGRADED` or `AWAITING_AGENT` |

### 5.2 PRINTING-ADR-13I-002 alignment

| Concern | Sole authority |
|---------|----------------|
| Printer created | Database |
| Agent connected | Print Host connectivity |
| Binding status | Agent report store |
| Validation result | Agent report + diagnostic runs |
| **Setup state** | **Engine derivation (this document)** |
| Ready for production | Engine `READY` |

---

## 6. Impossible States

Combinations the engine **must never emit** as stable output. If detected during evaluation, log invariant violation and coerce to nearest valid state + `severity: "error"`.

| # | Impossible combination | Coercion |
|---|------------------------|----------|
| 1 | `setupState = READY` and `assignedDbPrinters === 0` | → `NO_PRINTERS` |
| 2 | `setupState = READY` and no agent ever registered | → `AWAITING_AGENT` |
| 3 | `setupState = READY` and any `bindingStatus !== BOUND` | → `BINDING_REQUIRED` or `BINDING_INVALID` |
| 4 | `setupState = READY` and no diagnostic `completed` for primary printer | → `READY_FOR_TEST` |
| 5 | `setupState = READY_FOR_TEST` and any binding not `BOUND` | → `BINDING_REQUIRED` |
| 6 | `setupState = AWAITING_AGENT` and `ownershipConflicts.length > 0` | → `BLOCKED` |
| 7 | `setupState = BINDING_REQUIRED` and no relevant agent `online` | → `AWAITING_AGENT` |
| 8 | `operationalState = READY` and `setupState !== READY` | → align `operationalState` to `SETUP_INCOMPLETE` |
| 9 | `bindingStatus = BOUND` without `windowsPrinterName` in report | Reject at ingest (13I.3A validation) — not engine |
| 10 | `activePrinters > 0` implies `setupState = READY` | **Legacy bug — explicitly forbidden** |
| 11 | `connectConfig.physicalBindings.pending` implies binding incomplete when report says `BOUND` | Report wins |
| 12 | `READY` with `ownershipConflicts.length > 0` | → `BLOCKED` |
| 13 | Per-printer `TEST_PASSED` while `bindingStatus = UNBOUND` | → `BINDING_REQUIRED` |
| 14 | `discoveredPrinterProfiles = 0` and `setupState = READY_FOR_TEST` | → `AGENT_CONNECTED` or `AWAITING_AGENT` |

---

## 7. Runtime vs Configuration Classification

| Field | Class | Why |
|-------|-------|-----|
| `printers` DB rows (name, paper width, profileId) | **Configuration** | Operator-defined; persists in DB |
| `suggestedAgentId` | **Configuration** | Derived convention from restaurantId |
| `connectConfig` / download JSON | **Configuration** | Setup artifact; not live state |
| `physicalBindings` in connectConfig | **Configuration** | Pending placeholders only |
| Agent `online` / `stale` / `offline` | **Runtime** | Live heartbeat |
| Agent profile inventory | **Runtime** | Reported over WebSocket |
| `bindingStatus[]` | **Runtime** | Agent validation report |
| `ownershipConflicts` | **Runtime** | Live registry cross-check |
| `printerResolution` | **Runtime** | In-memory mapping |
| Diagnostic runs | **Runtime** | DB-backed events |
| `provisioning.step` | **Derived (legacy)** | Recompute from stale inputs — **deprecate** |
| `activePrinters` | **Derived (legacy)** | Recompute — **not readiness** |
| `emptyReason` | **Derived (legacy)** | Recompute — support only |
| `isInventoryEmpty` | **Derived (legacy)** | Recompute |
| **`setupState`** | **Derived State** | **Canonical engine output** |
| **`operationalState`** | **Derived State** | Day-2 summary |
| **`printerStates[]`** | **Derived State** | Per-printer breakdown |
| **`nextAction`** | **Derived State** | UX instruction |

---

## 8. Proposed Engine API

### 8.1 Endpoint

**Preferred:** `printOps.getPrintingSetupStatus({ restaurantId })` on Print Host  
**Transitional:** `getDiscoveryDiagnostics.setup` nested object (parallel emit during migration)

### 8.2 Response shape

```typescript
type PrintingSetupStatus = {
  restaurantId: number;
  evaluatedAt: string; // ISO

  // Canonical — UI consumes these only (13I.3C)
  setupState: PrintingSetupState;
  operationalState: OperationalState;
  severity: "info" | "warning" | "error";
  nextAction: SetupNextAction;
  reason: string; // operator-safe, localized key or plain text

  // Progress checklist (13I.3C wizard)
  checklist: {
    printerCreated: boolean;
    agentConnected: boolean;
    printerBound: boolean;
    testPrintPassed: boolean;
  };

  // Primary target for test print CTA
  primaryPrinter: {
    printerId: number;
    name: string;
    profileId: string;
  } | null;

  // Per-printer detail
  printers: Array<{
    printerId: number;
    name: string;
    profileId: string;
    setupState: PrinterSetupState;
    bindingStatus: RuntimeBindingStatus | "UNKNOWN";
    agentId: string | null;
    agentStatus: "offline" | "online" | "stale" | null;
    lastValidatedAt: string | null;
    lastDiagnosticStatus: DiagnosticPrintStatus | null;
    lastDiagnosticAt: string | null;
  }>;

  // Agent summary (operator-safe)
  agent: {
    agentId: string | null;
    status: "offline" | "online" | "stale" | null;
    lastSeenAt: string | null;
  };

  // Support tier only (13I.3C Advanced · Support)
  support?: {
    ownershipConflicts: OwnershipConflictItem[];
    legacyProvisioningStep: ProvisioningStep;
    discoveryCounts: PrintDiscoveryDiagnostics["counts"];
    bindingStatus: PrinterBindingStatusItem[];
  };
};

type PrintingSetupState =
  | "NO_PRINTERS"
  | "BLOCKED"
  | "AWAITING_AGENT"
  | "AGENT_CONNECTED"
  | "BINDING_REQUIRED"
  | "BINDING_INVALID"
  | "READY_FOR_TEST"
  | "READY"
  | "DEGRADED";

type OperationalState =
  | "READY"
  | "SETUP_INCOMPLETE"
  | "DEGRADED"
  | "BLOCKED";

type SetupNextAction =
  | "ADD_PRINTER"
  | "INSTALL_AGENT"
  | "WAIT_FOR_AGENT"
  | "BIND_PRINTER"
  | "FIX_BINDING"
  | "RUN_TEST_PRINT"
  | "CONTACT_SUPPORT"
  | "NONE";
```

### 8.3 `nextAction` mapping

| setupState | nextAction |
|------------|------------|
| `NO_PRINTERS` | `ADD_PRINTER` |
| `AWAITING_AGENT` | `INSTALL_AGENT` |
| `AGENT_CONNECTED` | `BIND_PRINTER` |
| `BINDING_REQUIRED` | `BIND_PRINTER` |
| `BINDING_INVALID` | `FIX_BINDING` |
| `READY_FOR_TEST` | `RUN_TEST_PRINT` |
| `READY` | `NONE` |
| `BLOCKED` | `CONTACT_SUPPORT` |
| `DEGRADED` | `WAIT_FOR_AGENT` or `FIX_BINDING` |

### 8.4 Engine function (implementation target)

```text
resolvePrintingSetupState(restaurantId): PrintingSetupStatus
```

**Internal steps:**

1. Load DB printers
2. Load ownership conflicts
3. Load agent connectivity + profile inventory (relevant agents)
4. Load binding status store per resolved agent/profile
5. Load latest diagnostic run per printer
6. Apply precedence rules (§5)
7. Validate invariants (§6)
8. Emit single `PrintingSetupStatus`

---

## 9. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual authority during migration | UI reads both `provisioning.step` and engine | Feature flag; engine-only in 13I.3C |
| Diagnostic runs not in discovery today | Extra DB query in engine | Acceptable; cache per request |
| Multi-printer partial bind | One bound, one not | Per-printer states; restaurant state = worst case |
| `DEGRADED` vs `AWAITING_AGENT` | Operator confusion | Clear `reason` strings; checklist shows regression |
| Stale binding report after agent offline | Shows `BOUND` while agent away | `operationalState = DEGRADED`; optional TTL in 13I.3B.2 |
| `UNKNOWN` binding timeout | Agent online but no report | Treat as `BINDING_REQUIRED` with `WAIT` messaging |
| Print Host / Vercel split | Engine must run on Print Host | Same host as binding store + agent registry |
| Legacy UI still shows `activePrinters` | False confidence | 13I.3E removal |

---

## 10. Architecture Verdict

### 10.1 Compatibility

| Phase | Compatibility |
|-------|---------------|
| **13I.3B.5 Readiness Authority** | Engine implements ADR table; single derived `setupState` |
| **13I.3C Setup UI** | Consumes `PrintingSetupStatus` only; maps 1:1 to six wizard stages |
| **13I.3E Legacy removal** | `resolveProvisioningStep`, `PrinterProvisioningPanel` step pills, `emptyReason` operator copy, `connectConfig` primary path — all removable once UI uses engine |

### 10.2 13I.3C stage mapping

| Wizard stage (13I.3C) | Engine `setupState` (entry) |
|------------------------|----------------------------|
| 1 Create Printer | `NO_PRINTERS` → exit on create |
| 2 Install Agent | `AWAITING_AGENT` |
| 3 Agent Connected | `AGENT_CONNECTED` |
| 4 Bind Printer | `BINDING_REQUIRED` / `BINDING_INVALID` |
| 5 Test Print | `READY_FOR_TEST` |
| 6 Ready | `READY` |

### 10.3 Final verdict

**Architecture is approved to proceed to 13I.3B implementation** with:

1. `resolvePrintingSetupState()` on Print Host
2. Binding report as binding authority (not `connectConfig`)
3. Diagnostic `completed` as test gate for `READY`
4. Deprecation of `provisioning.step` as operational truth
5. New `getPrintingSetupStatus` API surface

No further architectural redesign required before coding **13I.3B implementation phases**.

---

## Document Control

| Field | Value |
|-------|-------|
| Phase | 13I.3B Phase A — design only |
| Next | 13I.3B implementation — `resolvePrintingSetupState` + API |
| References | PRINTING-READINESS-AUTHORITY-001, THERMAL-PRINTING-13I.3, THERMAL-PRINTING-13I.3A |
