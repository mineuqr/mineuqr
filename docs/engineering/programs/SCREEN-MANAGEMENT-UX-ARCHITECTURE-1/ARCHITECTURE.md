# SCREEN-MANAGEMENT-UX-ARCHITECTURE-1

**Classification:** Product Architecture Program  
**Revision:** B  
**Status:** Pending certification — **no implementation until Revision B is approved**  
**Date:** 2026-07-12  
**Supersedes:** Revision A (initial draft)

---

## Revision History

| Revision | Date | Summary |
|----------|------|---------|
| A | 2026-07-12 | Initial architecture draft |
| **B** | 2026-07-12 | Fleet First Philosophy, Product Principles, Fleet/Runtime/Diagnostics separation, operator-only filters, card permanence rules, create-screen prominence, Delete Screen fleet contract, KITCHEN-ITEM-FILTERING-1 category semantics |

---

## Chapter 0 — Fleet First Philosophy

### What is this page for?

The Screen Management page exists to answer **one question for the restaurant operator**:

> **"What screens do I have, and what do I need to do with them?"**

It is a **Fleet Management** surface. It is **not**:

| This page is NOT for… | That belongs to… |
|----------------------|------------------|
| Showing Runtime internals | Runtime Platform (device-side `/screen`) |
| Showing health diagnostics | Diagnostics (Screen Details → Diagnostics tab, on demand) |
| Explaining bootstrap or reconciliation | Runtime infrastructure (never operator-facing) |
| Monitoring capability negotiation | Diagnostics (support scenarios only) |

### Fleet First — formal principle

**The page manages a fleet of permanent screen assets.**

Operators use it to:

1. **Create** screens
2. **See** which screens exist and whether they are reachable
3. **Configure** display behavior (categories, language, density)
4. **Open** screens on devices
5. **Regenerate credentials** when access must be renewed
6. **Delete** screens from the fleet when retired

Everything else — Runtime Context, bootstrap phases, canonical operational state, capability negotiation, configuration version negotiation — is **infrastructure**. It supports the fleet; it is **not the product experience**.

### Anti-patterns (explicitly forbidden)

- Using Screen Management as a Runtime dashboard
- Using Screen Management as a health monitoring console
- Requiring Screen Details to answer "Is this screen working?"
- Exposing engineering filter vocabulary (Operational, Degraded, Blocked, Maintenance) in primary navigation
- Hiding **Create screen** behind secondary navigation

---

## Chapter 1 — Product Principles

These principles are **architectural law** for Screen Management UX. They prevent regression to an engineering console.

### 1. Fleet First

The page serves fleet management. Cards, filters, and actions are organized around **managed screen assets**, not runtime subsystems.

### 2. Operator First

Every label, filter, and action answers: *"What does the restaurant manager want to accomplish?"*  
Never: *"What does the Runtime Platform know?"*

### 3. Hide Platform Complexity

Restaurant managers must not encounter Runtime Context, Capability Negotiation, Bootstrap, Runtime Version, or Runtime Health **unless they are diagnosing a problem**.

This is an **architecture rule**, not a cosmetic preference. Engineering concepts live in Diagnostics — behind progressive disclosure.

### 4. Permanent Screens

Operational screens are **permanent managed assets**, not temporary provisioning sessions.

Lifecycle (authoritative — unchanged):

```
Create → Ready → Open → Close browser → Open again → Still Ready
         ↓ (optional)
         Regenerate Credential
         ↓ (optional)
         Delete Screen
```

SCREEN-CREDENTIAL-LIFECYCLE-1 and SCREEN-CREDENTIAL-GOVERNANCE-1 remain authoritative.

### 5. Progressive Disclosure

| Layer | Operator sees |
|-------|---------------|
| **Fleet cards** | Enough to act without opening details |
| **Settings / Access** | Configuration and credential actions |
| **Diagnostics** | Engineering detail — only when needed |

### 6. Recovery Instead of Diagnostics

When something goes wrong, operators need **recovery steps** (re-pair, regenerate, open setup link) — not raw runtime state dumps. Diagnostics supports support staff; recovery supports operators.

### 7. One Primary Action Per Screen

Each screen card has one obvious next step based on context:

- Normal state → **Open screen**
- Needs attention → **Set up screen** (or equivalent recovery CTA)
- Creating → **Add screen** (fleet-level primary action)

