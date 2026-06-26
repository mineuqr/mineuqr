# PRINTING-ADR-13I-002 — Printing Readiness Authority

**Status:** Mandatory  
**Phase:** THERMAL-PRINTING-13I.3B.5  
**Supersedes:** Distributed readiness inference in dashboard and discovery payloads

---

## Decision

`printOps.getPrintingSetupStatus` (via `resolvePrintingSetupState`) is the **sole authority** for printing setup readiness across the platform.

No dashboard panel, wizard step, or operator workflow may derive readiness from raw diagnostic fields.

---

## Authority Contract

Future UI (13I.3C) and current operator workflows consume **only**:

| Field | Purpose |
|-------|---------|
| `setupState` | Setup wizard progression |
| `operationalState` | Day-2 health (`HEALTHY` \| `DEGRADED` \| `BLOCKED`) |
| `severity` | Alert level |
| `nextAction` | Canonical CTA enum |
| `reason` | Operator-safe explanation |
| `checklist` | Progress checklist |
| `printers` | Per-printer setup states |
| `agent` | Preferred agent summary |

**Procedure:** `printOps.getPrintingSetupStatus`

**Server entry:** `getPrintingReadinessAuthority()` in `server/printing/printingReadinessAuthority.ts`

**Client selectors:** `client/src/lib/printing/printingReadinessAuthority.ts`

---

## Field Classification

### Authoritative Inputs (engine only — not consumed directly by UI)

- Database `printers`
- Agent lifecycle (`offline` / `online` / `stale`)
- Binding reports (`bindingStatus[]` store)
- Ownership conflicts
- Diagnostic runs
- Printer resolution registry

### Support Diagnostics (troubleshooting only)

- `getDiscoveryDiagnostics.counts.*`
- `getDiscoveryDiagnostics.agents[]`
- `getDiscoveryDiagnostics.ownershipConflicts[]`
- `getDiscoveryDiagnostics.bindingStatus[]`
- `provisioning.connectConfig` (download artifact)
- `provisioning.suggestedAgentId`
- `listDiagnosticRuns`

### Legacy (must not drive operator readiness)

| Field | Replacement |
|-------|-------------|
| `provisioning.step` | `setupState` + `nextAction` |
| `emptyReason` | `reason` |
| `isInventoryEmpty` | `checklist` |
| `counts.activePrinters` | `operationalState` + per-printer states |
| `connectConfig.physicalBindings` | `bindingStatus[]` via engine |

---

## Governance

1. **Server:** All readiness derivation lives in `server/printing/setupState/`
2. **Client:** Use `printingReadinessAuthority.ts` selectors — never branch on `provisioning.step`
3. **Assertion:** `assertReadinessFromAuthority()` throws if authority status missing
4. **Tests:** `printingReadinessAuthority.test.ts` proves legacy signals cannot override authority

---

## Backward Compatibility

These remain available unchanged:

- `printOps.getDiscoveryDiagnostics`
- `printOps.listDiagnosticRuns`
- Legacy fields in discovery response (marked `@legacy` in types)

Authority ownership changed; APIs were not removed.

---

## References

- PRINTING-READINESS-AUTHORITY-001
- THERMAL-PRINTING-13I.3B Phase A/B
- THERMAL-PRINTING-13I.3C (future — render authority output only)
