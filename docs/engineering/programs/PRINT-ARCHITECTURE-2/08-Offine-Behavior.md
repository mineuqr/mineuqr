# PRINT-ARCHITECTURE-2 — Offline Behavior

**Date:** 2026-06-30

---

## AD-10: How is offline behavior handled?

**Decision: Cloud remains authoritative; RLC replays when connectivity returns.**

---

## Scenarios

### S1 — RLC offline, Cloud online

| Capability | Behavior |
|------------|----------|
| Discovery | Fails — empty list, `connector_offline` |
| New print jobs | Accepted by Printing Service → queued `dispatched` awaiting RLC |
| Test print | Fails immediately with canonical failure |
| Workspace | Shows connector unavailable; catalog still visible |
| Browser | Fully functional for non-print operations |

### S2 — Browser offline

| Capability | Behavior |
|------------|----------|
| All cloud APIs | Unavailable (standard SPA behavior) |
| RLC | May still process cloud-queued jobs if RLC↔cloud link up |

### S3 — RLC offline, jobs pending

| Step | Behavior |
|------|----------|
| Job created | Cloud persists `print_jobs` |
| Dispatch | Gateway marks `awaiting_connector` |
| RLC reconnects | Gateway drains pending jobs for `restaurantId` (ordered, idempotent) |
| Duplicate protection | `printJobId` deduplication on RLC |

### S4 — Restaurant LAN up, Internet down

- RLC cannot reach cloud → cannot receive new jobs
- In-flight jobs complete locally; results buffered for upload (RLC local durable outbox — future implementation detail)
- Operator sees offline via last heartbeat age

---

## Discovery Offline

- No live discovery without RLC
- UI shows **last provisioned catalog** from cloud DB — not simulated printers
- Clear banner: "Print connector offline — showing last configured printers"

---

## Design Principle

**Never silently degrade to simulated printers in production.** Offline is explicit and canonical.

---

## Non-Goal

No offline queue implementation in this program — behavior specified for future RLC + gateway programs.