Secondary actions live in **Manage** menu — never compete visually with the primary action.

### 8. Runtime is Infrastructure, Not UX

Runtime Platform, reconciliation, bootstrap, and authentication are certified and **immutable** in this program. Screen Management **consumes** fleet read models; it does **not surface** runtime mechanics to operators.

---

## Chapter 2 — Fleet · Runtime · Diagnostics

Three distinct concerns. **Never merge them in the operator UI.**

```
┌─────────────────────────────────────────────────────────────────┐
│  FLEET (Screen Management page)                                 │
│  Manage screens as restaurant assets                            │
│  • Create / delete                                              │
│  • Online / offline / needs attention                           │
│  • Role, categories, last seen                                  │
│  • Configure, open, regenerate credential                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ operator configures & opens
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (Operational Screen — /screen)                           │
│  Run the screen on the device                                   │
│  • Bootstrap, heartbeat, reconciliation                         │
│  • Queue display, order actions                                 │
│  • NOT visible in Screen Management primary UX                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ when problem persists
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DIAGNOSTICS (Screen Details → Diagnostics tab)                   │
│  Investigate problems — support & power users                   │
│  • Canonical operational state                                  │
│  • Business readiness, connectivity                             │
│  • Screen ID, config version, reported version                  │
│  • Capability / negotiation detail (future)                     │
└─────────────────────────────────────────────────────────────────┘
```

| Concern | Question it answers | Primary surface |
|---------|---------------------|-----------------|
| **Fleet** | What do I have? What should I do? | Screen Management page |
| **Runtime** | Is the screen running orders correctly? | Device browser `/screen` |
| **Diagnostics** | Why is it failing technically? | Screen Details → Diagnostics |

**Rule:** Screen Management is **not a dashboard** for Runtime. It is a **fleet command center**.

---

## Executive Summary

Screen Management today is architecturally sound but violates Fleet First: it exposes Runtime vocabulary, hides the most common action (create screen), and forces operators into engineering concepts (Operational, Degraded, Credential) to manage a restaurant fleet.

**Revision B** establishes Fleet First Philosophy and Product Principles as the governing framework, separates Fleet / Runtime / Diagnostics explicitly, abolishes engineering filters, keeps essential status on cards permanently, promotes **Create screen** as the first primary action, documents **Delete Screen** as a fleet lifecycle operation, and locks category semantics to KITCHEN-ITEM-FILTERING-1.

All Runtime, Operational Screen, authentication, credential lifecycle, and API contracts remain authoritative and unchanged. This program redesigns **presentation only**.

---

## 3. Current UX Audit

### 3.1 Surface Inventory

| Surface | Entry | Primary components |
|---------|-------|-------------------|
| Fleet workspace | Dashboard → Screens | `ScreenManagementWorkspacePanel`, `FleetScreenCard` |
| Settings | Card → Settings | `ScreenSettingsSheet` |
| Credential / lifecycle | Card → Credential | `ScreenCredentialLifecycleSheet` |
| Create | Header → Provision screen (secondary, easy to miss) | `ProvisioningWorkspacePanel` |

### 3.2 Violations of Revision B Principles

| Principle violated | Current behavior |
|-------------------|------------------|
| Fleet First | Filters named Operational, Blocked, Degraded, Maintenance |
| Operator First | "Credential", "Last heartbeat", "Open /screen" |
| Hide Platform Complexity | Operational state on card as primary label |
| Progressive Disclosure | No separation of Diagnostics |
| Recovery Instead of Diagnostics | Regenerate/Delete lack device impact guidance |
| One Primary Action | Settings and Credential equal weight; no Open screen |
| Fleet First (create) | Create hidden; not first action on page |

### 3.3 What Works (Preserve)

- Server-projected fleet state (`fleetCanonicalState.ts`)
- Credential governance (server-rendered QR, no JS secrets)
- Permanent screen lifecycle APIs (SCREEN-CREDENTIAL-LIFECYCLE-1)
- Virtualized fleet grid, bilingual EN/AR, `OperationalWorkspaceShell`

### 3.4 Known Incident Inputs

| Incident | Fleet UX requirement |
|----------|---------------------|
| SCREEN-AUTHENTICATION-FORENSICS-1 | Document Regenerate/Delete → stale device credentials → re-pair |
| OPERATIONAL-SCREEN-BOOTSTRAP-HANG-1 | Recovery playbook in fleet copy; runtime fix = separate program |

