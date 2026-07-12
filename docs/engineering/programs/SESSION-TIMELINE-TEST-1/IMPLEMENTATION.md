# SESSION-TIMELINE-TEST-1 — Engineering Report

**Status:** IMPLEMENTED  
**Date:** 2026-07-13  
**Program type:** Verification only

## Summary

Added an architecture regression suite documenting the long-lived Operational Runtime Lifecycle of an Operational Screen. The suite composes the existing in-memory device store, pairing/authentication/heartbeat services, runtime bootstrap executor, reconciliation executor, configuration manager, and bootstrap state machine.

No production behavior, UI, API, backend contract, runtime logic, schema, state management, or credential storage code was changed.

## Files changed

- `server/operational-device/__tests__/sessionTimeline.test.ts` — new lifecycle regression suite.
- `docs/engineering/programs/SESSION-TIMELINE-TEST-1/IMPLEMENTATION.md` — this report.

## Lifecycle coverage

### Initial provision and runtime connection

- Creates an Operational Screen and permanent credential.
- Redeems the one-time pairing code.
- Authenticates the installed credential.
- Builds the runtime context through the existing bootstrap executor.
- Verifies stable device identity and token-backed runtime session identity.

### Long-running runtime

- Executes five heartbeat cycles.
- Verifies each heartbeat preserves operational health.
- Verifies repeated authentication with the same credential.
- Verifies heartbeats preserve device ID, session ID, bootstrap ID, and configuration revision.
- Verifies operational order-action authorization remains available.
- Verifies bootstrap cannot execute from the running phase.

### Temporary network loss

- Verifies `running → degraded → running`.
- Re-authenticates with the existing credential.
- Verifies unchanged status reconciliation is a no-op rather than a runtime recreation.
- Verifies the same device ID, session ID, bootstrap ID, and sole token remain active.

### Configuration update

- Updates the existing screen configuration and revision.
- Runs the existing configuration reload reconciliation path.
- Verifies the new revision is applied without changing device identity, session ID, bootstrap ID, or credential validity.
- Verifies operational order-action authorization remains available.

### Device restart

- Simulates a new runtime bootstrap/mount with a new bootstrap instance ID.
- Reuses the existing installed credential without redeeming another pairing code.
- Verifies device ID and token-backed session ID remain stable.
- Verifies no additional credential is created.

### Credential regeneration

- Regenerates the screen credential.
- Verifies the previous runtime credential is rejected as `token_revoked`.
- Redeems the new pairing code.
- Verifies runtime authentication is restored with the same device ID and a new token ID.

### Screen removal

- Deletes the screen.
- Verifies the fleet record is removed.
- Verifies the prior runtime credential is permanently rejected as `invalid_credentials`.
- Verifies reconnect cannot find the deleted device.

## Validation results

### New and related lifecycle suites

```text
6 test files passed
46 tests passed
```

Included:

- `sessionTimeline.test.ts` — 6/6
- `screenPairing.test.ts` — 7/7
- `screenCredentialLifecycle.test.ts` — 7/7
- `configurationVersionIntegrity.test.ts` — 4/4
- `bootstrapStateMachine.test.ts` — 8/8
- `runtimeReconciliationArchitecture.guards.test.ts` — 14/14

### Full repository suite

```text
363 test files passed
3 test files failed
1964 tests passed
4 tests failed
3 tests skipped
```

The four failures are existing unrelated baseline failures:

1. `server/session-owner-timeline.test.ts` — expected fixture omits `displayReference: null`.
2. `server/connector-product/__tests__/connectorReleaseInfrastructure.test.ts` — two connector version assertions drift between 1.0.1 and 1.0.2.
3. `server/connector-product/__tests__/releaseInfrastructure.architecture.guards.test.ts` — connector manifest/service version drift.

No SESSION-TIMELINE-TEST-1 test failed.

### Build

```text
npm run build — PASS
```

The existing large-chunk warning remains informational and unrelated.

## Functional change assessment

There are no production functional changes. The program adds tests and documentation only. Existing runtime, pairing, authentication, recovery, heartbeat, configuration, and credential lifecycle implementations are exercised without modification.

## Certification recommendation

**RECOMMEND APPROVAL** for SESSION-TIMELINE-TEST-1.

The suite establishes the long-lived Operational Runtime contract: transient connectivity and configuration changes preserve continuity; device restart reuses the permanent credential; only credential rotation or screen removal invalidates the existing runtime.