---

## 4. Operator Journey Analysis

### 4.1 Personas

Restaurant manager, floor supervisor, owner during setup — none need Runtime vocabulary.

### 4.2 Core Journeys (Revision B)

| Journey | Target experience |
|---------|-------------------|
| **First screen** | Land on Screens → **+ Create screen** (first button) → wizard → Ready |
| **Daily check** | Scan cards: Online, last seen, role, categories — **no Details required** |
| **Open on device** | Card → **Open screen** |
| **Replace tablet** | Manage → **Regenerate Credential** → confirm impact → QR → re-open on device |
| **Retire screen** | Manage → **Delete Screen** → confirm fleet impact → device must re-pair on new screen |
| **Fix kitchen filter** | Settings → category section (see Chapter 10) |

---

## 5. Page Architecture — Fleet Command Center

### 5.1 Primary Action: Create Screen

**Revision B requirement:** **+ Create screen** / **+ إنشاء شاشة** is the **first button** on the page — before Refresh, before filters.

```
┌──────────────────────────────────────────────────────────────────┐
│  Screens                                    [+ Create screen] ← FIRST
│  ─────────────────────────────────────────────────────────────── │
│  KPIs: Total · Online · Offline · Needs attention                │
│  Filters: All · Online · Offline · Needs attention  (+ search)   │
│  Fleet cards…                                                    │
└──────────────────────────────────────────────────────────────────┘
```

Placement rules:

1. **First position** in page header action group (primary button styling)
2. Repeated in **empty fleet** state as main CTA
3. Provisioning backend unchanged (`navigateToProvisioning`); copy only: "Create screen" not "Provision screen"

Create screen is the **most frequent operator action** during onboarding and fleet expansion. It must never be secondary.

### 5.2 Layout Model

| Zone | Purpose |
|------|---------|
| Header | Title + **Create screen** (first) + Refresh |
| KPI strip | Fleet counts — operator labels only |
| Filter bar | **Operator filters only** (Chapter 6) |
| Fleet canvas | Cards (default) |
| Sheets | Settings, Manage menu, Screen Details (Diagnostics tab) |

**Not a Runtime dashboard.** KPIs reflect fleet reachability, not bootstrap phase or reconciliation state.

---

## 6. Filter Model — Operator Only (Engineering Filters Abolished)

### 6.1 Revision B Decision: Complete Replacement

The following filters are **abolished** from Screen Management UI — permanently:

| Abolished (never show operators) |
|----------------------------------|
| Operational |
| Blocked |
| Degraded |
| Maintenance |
| Disconnected |
| Initializing |
| Ready |
| Disposed |

These are Runtime / canonical state concepts. They may appear **only** in Diagnostics.

### 6.2 Certified Operator Filters

| Filter | EN | AR | Operator meaning |
|--------|----|----|------------------|
| **all** | All | الكل | Every screen in fleet |
| **online** | Online | متصل | Screen device recently reachable |
| **offline** | Offline | غير متصل | Screen not recently reachable |
| **needs_attention** | Needs attention | يحتاج انتباه | Setup incomplete, disabled, unsupported role, or credential issue |

**Four filters only.** No engineering synonyms in primary navigation.

### 6.3 Server Mapping (Presentation Layer)

Operator filters map to existing fleet query inputs — **no API change**:

| Operator filter | Client-side mapping (from `FleetScreenReadModel`) |
|-----------------|--------------------------------------------------|
| All | No filter |
| Online | `healthSummary.presence === "online"` |
| Offline | `presence === "offline"` |
| Needs attention | Any of: `presence === "never_seen"`, `!hasActiveToken`, `maintenanceState === "maintenance"`, `operationalState === "blocked"`, `businessReadiness === "pairing_required"` |

Implementation note: if server-side `operationalState` query param is retired from operator UI, filtering may be **client-side on fetched fleet page** or server filter extended in a future API program. Revision B certifies **operator vocabulary**; query transport is an implementation detail that must not reintroduce engineering terms.

### 6.4 KPI Alignment

| KPI | Operator label |
|-----|----------------|
| Total screens | Screens |
| Online | Online |
| Offline | Offline |
| Needs attention | Needs attention |

Remove Disabled as separate KPI if it duplicates Needs attention — or show Disabled count **inside** Needs attention tooltip. Operators do not need a "Maintenance" KPI.

---

## 7. Screen Card Architecture — Always Enough to Act

### 7.1 Revision B Rule: Cards Are Self-Sufficient

Operators must **never open Screen Details** to know whether a screen is working.

The following fields are **always visible on every card** — non-negotiable:

| Always on card | Operator label | Source |
|----------------|----------------|--------|
| Screen name | — | `displayName` |
| Screen role | Kitchen Screen, etc. | `role` |
| **Online / Offline** | Online · Offline · Not yet connected | `healthSummary.presence` |
| **Last connection** | Last seen: … | `lastHeartbeat` |
| **Categories** | All items · N categories · Category name | `screenConfig.visibleCategoryIds` |
| **Attention indicator** | Needs attention (when applicable) | Derived operator badge |

### 7.2 Card Layout (Certified)

```
┌──────────────────────────────────────────┐
│  Kitchen Pass              ● Online      │
│  Kitchen Screen                          │
│                                          │
│  Last seen: 2 min ago                    │
│  Items: All items                        │  ← category summary (Ch. 10)
│                                          │
│  [ Open screen ]     [ Settings ▾ ]      │
└──────────────────────────────────────────┘
```

When needs attention:

```
│  ⚠ Needs attention — set up screen       │
│  [ Set up screen ]   [ Settings ▾ ]      │
```

### 7.3 What Moves to Screen Details (Not Cards)

Only information required for **diagnosis or support**:

- Screen ID (internal)
- Raw canonical operational state
- Business readiness enum
- Connectivity state enum
- Reported version, configuration version
- Capability negotiation timeline (future)
- Bootstrap / runtime health detail

**Never remove from cards:** Online, last connection, role, categories.

### 7.4 Hide Platform Complexity — Card Rules

Cards must **never** display:

- Runtime Context
- Bootstrap phase
- Capability negotiation
- Runtime version
- Runtime health enums (Operational, Degraded, Blocked, …)
- `deviceId` / token identifiers
- `/screen` URL paths

Cards may display **operator-derived** attention state ("Needs attention") mapped internally from canonical state — without exposing the underlying enum name.

---

## 8. Action Hierarchy

### 8.1 Page-Level Actions

| Priority | Action | Placement |
|----------|--------|-----------|
| **1** | **+ Create screen** | First header button |
| 2 | Refresh | Secondary |
| 3 | Search / role filter | Filter bar |

### 8.2 Card-Level Actions

| Tier | Actions |
|------|---------|
| **Primary** | Open screen (or Set up screen when needs attention) |
| **Secondary** | Settings |
| **Manage menu** | Show QR · Copy screen link · Copy setup link · **Regenerate Credential** · **Delete Screen** · Diagnostics |

### 8.3 Certified Action Labels

| Current | Revision B label |
|---------|------------------|
| Provision screen | **Create screen** / **إنشاء شاشة** |
| Credential (button) | **Manage** (menu only) |
| Open /screen | **Open screen** |
| Regenerate credential | **Regenerate Credential** (keep — describes actual behavior) |
| Delete screen | **Delete Screen** |
| Remove screen | ❌ Do not use — use Delete Screen |
| Reset access | ❌ Do not use — use Regenerate Credential |

### 8.4 Regenerate Credential — Impact Panel

> **Regenerate Credential** creates new access for this screen and **invalidates access on any device that already opened it**.  
> Each device must open the screen again using the new QR code or setup link.

Runtime auto-redirect from stale sessions: **RUNTIME-BOOTSTRAP-AUTH-REVOCATION-1** (future — documented, not implemented here).

---

## 9. Delete Screen — Fleet Lifecycle Contract

Delete Screen is a **fleet management operation**, not a runtime operation.

### 9.1 Certified Delete Flow

```
Operator: Delete Screen
        ↓
Confirm (two-step, impact panel)
        ↓
Server: deleteScreen(deviceId, restaurantId)
        ↓
┌───────────────────────────────────────────┐
│  1. Screen removed from fleet             │
│  2. All active credentials revoked        │
│  3. Device record deleted (audit tokens   │
│     retained per SCREEN-CREDENTIAL-       │
│     LIFECYCLE-1)                          │
└───────────────────────────────────────────┘
        ↓
Any device browser that had this screen:
        ↓
Authentication fails (invalid / revoked)
        ↓
Device must go to screen re-registration (/screen/pair)
        ↓
Operator creates new screen OR re-provisions different asset
```

### 9.2 Operator Impact Copy (Certified)

> **Delete Screen** permanently removes this screen from your fleet.  
> All credentials for this screen will be cancelled.  
> Any device using this screen will stop working and must **set up again** with a new screen.

Post-delete toast:

> Screen deleted. Devices that used this screen must set up again.

### 9.3 Relationship to Incidents

SCREEN-AUTHENTICATION-FORENSICS-1 confirmed: Delete without browser re-pair leaves stale localStorage credentials → 401. Fleet UX must **warn before delete**; runtime auto-recovery is a separate program.

---

## 10. Category Experience — KITCHEN-ITEM-FILTERING-1 Contract

### 10.1 Certified Filtering Semantics

This is **explicit architecture** — not optional copy.

Screen Management must communicate:

| Configuration | What the kitchen screen shows |
|---------------|------------------------------|
| **No categories selected** | **All order items** — complete order content |
| **Categories selected** | **Only items belonging to those categories** — not whole orders filtered in/out |

**Important distinction (Revision B):**

- Filtering applies at **item level**, not order level
- An order may appear with **subset of its line items** when categories are selected
- Empty category selection ≠ "no orders" — it means **no filter applied**

This aligns with KITCHEN-ITEM-FILTERING-1. Filtering engine implementation is that program; Screen Management certifies **operator-facing truth**.

### 10.2 Settings UX

Section title: **"Which items appear on this screen?"**

| Control | Behavior |
|---------|----------|
| **All items** (default) | `visibleCategoryIds = []` |
| **Selected categories only** | Checkbox list → `visibleCategoryIds` |

Helper copy (certified):

> Leave empty to show **all items from every order**.  
> Select categories to show **only items from those categories**.

### 10.3 Fleet Card Category Summary

| Config | Card label |
|--------|------------|
| Empty | **All items** |
| 1 category | **Grills only** (example — use category name) |
| N categories | **4 categories** |

Categories **always visible on card** for kitchen/expo roles. Other roles: "Not applicable" or hidden.

---

## 11. Screen Details Architecture

Screen Details exists for **configuration depth and diagnostics** — not for daily fleet monitoring.

### 11.1 Entry

Manage menu → **Diagnostics** OR Settings deep-link — not required for normal operation.

### 11.2 Tab Structure

| Tab | Domain | Contents |
|-----|--------|----------|
| **Display** | Fleet configuration | Language, direction, density, categories |
| **Access** | Fleet credential | Open/copy links, QR, Regenerate Credential, Delete Screen |
| **Diagnostics** | Diagnostics only | Raw state, IDs, versions, readiness — **support use** |

**No Runtime tab.** Runtime is not a Screen Management concern.

### 11.3 Diagnostics Tab — Gated Complexity

Label: *"For support — use only when troubleshooting."*

Contents: canonical operational state, business readiness, connectivity, screen ID, versions, token presence.

**Rule (Hide Platform Complexity):** Diagnostics tab is the **only** place engineering enums appear in Screen Management.

---

## 12. Recovery Experience (UX Architecture Only — Not Implementation)

Recovery flows guide operators; runtime fixes are separate programs.

| Condition | Fleet card shows | Operator recovery | Runtime program |
|-----------|-----------------|---------------------|-----------------|
| Unauthorized (stale creds) | Needs attention or Offline | Regenerate Credential → re-open on device | RUNTIME-BOOTSTRAP-AUTH-REVOCATION-1 |
| Revoked / rotated token | Needs attention | Regenerate Credential or setup link | Same |
| **Deleted screen** | Gone from fleet | Create screen (new asset) | Device → re-pair |
| Disabled screen | Needs attention | Re-enable (future) or Delete Screen | — |
| Offline | Offline | Check device power/network | — |
| Legacy credential (no QR) | Needs attention | Regenerate Credential | — |

### Recovery playbook: "Screen won't load"

1. Find screen on fleet card — check **Online** and **Last seen**
2. **Regenerate Credential** if recently changed, or copy setup link
3. On device: open setup link, complete pairing
4. If still failing: Diagnostics → share Screen ID with support

---

## 13. Navigation Architecture

| Surface | Revision B |
|---------|------------|
| Sidebar | Screens (unchanged route) |
| Page header | **+ Create screen** first |
| Empty fleet | **+ Create screen** CTA |
| Provisioning workspace | Renamed "Create screen" flow; backend unchanged |

Screen Management does **not** link to Runtime diagnostics. **Open screen** opens `/screen` on device — that is the runtime entry, not a management diagnostic.

---

## 14. UX Consistency

Align with Orders Workspace, Kitchen Workspace, Printing Workspace:

- Same `OperationalWorkspaceShell`
- Same KPI + filter + content pattern
- Same bilingual EN/AR
- Same error/empty state components (`RestaurantSectionError`, future empty fleet illustration)

---

## 15. Implementation Roadmap

| Phase | Scope | Program ID |
|-------|-------|------------|
| 0 | Certify Revision B | This document |
| 1 | Product Principles enforcement: copy, filters abolished, Create first | UX-1A |
| 2 | Card permanence: Online, last seen, role, categories always visible | UX-1B |
| 3 | Manage menu, Regenerate/Delete impact panels | UX-1C |
| 4 | Screen Details (Display / Access / Diagnostics) | UX-1D |
| 5 | Create flow copy + empty states | UX-1E |

**Out of scope:** Runtime fixes, auth fixes, KITCHEN-ITEM-FILTERING-1 engine, schema, migrations.

---

## 16. Backward Compatibility

| Contract | Verdict |
|----------|---------|
| Fleet / management APIs | ✅ Unchanged |
| Runtime / pairing / auth | ✅ Unchanged |
| Credential governance | ✅ Unchanged |
| `visibleCategoryIds` schema | ✅ Unchanged |
| Operator filter vocabulary | ⚠️ Presentation only — engineering filters removed from UI |

---

## 17. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Engineering filters reintroduced via API params | Product Principles + architecture review gate |
| Cards stripped of essential fields in future refactor | Chapter 7 permanence rules |
| Delete/regenerate without device warning | Certified impact panels (Ch. 8–9) |
| Category semantics drift from KITCHEN-ITEM-FILTERING-1 | Chapter 10 certified contract |
| Bootstrap hang without runtime fix | Recovery playbook + separate runtime program |

---

## 18. Implementation Plan (Post-Certification)

Implementation begins when Revision B is **signed off**.

Anticipated files: `ScreenManagementWorkspacePanel.tsx`, `FleetScreenCard.tsx`, `ScreenCredentialLifecycleSheet.tsx`, `ScreenSettingsSheet.tsx`, new `operatorFleetFilters.ts`, new `ScreenDetailsSheet.tsx`, `ScreenDiagnosticsPanel.tsx`.

**Not touched:** Runtime platform, routers, auth, schema.

---

## Appendix A — Product Principles Checklist (Review Gate)

Use this checklist before merging any Screen Management UX change:

- [ ] Does this serve **fleet management**, not runtime monitoring?
- [ ] Would a restaurant manager understand every label?
- [ ] Is platform complexity hidden unless Diagnostics?
- [ ] Are Online, role, last seen, categories still on the card?
- [ ] Are engineering filters (Operational, Degraded, …) absent?
- [ ] Is **Create screen** prominently reachable?
- [ ] Does Regenerate/Delete warn about device impact?
- [ ] Are category labels consistent with item-level filtering (Ch. 10)?

---

## Appendix B — Operator ↔ Internal Glossary

| Operator (UI) | Internal (unchanged) |
|---------------|---------------------|
| Create screen | `navigateToProvisioning` / create device |
| Open screen | `/screen` entry URL |
| Setup link | `/screen/pair` |
| Last seen | `lastHeartbeat` |
| Regenerate Credential | `regenerateCredential` |
| Delete Screen | `deleteScreen` |
| All items | `visibleCategoryIds = []` |
| Needs attention | Derived from canonical state |
| Online / Offline | `healthSummary.presence` |

---

## Appendix C — Incident Accommodation

| Incident | Revision B accommodation |
|----------|-------------------------|
| SCREEN-AUTHENTICATION-FORENSICS-1 | Delete/Regenerate impact panels; recovery playbook |
| OPERATIONAL-SCREEN-BOOTSTRAP-HANG-1 | Recovery copy; runtime fix deferred |

---

**Program:** SCREEN-MANAGEMENT-UX-ARCHITECTURE-1 **Revision B**  
**Status:** Pending certification  
**Next step:** Product + engineering sign-off on Revision B → begin UX-1A
